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

async function callAIService(endpointPath, payload, options = {}) {
  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (!aiServiceUrl) {
    throw new Error('Biến môi trường AI_SERVICE_URL là bắt buộc');
  }

  const endpoint = `${aiServiceUrl}${endpointPath}`;
  const startTime = Date.now();

  logger.info('Calling AI service', {
    endpoint,
    assetId: options.assetId,
    jobId: options.jobId,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.requestId ? { 'X-Request-Id': options.requestId } : {}),
        ...(options.assetId ? { 'X-Asset-Id': options.assetId } : {}),
        ...(options.jobId ? { 'X-Job-Id': options.jobId } : {}),
      },
      body: JSON.stringify(payload),
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
      
      const error = new Error(`Dịch vụ AI trả về mã ${response.status}`);
      error.statusCode = response.status;
      error.retryable = response.status >= 500;
      throw error;
    }

    const result = await response.json();
    
    logger.info('AI service response received', {
      duration,
      endpoint: endpointPath,
    });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (error.name === 'AbortError') {
      logger.error('AI service timeout', { duration, timeout: AI_SERVICE_TIMEOUT });
      const timeoutError = new Error('Dịch vụ AI đã quá thời gian chờ');
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
 * Call the AI service to analyze an image
 * @param {string} imageUrl - Public URL of the uploaded image
 * @param {string} category - Asset category for AI context
 * @returns {Promise<Object>} AI analysis result
 * @throws {Error} If AI service fails or times out
 */
async function callAnalyze(imageUrl, category, options = {}) {
  const result = await callAIService(
    '/analyze',
    {
      image_url: imageUrl,
      category,
    },
    options
  );

  return parseAIResponse(result);
}

async function callEnhanceImage({ imageUrl, options: enhancementOptions, assetId, jobId }) {
  const result = await callAIService(
    '/enhance-image',
    {
      image_url: imageUrl,
      options: enhancementOptions,
    },
    { assetId, jobId }
  );

  return parseEnhancementResponse(result);
}

/**
 * Parse AI service response into standard format
 * @param {Object} response - Raw AI service response
 * @returns {Object} Parsed result with brand, model, colorway, processedImageUrl
 */
function parseAIResponse(response) {
  const normalizeMetadataField = (field, defaultConfidence) => {
    if (field == null) {
      return null;
    }

    if (typeof field === 'string') {
      const value = field.trim();
      return value ? { value, confidence: defaultConfidence } : null;
    }

    if (typeof field === 'object') {
      const value = typeof field.value === 'string' ? field.value : '';
      const confidence = typeof field.confidence === 'number'
        ? field.confidence
        : defaultConfidence;

      return { value, confidence };
    }

    return null;
  };

  const parsed = {
    brand: normalizeMetadataField(response.brand, 0.8),
    model: normalizeMetadataField(response.model, 0.8),
    colorway: normalizeMetadataField(response.colorway, 0.7),
    processedImageUrl: response.processed_image_url ?? response.processedImageUrl ?? null
  };

  const processedBytes = response.processed_bytes ?? response.processedBytes;
  if (typeof processedBytes === 'number') {
    parsed.processedBytes = processedBytes;
  }

  return parsed;
}

function parseEnhancementResponse(response) {
  const parsed = {
    enhancedImageUrl:
      response.enhanced_image_url ?? response.enhancedImageUrl ?? null,
    width: response.width ?? null,
    height: response.height ?? null,
  };

  const enhancedBytes = response.enhanced_bytes ?? response.enhancedBytes;
  if (typeof enhancedBytes === 'number') {
    parsed.enhancedBytes = enhancedBytes;
  }

  return parsed;
}

module.exports = {
  callAnalyze,
  callAIService,
  callEnhanceImage,
  parseAIResponse,
  parseEnhancementResponse,
  AI_SERVICE_TIMEOUT
};
