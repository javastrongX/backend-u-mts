import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Send data and files to Aiogram bot webhook
 * @param {Object} options - Function options
 * @param {Array} options.files - Array of file objects with path, originalname, mimetype
 * @param {Object} options.formData - Form data to send as JSON
 * @param {string} options.webhookUrl - Optional webhook URL override
 * @returns {Promise<Object>} Response object with success status and data
 */
async function sendToAiogramBot({ files = [], formData = {}, webhookUrl = null }) {
  const targetUrl = webhookUrl || 'https://6852f826aac7.ngrok-free.app/webhook/new-announcement';
  
  try {
    // Validate inputs
    if (!targetUrl) {
      throw new Error('Webhook URL is required');
    }

    // Create FormData for webhook
    const webhookFormData = new FormData();
    
    // Add form data as JSON
    if (Object.keys(formData).length > 0) {
      webhookFormData.append('announcementData', JSON.stringify(formData));
    }

    // Add files if provided
    if (files.length > 0) {
      for (const [index, file] of files.entries()) {
        // Validate file exists
        if (!fs.existsSync(file.path)) {
          console.warn(`File not found: ${file.path}`);
          continue;
        }

        webhookFormData.append('files', fs.createReadStream(file.path), {
          filename: file.originalname || `file_${index}`,
          contentType: file.mimetype || 'application/octet-stream'
        });
      }
    }

    // console.log('Sending to bot webhook:', targetUrl);
    // console.log('FormData contents:', formData);

    // Send request to bot webhook
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: webhookFormData,
      headers: {
        ...webhookFormData.getHeaders(),
        // Add any additional headers if needed
      },
      timeout: 30000 // 30 second timeout
    });

    const responseText = await response.text();
    // console.log('Bot webhook response status:', response.status);
    // console.log('Bot webhook response:', responseText);

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('Failed to parse JSON response:', parseError.message);
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
    console.error('Bot webhook error:', error);
    return {
      success: false,
      error: error.message,
      status: error.code || 'UNKNOWN_ERROR'
    };
  } finally {
    // Always cleanup temporary files
    await cleanupTempFiles(files);
  }
}

/**
 * Clean up temporary files
 * @param {Array} files - Array of file objects
 */
async function cleanupTempFiles(files) {
  if (!files || files.length === 0) return;

  const cleanupPromises = files.map(async (file) => {
    try {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
        // console.log(`Cleaned up temp file: ${file.path}`);
      }
    } catch (err) {
      console.error(`Failed to delete temp file ${file.path}:`, err.message);
    }
  });

  await Promise.allSettled(cleanupPromises);
}

/**
 * Utility function for testing the webhook
 * @param {string} webhookUrl - URL to test
 * @returns {Promise<boolean>} Whether webhook is accessible
 */
async function testWebhookConnection(webhookUrl) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      timeout: 5000
    });
    return response.status < 500; // Accept any non-server error status
  } catch (error) {
    console.error('Webhook connection test failed:', error.message);
    return false;
  }
}

export default sendToAiogramBot;
export { cleanupTempFiles, testWebhookConnection };
