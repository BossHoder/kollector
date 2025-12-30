/**
 * Unit Tests: AI Service Client
 * Tests for AI service HTTP client
 * @module tests/unit/assets/ai-client.test
 */

// Mock fetch globally
global.fetch = jest.fn();

const { 
  callAnalyze, 
  parseAIResponse, 
  AI_SERVICE_TIMEOUT 
} = require('../../../src/modules/assets/ai.client');

describe('AI Service Client', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv, AI_SERVICE_URL: 'http://localhost:8000' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  describe('Configuration', () => {
    it('should have 90 second timeout', () => {
      expect(AI_SERVICE_TIMEOUT).toBe(90000);
    });
  });

  /**
   * T038: Unit test - AI client callAnalyze(imageUrl, category) with 90s timeout
   */
  describe('callAnalyze()', () => {
    it('should call AI service endpoint with correct payload', async () => {
      const imageUrl = 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/sneaker.jpg';
      const category = 'sneaker';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          brand: { value: 'Nike', confidence: 0.95 },
          model: { value: 'Air Jordan 1', confidence: 0.92 },
          colorway: { value: 'Chicago', confidence: 0.88 },
          processed_image_url: 'https://res.cloudinary.com/test/processed.jpg'
        })
      });

      await callAnalyze(imageUrl, category);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/analyze',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            category
          })
        })
      );
    });

    it('should throw error when AI_SERVICE_URL is not configured', async () => {
      const originalUrl = process.env.AI_SERVICE_URL;
      delete process.env.AI_SERVICE_URL;

      await expect(callAnalyze('http://test.jpg', 'sneaker'))
        .rejects.toThrow('AI_SERVICE_URL environment variable is required');

      process.env.AI_SERVICE_URL = originalUrl;
    });

    it('should handle 5xx errors as retryable', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable'
      });

      try {
        await callAnalyze('http://test.jpg', 'sneaker');
        fail('Should have thrown');
      } catch (error) {
        expect(error.statusCode).toBe(503);
        expect(error.retryable).toBe(true);
      }
    });

    it('should handle 4xx errors as non-retryable', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      try {
        await callAnalyze('http://test.jpg', 'sneaker');
        fail('Should have thrown');
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.retryable).toBe(false);
      }
    });

    it('should handle network errors as retryable', async () => {
      const networkError = new Error('fetch failed');
      networkError.code = 'ECONNREFUSED';
      global.fetch.mockRejectedValueOnce(networkError);

      try {
        await callAnalyze('http://test.jpg', 'sneaker');
        fail('Should have thrown');
      } catch (error) {
        expect(error.retryable).toBe(true);
      }
    });

    it('should handle timeout as retryable error', async () => {
      // Simulate AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch.mockRejectedValueOnce(abortError);

      try {
        await callAnalyze('http://test.jpg', 'sneaker');
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toBe('AI service timeout');
        expect(error.retryable).toBe(true);
      }
    });
  });

  /**
   * T039: Unit test - AI client parses response correctly
   */
  describe('parseAIResponse()', () => {
    it('should parse response with nested confidence objects', () => {
      const response = {
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Jordan 1', confidence: 0.92 },
        colorway: { value: 'Chicago', confidence: 0.88 },
        processed_image_url: 'https://cdn.example.com/processed.jpg'
      };

      const result = parseAIResponse(response);

      expect(result).toEqual({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Jordan 1', confidence: 0.92 },
        colorway: { value: 'Chicago', confidence: 0.88 },
        processedImageUrl: 'https://cdn.example.com/processed.jpg'
      });
    });

    it('should parse response with flat string values', () => {
      const response = {
        brand: 'Adidas',
        model: 'Ultraboost',
        colorway: 'Core Black',
        processedImageUrl: 'https://cdn.example.com/processed.jpg'
      };

      const result = parseAIResponse(response);

      expect(result.brand).toEqual({ value: 'Adidas', confidence: 0.8 });
      expect(result.model).toEqual({ value: 'Ultraboost', confidence: 0.8 });
      expect(result.colorway).toEqual({ value: 'Core Black', confidence: 0.7 });
    });

    it('should handle missing colorway', () => {
      const response = {
        brand: { value: 'Nike', confidence: 0.9 },
        model: { value: 'Dunk Low', confidence: 0.85 }
      };

      const result = parseAIResponse(response);

      expect(result.colorway).toBeNull();
    });

    it('should handle snake_case processed_image_url', () => {
      const response = {
        brand: { value: 'Test', confidence: 0.9 },
        model: { value: 'Test', confidence: 0.9 },
        processed_image_url: 'https://cdn.example.com/snake_case.jpg'
      };

      const result = parseAIResponse(response);

      expect(result.processedImageUrl).toBe('https://cdn.example.com/snake_case.jpg');
    });

    it('should handle camelCase processedImageUrl', () => {
      const response = {
        brand: { value: 'Test', confidence: 0.9 },
        model: { value: 'Test', confidence: 0.9 },
        processedImageUrl: 'https://cdn.example.com/camelCase.jpg'
      };

      const result = parseAIResponse(response);

      expect(result.processedImageUrl).toBe('https://cdn.example.com/camelCase.jpg');
    });

    it('should handle missing brand/model gracefully', () => {
      const response = {};

      const result = parseAIResponse(response);

      expect(result.brand).toBeNull();
      expect(result.model).toBeNull();
      expect(result.colorway).toBeNull();
      expect(result.processedImageUrl).toBeNull();
    });
  });

  describe('Full callAnalyze() flow', () => {
    it('should return parsed response on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          brand: { value: 'Nike', confidence: 0.95 },
          model: { value: 'Air Max 90', confidence: 0.90 },
          colorway: { value: 'Infrared', confidence: 0.85 },
          processed_image_url: 'https://cdn.example.com/processed.jpg'
        })
      });

      const result = await callAnalyze('http://test.jpg', 'sneaker');

      expect(result).toEqual({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Max 90', confidence: 0.90 },
        colorway: { value: 'Infrared', confidence: 0.85 },
        processedImageUrl: 'https://cdn.example.com/processed.jpg'
      });
    });
  });
});
