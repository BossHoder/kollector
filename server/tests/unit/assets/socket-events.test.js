/**
 * Unit Tests: Socket Event Emitters
 * Tests per contracts/asset-processed-event.schema.json
 * @module tests/unit/assets/socket-events.test
 */

// Mock functions at module scope
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockGetIO = jest.fn().mockReturnValue({ to: mockTo });

// Mock logger to prevent console output
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock Socket.io before importing module
jest.mock('../../../src/config/socket', () => ({
  getIO: () => mockGetIO(),
  initSocket: jest.fn(),
  closeSocket: jest.fn()
}));

const { 
  emitAssetProcessed, 
  buildSuccessPayload, 
  buildFailurePayload 
} = require('../../../src/modules/assets/assets.events');

describe('Socket Event Emitters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return a valid io instance
    mockGetIO.mockReturnValue({ to: mockTo });
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  describe('buildSuccessPayload()', () => {
    it('should build correct success payload structure', () => {
      const assetId = '507f1f77bcf86cd799439011';
      const aiMetadata = {
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Jordan 1', confidence: 0.92 },
        colorway: { value: 'Chicago', confidence: 0.88 }
      };
      const processedImageUrl = 'https://res.cloudinary.com/test/processed.jpg';

      const payload = buildSuccessPayload(assetId, aiMetadata, processedImageUrl);

      expect(payload).toEqual({
        assetId: '507f1f77bcf86cd799439011',
        status: 'active',
        aiMetadata,
        processedImageUrl
      });
    });
  });

  describe('buildFailurePayload()', () => {
    it('should build correct failure payload structure', () => {
      const assetId = '507f1f77bcf86cd799439012';
      const error = 'AI service unavailable';

      const payload = buildFailurePayload(assetId, error);

      expect(payload).toEqual({
        assetId: '507f1f77bcf86cd799439012',
        status: 'failed',
        error: 'AI service unavailable'
      });
    });
  });

  /**
   * T031: Unit test - emitAssetProcessed() success payload matches schema
   */
  describe('emitAssetProcessed() - Success Events', () => {
    it('should emit success payload matching asset-processed-event.schema.json SuccessEvent', () => {
      const userId = '507f1f77bcf86cd799439001';
      const payload = {
        assetId: '507f1f77bcf86cd799439011',
        status: 'active',
        aiMetadata: {
          brand: { value: 'Nike', confidence: 0.95 },
          model: { value: 'Air Jordan 1', confidence: 0.92 },
          colorway: { value: 'Chicago', confidence: 0.88 }
        },
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
      };

      emitAssetProcessed(userId, payload);

      // Verify room targeting
      expect(mockTo).toHaveBeenCalledWith(`user:${userId}`);
      
      // Verify emit was called with correct event name and payload structure
      expect(mockEmit).toHaveBeenCalledWith('asset_processed', expect.objectContaining({
        event: 'asset_processed',
        assetId: '507f1f77bcf86cd799439011',
        status: 'active',
        aiMetadata: expect.objectContaining({
          brand: { value: 'Nike', confidence: 0.95 },
          model: { value: 'Air Jordan 1', confidence: 0.92 }
        }),
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg',
        timestamp: expect.any(String)
      }));
    });

    it('should include ISO timestamp in success event', () => {
      const userId = '507f1f77bcf86cd799439002';
      const payload = {
        assetId: '507f1f77bcf86cd799439012',
        status: 'active',
        aiMetadata: {
          brand: { value: 'Adidas', confidence: 0.9 },
          model: { value: 'Ultraboost', confidence: 0.85 }
        }
      };

      emitAssetProcessed(userId, payload);

      const emittedPayload = mockEmit.mock.calls[0][1];
      
      // Verify timestamp is valid ISO format
      expect(emittedPayload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(emittedPayload.timestamp)).not.toThrow();
    });

    it('should handle success event without optional colorway', () => {
      const userId = '507f1f77bcf86cd799439003';
      const payload = {
        assetId: '507f1f77bcf86cd799439013',
        status: 'active',
        aiMetadata: {
          brand: { value: 'Puma', confidence: 0.88 },
          model: { value: 'Suede', confidence: 0.82 }
          // No colorway
        }
      };

      emitAssetProcessed(userId, payload);

      const emittedPayload = mockEmit.mock.calls[0][1];
      expect(emittedPayload.aiMetadata).not.toHaveProperty('colorway');
    });
  });

  /**
   * T032: Unit test - emitAssetProcessed() failure payload matches schema
   */
  describe('emitAssetProcessed() - Failure Events', () => {
    it('should emit failure payload matching asset-processed-event.schema.json FailureEvent', () => {
      const userId = '507f1f77bcf86cd799439004';
      const payload = {
        assetId: '507f1f77bcf86cd799439014',
        status: 'failed',
        error: 'AI service timeout after 90 seconds'
      };

      emitAssetProcessed(userId, payload);

      // Verify room targeting
      expect(mockTo).toHaveBeenCalledWith(`user:${userId}`);
      
      // Verify emit was called with correct failure payload structure
      expect(mockEmit).toHaveBeenCalledWith('asset_processed', expect.objectContaining({
        event: 'asset_processed',
        assetId: '507f1f77bcf86cd799439014',
        status: 'failed',
        error: 'AI service timeout after 90 seconds',
        timestamp: expect.any(String)
      }));
    });

    it('should use default error message if not provided', () => {
      const userId = '507f1f77bcf86cd799439005';
      const payload = {
        assetId: '507f1f77bcf86cd799439015',
        status: 'failed'
        // No error message
      };

      emitAssetProcessed(userId, payload);

      const emittedPayload = mockEmit.mock.calls[0][1];
      expect(emittedPayload.error).toBe('Processing failed');
    });

    it('should include ISO timestamp in failure event', () => {
      const userId = '507f1f77bcf86cd799439006';
      const payload = {
        assetId: '507f1f77bcf86cd799439016',
        status: 'failed',
        error: 'Connection refused'
      };

      emitAssetProcessed(userId, payload);

      const emittedPayload = mockEmit.mock.calls[0][1];
      expect(emittedPayload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing Socket.io instance gracefully', () => {
      mockGetIO.mockReturnValue(null);

      const payload = {
        assetId: '507f1f77bcf86cd799439017',
        status: 'active',
        aiMetadata: { brand: { value: 'Test', confidence: 1 }, model: { value: 'Test', confidence: 1 } }
      };

      // Should not throw
      expect(() => emitAssetProcessed('user123', payload)).not.toThrow();
      
      // Should not call emit
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should convert assetId to string', () => {
      const userId = '507f1f77bcf86cd799439007';
      const payload = {
        assetId: { toString: () => '507f1f77bcf86cd799439018' },
        status: 'active',
        aiMetadata: { 
          brand: { value: 'Test', confidence: 1 }, 
          model: { value: 'Test', confidence: 1 } 
        }
      };

      emitAssetProcessed(userId, payload);

      const emittedPayload = mockEmit.mock.calls[0][1];
      expect(typeof emittedPayload.assetId).toBe('string');
      expect(emittedPayload.assetId).toBe('507f1f77bcf86cd799439018');
    });
  });
});
