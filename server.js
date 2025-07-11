const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, "mockdata.json");
// Equipment uchun alohida data fayli (agar kerak bo'lsa)
const EQUIPMENT_DATA_PATH = path.join(__dirname, "equipments.json");
// News uchun data fayli
const NEWS_DATA_PATH = path.join(__dirname, "news.json");

// JSON faylni o'qish
const readProducts = () => {
  const data = fs.readFileSync(DATA_PATH, "utf-8");
  const jsonData = JSON.parse(data);
  // Agar data ob'ektning ichida bo'lsa
  return jsonData.data || jsonData;
};

const readNews = () => {
  try {
    if (fs.existsSync(NEWS_DATA_PATH)) {
      const data = fs.readFileSync(NEWS_DATA_PATH, "utf-8");
      const jsonData = JSON.parse(data);
      return jsonData.data || jsonData;
    }
    return [];
  } catch (error) {
    console.error("News ma'lumotlarini o'qishda xatolik:", error);
    return [];
  }
};

// News faylga yozish - TUZATILDI
const writeNews = (news) => {
  try {
    let dataToWrite;
    
    if (fs.existsSync(NEWS_DATA_PATH)) {
      const currentData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, "utf-8"));
      
      // Agar fayl strukturasi {data: [...]} ko'rinishida bo'lsa
      if (currentData.data && Array.isArray(currentData.data)) {
        dataToWrite = { ...currentData, data: news };
      } else {
        // Agar fayl to'g'ridan-to'g'ri array bo'lsa
        dataToWrite = news;
      }
    } else {
      // Yangi fayl yaratilayotgan bo'lsa
      dataToWrite = news;
    }
    
    fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(dataToWrite, null, 2));
  } catch (error) {
    console.error("News ma'lumotlarini yozishda xatolik:", error);
  }
};

// Equipment ma'lumotlarini o'qish
const readEquipment = () => {
  try {
    // Agar alohida equipment.json fayli bo'lsa
    if (fs.existsSync(EQUIPMENT_DATA_PATH)) {
      const data = fs.readFileSync(EQUIPMENT_DATA_PATH, "utf-8");
      const jsonData = JSON.parse(data);
      // JSON strukturasini tekshirish
      return jsonData.data || jsonData;
    }
    
    // Aks holda products dan equipment'larni filterlash
    const products = readProducts();
    
    // Equipment'larni ajratib olish
    return products.filter(item => {
      // Kategoriya mavjudligini tekshirish
      if (item.category) {
        return (
          item.category.title?.toLowerCase().includes('спецтехник') ||
          item.category.title?.toLowerCase().includes('аренда') ||
          item.category.title?.toLowerCase().includes('equipment') ||
          item.category.id === 2 // Sizning JSON'da category.id = 2 bo'lgan "Аренда спецтехники"
        );
      }
      
      // Agar category yo'q bo'lsa, title bo'yicha tekshirish
      return (
        item.title?.toLowerCase().includes('экскават') ||
        item.title?.toLowerCase().includes('погрузчик') ||
        item.title?.toLowerCase().includes('бульдозер') ||
        item.title?.toLowerCase().includes('кран')
      );
    });
  } catch (error) {
    console.error("Equipment ma'lumotlarini o'qishda xatolik:", error);
    return [];
  }
};

// JSON faylga yozish
const writeProducts = (products) => {
  const currentData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  // Agar data ob'ektning ichida bo'lsa
  if (currentData.data) {
    currentData.data = products;
    fs.writeFileSync(DATA_PATH, JSON.stringify(currentData, null, 2));
  } else {
    fs.writeFileSync(DATA_PATH, JSON.stringify(products, null, 2));
  }
};

// Equipment faylga yozish
const writeEquipment = (equipment) => {
  if (fs.existsSync(EQUIPMENT_DATA_PATH)) {
    const currentData = JSON.parse(fs.readFileSync(EQUIPMENT_DATA_PATH, "utf-8"));
    if (currentData.data) {
      currentData.data = equipment;
      fs.writeFileSync(EQUIPMENT_DATA_PATH, JSON.stringify(currentData, null, 2));
    } else {
      fs.writeFileSync(EQUIPMENT_DATA_PATH, JSON.stringify(equipment, null, 2));
    }
  } else {
    // Agar alohida fayl bo'lmasa, products faylini yangilash
    const products = readProducts();
    equipment.forEach(eq => {
      const index = products.findIndex(p => p.id === eq.id);
      if (index !== -1) {
        products[index] = eq;
      }
    });
    writeProducts(products);
  }
};

// 📰 NEWS ENDPOINTS

// MUHIM: Paginated endpointni birinchi o'ringa qo'yish
app.get("/api/news/paginated", (req, res) => {
  let news = readNews();
  
  // Query params
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const tagId = parseInt(req.query.tag_id) || 0;
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'date'; // date, views, title
  const sortOrder = req.query.sortOrder || 'desc'; // asc, desc
  
  let filteredNews = [...news]; // Array nusxasini yaratish
  
  // Tag bo'yicha filterlash
  if (tagId > 0) {
    filteredNews = filteredNews.filter(item => {
      return item.news_tags && item.news_tags.some(tag => tag.id === tagId);
    });
  }
  
  // Qidiruv bo'yicha filterlash
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    filteredNews = filteredNews.filter(item => {
      return (
        item.title?.toLowerCase().includes(searchLower) ||
        item.short_description?.toLowerCase().includes(searchLower) ||
        item.news_tags?.some(tag => tag.title?.toLowerCase().includes(searchLower))
      );
    });
  }
  
  // Saralash
  filteredNews.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'views':
        aValue = a.views || 0;
        bValue = b.views || 0;
        break;
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'date':
      default:
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Bo'laklab olish
  const paginatedNews = filteredNews.slice(offset, offset + limit);
  
  res.json({
    total: filteredNews.length,
    limit,
    offset,
    tagId,
    search,
    sortBy,
    sortOrder,
    news: paginatedNews,
  });
});

// Barcha yangiliklar
app.get("/api/news", (req, res) => {
  const news = readNews();
  // Eng yangi yangiliklar birinchi bo'lishi uchun saralash
  const sortedNews = news.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sortedNews);
});

// Bitta yangilikni ID bo'yicha olish
app.get("/api/news/:id", (req, res) => {
  const newsId = parseInt(req.params.id);
  const news = readNews();
  const newsItem = news.find((item) => item.id === newsId)
  if (newsItem) {
    res.json(newsItem);
  } else {
    res.status(404).json({ success: false, message: "News not found" });
  }
});

// Yangilik ko'rishlar sonini oshirish
app.post("/api/news/:id/increment-view", (req, res) => {
  const newsId = parseInt(req.params.id);
  const news = readNews();
  const newsIndex = news.findIndex((item) => item.id === newsId);
  
  if (newsIndex !== -1) {
    news[newsIndex].views = (news[newsIndex].views || 0) + 1;
    writeNews(news);
    res.json({ success: true, views: news[newsIndex].views });
  } else {
    res.status(404).json({ success: false, message: "News not found" });
  }
});

// EXISTING ENDPOINTS

// 🔼 Ko'rishlar sonini oshirish
app.post("/api/products/:id/increment-view", (req, res) => {
  const productId = parseInt(req.params.id);
  const products = readProducts();
  const product = products.find((p) => p.id === productId);
  
  if (product) {
    if (!product.statistics) product.statistics = { viewed: 0 };
    product.statistics.viewed += 1;
    writeProducts(products);
    res.json({ success: true, views: product.statistics.viewed });
  } else {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

// ❤️ Like toggle qilish (mock userID bilan)
app.post("/api/products/:id/toggle-like", (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ success: false, message: "User ID required" });
  
  const productId = parseInt(req.params.id);
  const products = readProducts();
  const product = products.find((p) => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  
  if (!product.likedBy) product.likedBy = [];
  const isLiked = product.likedBy.includes(userId);
  
  if (isLiked) {
    product.likedBy = product.likedBy.filter((id) => id !== userId);
  } else {
    product.likedBy.push(userId);
  }
  
  writeProducts(products);
  res.json({ success: true, liked: !isLiked });
});

// ➕ Yangi paginated mahsulotlar endpointi
app.get("/api/products/paginated", (req, res) => {
  let products = readProducts();
  
  // Query params bilan limit, offset va category oling
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const category = parseInt(req.query.category_id) || 0;
  // Kategoriya bo'yicha filterlash
  let filteredProducts = products;
  if (category > 0) {
    filteredProducts = products.filter(product => {
      // product.category?.id bilan tekshirish
      return product.category && product.category.id === category;
    });
  }
  
  // Bo'laklab olish (filterlangan ma'lumotlardan)
  const paginatedProducts = filteredProducts.slice(offset, offset + limit);
  
  res.json({
    total: filteredProducts.length,
    limit,
    offset,
    category,
    products: paginatedProducts,
  });
});

// 🔄 Barcha equipment'larni olish
app.get("/api/equipment", (req, res) => {
  const equipment = readEquipment();
  res.json(equipment);
});

// 🔼 Equipment ko'rishlar sonini oshirish
app.post("/api/equipment/:id/increment-view", (req, res) => {
  const equipmentId = parseInt(req.params.id);
  const equipment = readEquipment();
  const item = equipment.find((eq) => eq.id === equipmentId);
  
  if (item) {
    if (!item.statistics) item.statistics = { viewed: 0 };
    item.statistics.viewed += 1;
    writeEquipment(equipment);
    res.json({ success: true, views: item.statistics.viewed });
  } else {
    res.status(404).json({ success: false, message: "Equipment not found" });
  }
});

// ➕ Equipment uchun paginated endpoint
app.get("/api/equipment/paginated", (req, res) => {
  let equipment = readEquipment();
  
  // Query params
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const category = parseInt(req.query.category) || 0;
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'date'; // date, price, title
  const sortOrder = req.query.sortOrder || 'desc'; // asc, desc
  
  let filteredEquipment = equipment;
  
  // Kategoriya bo'yicha filterlash
  if (category > 0) {
    filteredEquipment = filteredEquipment.filter(item => {
      return item.category && item.category.id === category;
    });
  }
  
  // Qidiruv bo'yicha filterlash
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    filteredEquipment = filteredEquipment.filter(item => {
      return (
        item.title?.toLowerCase().includes(searchLower) ||
        item.sub_title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category?.title?.toLowerCase().includes(searchLower)
      );
    });
  }
  
  // Saralash
  filteredEquipment.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'price':
        aValue = a.prices?.[0]?.price || 0;
        bValue = b.prices?.[0]?.price || 0;
        break;
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'views':
        aValue = a.statistics?.viewed || 0;
        bValue = b.statistics?.viewed || 0;
        break;
      case 'date':
      default:
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Bo'laklab olish
  const paginatedEquipment = filteredEquipment.slice(offset, offset + limit);
  
  res.json({
    total: filteredEquipment.length,
    limit,
    offset,
    category,
    search,
    sortBy,
    sortOrder,
    equipment: paginatedEquipment,
  });
});


app.get("/api/hot-offers", (req, res) => {
  const products = readProducts();
  
  // Hot offer deb belgilangan mahsulotlarni filterlash
 
  // const hotOffers = products.filter(product => product.rank_hot_offer === true);

  const hotOffers = products;
  
  // Agar hot offer yo'q bo'lsa, premium mahsulotlarni qaytarish
  if (hotOffers.length === 0) {
    const premiumProducts = products.filter(product => product.rank_premium === true);
    res.json(premiumProducts.slice(0, 24)); // Maksimal 24 ta
  } else {
    res.json(hotOffers.slice(0, 24)); // Maksimal 24 ta
  }
});

// Hot offers paginated endpoint
app.get("/api/hot-offers/paginated", (req, res) => {
  const products = readProducts();
  
  const limit = parseInt(req.query.limit) || 14;
  const offset = parseInt(req.query.offset) || 0;
  
  // Hot offer mahsulotlarini filterlash
  let hotOffers = products.filter(product => product.rank_hot_offer === true);
  
  // Agar hot offer yo'q bo'lsa, premium mahsulotlarni olish
  if (hotOffers.length === 0) {
    hotOffers = products.filter(product => product.rank_premium === true);
  }
  
  // Eng yangi mahsulotlarni birinchi qo'yish
  hotOffers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const paginatedOffers = hotOffers.slice(offset, offset + limit);
  
  res.json({
    total: hotOffers.length,
    limit,
    offset,
    products: paginatedOffers,
  });
});

// Slug orqali mahsulotni olish (ID ajratib olish bilan)
app.get("/api/hot-offers/product/:slug", (req, res) => {
  try {
    const slug = req.params.slug;
    
    // Slug mavjudligini tekshirish
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Slug parametri talab qilinadi"
      });
    }

    // Slug formatini tekshirish (kamida bitta raqam va tire bo'lishi kerak)
    const slugPattern = /^\d+-/;
    if (!slugPattern.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Noto'g'ri slug formati. Format: 'id-product-name' bo'lishi kerak"
      });
    }

    const products = readProducts();
    
    // Slug dan ID ni ajratib olish (masalan: "10812-komatsu-fg10-15" dan 10812)
    const slugParts = slug.split('-');
    const productId = parseInt(slugParts[0]);
    
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Slug da noto'g'ri ID formati"
      });
    }

    // ID bo'yicha mahsulotni topish
    const product = products.find(p => p.id === productId);
    
    if (product) {
      // Mahsulot topilganda muvaffaqiyatli javob
      res.json({
        success: true,
        data: product
      });
    } else {
      // Mahsulot topilmaganda
      res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
        requestedId: productId
      });
    }
    
  } catch (error) {
    console.error("Mahsulotni olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatoligi yuz berdi",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//  Hot offer mahsulotni ko'rishlar sonini oshirish
app.post("/api/hot-offers/:slug/increment-view", (req, res) => {
  const slug = req.params.slug;

  const slugPattern = /^\d+-/;
  if (!slugPattern.test(slug)) {
    return res.status(400).json({
      success: false,
      message: "Noto'g'ri slug formati. Format: 'id-product-name' bo'lishi kerak"
    });
  }

  const products = readProducts();

  const slugParts = slug.split('-');
  const productId = parseInt(slugParts[0]);


  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Slug da noto'g'ri ID formati"
    });
  }
  
  // ID bo'yicha mahsulotni topish
  const product = products.find(p => p.id === productId);
  
  if (product) {
    // Mahsulot topilganda muvaffaqiyatli javob
    res.json({
      success: true,
      data: product
    });
  } else {
    // Mahsulot topilmaganda
    res.status(404).json({
      success: false,
      message: "Mahsulot topilmadi",
      requestedId: productId
    });
  }
});



//  Hot offer mahsulotni ko'rishlar sonini oshirish
app.post("/api/ads/:slug/increment-view", (req, res) => {
  const slug = req.params.slug;

  const slugPattern = /^\d+-/;
  if (!slugPattern.test(slug)) {
    return res.status(400).json({
      success: false,
      message: "Noto'g'ri slug formati. Format: 'id-product-name' bo'lishi kerak"
    });
  }

  const products = readProducts();

  const slugParts = slug.split('-');
  const productId = parseInt(slugParts[0]);


  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Slug da noto'g'ri ID formati"
    });
  }
  
  // ID bo'yicha mahsulotni topish
  const product = products.find(p => p.id === productId);
  
  if (product) {
    // Mahsulot topilganda muvaffaqiyatli javob
    res.json({
      success: true,
      data: product
    });
  } else {
    // Mahsulot topilmaganda
    res.status(404).json({
      success: false,
      message: "Mahsulot topilmadi",
      requestedId: productId
    });
  }
});

// MobileHotOffer Slug orqali mahsulotni olish (ID ajratib olish bilan)
app.get("/api/ads/:slug", (req, res) => {
  try {
    const slug = req.params.slug;
    
    // Slug mavjudligini tekshirish
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Slug parametri talab qilinadi"
      });
    }

    // Slug formatini tekshirish (kamida bitta raqam va tire bo'lishi kerak)
    const slugPattern = /^\d+-/;
    if (!slugPattern.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Noto'g'ri slug formati. Format: 'id-product-name' bo'lishi kerak"
      });
    }

    const products = readProducts();
    
    // Slug dan ID ni ajratib olish (masalan: "10812-komatsu-fg10-15" dan 10812)
    const slugParts = slug.split('-');
    const productId = parseInt(slugParts[0]);
    
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Slug da noto'g'ri ID formati"
      });
    }

    // ID bo'yicha mahsulotni topish
    const product = products.find(p => p.id === productId);
    
    if (product) {
      // Mahsulot topilganda muvaffaqiyatli javob
      res.json({
        success: true,
        data: product
      });
    } else {
      // Mahsulot topilmaganda
      res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
        requestedId: productId
      });
    }
    
  } catch (error) {
    console.error("Mahsulotni olishda xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatoligi yuz berdi",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



app.listen(5000, () => {
  console.log("Server ishga tushdi: http://localhost:5000");
});