import fetch from 'node-fetch';

/**
 * Faqat matn ma'lumotlarini Aiogram bot webhook ga yuborish
 * @param {Object} options 
 * @param {Object} options.textData 
 * @param {string} options.webhookUrl
 * @returns {Promise<Object>}
 */
async function sendTextToAiogramBot({ textData = {}, webhookUrl = null }) {
  const targetUrl = webhookUrl || process.env.BOT_WEBHOOK_URL || 'http://localhost:8000/webhook/new-message';
  
  try {
    // Kirish ma'lumotlarini tekshirish
    if (!targetUrl) {
      throw new Error('Webhook URL majburiy');
    }

    if (!textData || Object.keys(textData).length === 0) {
      throw new Error('Yuborilishi kerak bo\'lgan ma\'lumot bo\'sh');
    }

    // console.log('Bot webhook ga yuborilmoqda:', targetUrl);
    // console.log('Yuborilayotgan ma\'lumot:', textData);

    // Bot webhook ga so'rov yuborish
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messageData: textData,
        timestamp: new Date().toISOString(),
        type: 'text_message'
      }),
      timeout: 30000 // 30 soniya timeout
    });

    const responseText = await response.text();
    // console.log('Bot webhook javob status:', response.status);
    // console.log('Bot webhook javobi:', responseText);

    // Javobni parse qilish
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('JSON javobni parse qilishda xato:', parseError.message);
      responseData = { 
        raw_response: responseText,
        parse_error: parseError.message 
      };
    }

    const result = {
      success: response.ok,
      data: responseData,
      status: response.status,
      statusText: response.statusText
    };

    return result;

  } catch (error) {
    console.error('Bot webhook xatosi:', error);
    return {
      success: false,
      error: error.message,
      status: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Webhook ulanishini test qilish
 * @param {string} webhookUrl
 * @returns {Promise<boolean>}
 */
async function testWebhookConnection(webhookUrl) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      timeout: 5000
    });
    return response.status < 500; // Server xatosidan boshqa har qanday status qabul qiladi
  } catch (error) {
    console.error('Webhook ulanish testi muvaffaqiyatsiz:', error.message);
    return false;
  }
}

/**
 * Oddiy ping xabari yuborish (test uchun)
 * @param {string} webhookUrl
 * @returns {Promise<Object>}
 */
async function sendPingMessage(webhookUrl = null) {
  return await sendTextToAiogramBot({
    textData: {
      message: 'Ping test',
      sender: 'webhook-client',
      test: true
    },
    webhookUrl
  });
}

export default sendTextToAiogramBot;
export { testWebhookConnection, sendPingMessage };