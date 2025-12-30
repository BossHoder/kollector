/**
 * AI Service HTTP Client
 * Handles communication with the Python AI worker service
 * @module modules/assets/ai.client
 */

const logger = require('../../config/logger');

/**
 * AI Service timeout in milliseconds (90 seconds)
 */
const AI_SERVICE_TIMEOUT = 90000;

/**
 * Call the AI service to analyze an image
 * @param {string} imageUrl - Cloudinary URL of the image
 * @param {string} category - Asset category for AI context
 * @returns {Promise<Object>} AI analysis result
 * @throws {Error} If AI service fails or times out
 */
async function callAnalyze(imageUrl, category) {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  
  if (!aiServiceUrl) {
    throw new Error('AI_SERVICE_URL environment variable is required');
  }

  const endpoint = `${aiServiceUrl}/analyze`;
  const startTime = Date.now();

  logger.info('Calling AI service', { endpoint, category });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        category
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('AI service error response', {
        status: response.status,
        body: errorBody,
        duration
      });
      
      const error = new Error(`AI service returned ${response.status}`);
      error.statusCode = response.status;
      error.retryable = response.status >= 500;
      throw error;
    }

    const result = await response.json();
    
    logger.info('AI service response received', {
      duration,
      hasBrand: !!result.brand,
      hasModel: !!result.model
    });

    return parseAIResponse(result);
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (error.name === 'AbortError') {
      logger.error('AI service timeout', { duration, timeout: AI_SERVICE_TIMEOUT });
      const timeoutError = new Error('AI service timeout');
      timeoutError.retryable = true;
      throw timeoutError;
    }

    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      error.retryable = true;
    }

    logger.error('AI service call failed', {
      error: error.message,
      duration,
      retryable: error.retryable
    });

    throw error;
  }
}

/**
 * Parse AI service response into standard format
 * @param {Object} response - Raw AI service response
 * @returns {Object} Parsed result with brand, model, colorway, processedImageUrl
 */
function parseAIResponse(response) {
  return {
    brand: response.brand ? {
      value: response.brand.value || response.brand,
      confidence: response.brand.confidence || 0.8
    } : null,
    model: response.model ? {
      value: response.model.value || response.model,
      confidence: response.model.confidence || 0.8
    } : null,
    colorway: response.colorway ? {
      value: response.colorway.value || response.colorway,
      confidence: response.colorway.confidence || 0.7
    } : null,
    processedImageUrl: response.processed_image_url || response.processedImageUrl || null
  };
}

module.exports = {
  callAnalyze,
  parseAIResponse,
  AI_SERVICE_TIMEOUT
};
