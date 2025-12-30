/**
 * Integration Tests: AI Processing Pipeline
 * Tests for worker processing jobs end-to-end
 * @module tests/integration/ai-pipeline.test
 */

// Load environment variables before any other imports
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.test') });

const { connectDatabase, disconnectDatabase } = require('../../src/config/database');
const Asset = require('../../src/models/Asset');
const User = require('../../src/models/User');

// Mock external dependencies
jest.mock('../../src/modules/assets/ai.client');
// Partially mock assets.events - keep buildSuccessPayload and buildFailurePayload real
jest.mock('../../src/modules/assets/assets.events', () => {
  const actual = jest.requireActual('../../src/modules/assets/assets.events');
  return {
    ...actual,
    emitAssetProcessed: jest.fn()
  };
});
jest.mock('../../src/config/redis', () => ({
  getConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    quit: jest.fn()
  }),
  createConnection: jest.fn(),
  closeConnection: jest.fn()
}));

const { callAnalyze } = require('../../src/modules/assets/ai.client');
const { emitAssetProcessed } = require('../../src/modules/assets/assets.events');
const { processJob } = require('../../src/workers/ai.worker');

describe('AI Processing Pipeline', () => {
  let testUser;
  let testAsset;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Asset.deleteMany({});

    // Create test user with required fields per User model
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'Test User'
      }
    });

    // Create test asset in processing state
    testAsset = await Asset.create({
      userId: testUser._id,
      category: 'sneaker',
      status: 'processing',
      images: {
        original: {
          url: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/sneaker.jpg',
          uploadedAt: new Date()
        }
      }
    });
  });

  /**
   * Create a mock BullMQ job
   */
  function createMockJob(overrides = {}) {
    return {
      id: 'test-job-123',
      data: {
        assetId: testAsset._id.toString(),
        userId: testUser._id.toString(),
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/sneaker.jpg',
        category: 'sneaker',
        createdAt: new Date().toISOString(),
        ...overrides.data
      },
      attemptsMade: overrides.attemptsMade || 0,
      opts: {
        attempts: 3,
        ...overrides.opts
      },
      ...overrides
    };
  }

  /**
   * T040: Integration test - Worker updates asset status to 'active' and sets aiMetadata
   */
  describe('Successful Processing', () => {
    it('should update asset status to active on successful processing', async () => {
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Jordan 1', confidence: 0.92 },
        colorway: { value: 'Chicago', confidence: 0.88 },
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
      });

      const job = createMockJob();
      await processJob(job);

      const updatedAsset = await Asset.findById(testAsset._id);
      
      expect(updatedAsset.status).toBe('active');
    });

    it('should set aiMetadata fields on successful processing', async () => {
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Jordan 1', confidence: 0.92 },
        colorway: { value: 'Chicago', confidence: 0.88 },
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
      });

      const job = createMockJob();
      await processJob(job);

      const updatedAsset = await Asset.findById(testAsset._id);
      
      expect(updatedAsset.aiMetadata.brand).toEqual({ value: 'Nike', confidence: 0.95 });
      expect(updatedAsset.aiMetadata.model).toEqual({ value: 'Air Jordan 1', confidence: 0.92 });
      expect(updatedAsset.aiMetadata.colorway).toEqual({ value: 'Chicago', confidence: 0.88 });
      expect(updatedAsset.aiMetadata.processedAt).toBeInstanceOf(Date);
    });
  });

  /**
   * T041: Integration test - Worker sets images.processed.url from AI response
   */
  describe('Processed Image URL', () => {
    it('should set images.processed.url from AI response processedImageUrl', async () => {
      const processedUrl = 'https://res.cloudinary.com/test/processed-bg-removed.jpg';
      
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Adidas', confidence: 0.9 },
        model: { value: 'Ultraboost', confidence: 0.85 },
        processedImageUrl: processedUrl
      });

      const job = createMockJob();
      await processJob(job);

      const updatedAsset = await Asset.findById(testAsset._id);
      
      expect(updatedAsset.images.processed.url).toBe(processedUrl);
      expect(updatedAsset.images.processed.processedAt).toBeInstanceOf(Date);
    });

    it('should handle null processedImageUrl gracefully', async () => {
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Puma', confidence: 0.88 },
        model: { value: 'Suede', confidence: 0.82 },
        processedImageUrl: null
      });

      const job = createMockJob();
      await processJob(job);

      const updatedAsset = await Asset.findById(testAsset._id);
      
      expect(updatedAsset.status).toBe('active');
      // processed should not be set if URL is null
      expect(updatedAsset.images.processed?.url).toBeUndefined();
    });
  });

  /**
   * T042: Integration test - Worker emits asset_processed success event
   */
  describe('Success Event Emission', () => {
    it('should emit asset_processed success event with correct payload', async () => {
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Dunk Low', confidence: 0.90 },
        colorway: { value: 'Panda', confidence: 0.85 },
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
      });

      const job = createMockJob();
      await processJob(job);

      expect(emitAssetProcessed).toHaveBeenCalledTimes(1);
      expect(emitAssetProcessed).toHaveBeenCalledWith(
        testUser._id.toString(),
        expect.objectContaining({
          assetId: testAsset._id.toString(),
          status: 'active',
          processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
        })
      );
    });
  });

  /**
   * T043: Integration test - Worker retries on AI service 5xx error
   */
  describe('Retry Behavior', () => {
    it('should throw retryable error on AI service 5xx to trigger BullMQ retry', async () => {
      const retryableError = new Error('AI service returned 503');
      retryableError.statusCode = 503;
      retryableError.retryable = true;
      callAnalyze.mockRejectedValueOnce(retryableError);

      const job = createMockJob({ attemptsMade: 0 });
      
      await expect(processJob(job)).rejects.toThrow('AI service returned 503');
      
      // Asset should still be in processing state (not failed yet)
      const asset = await Asset.findById(testAsset._id);
      expect(asset.status).toBe('processing');
    });

    it('should throw error to allow BullMQ to handle retry with backoff', async () => {
      const timeoutError = new Error('AI service timeout');
      timeoutError.retryable = true;
      callAnalyze.mockRejectedValueOnce(timeoutError);

      const job = createMockJob({ attemptsMade: 1 });
      
      await expect(processJob(job)).rejects.toThrow('AI service timeout');
    });
  });

  /**
   * T044: Integration test - After max retries, asset status='failed', failure event emitted
   */
  describe('Final Failure Handling', () => {
    it('should mark error as unrecoverable for non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid image format');
      nonRetryableError.retryable = false;
      callAnalyze.mockRejectedValueOnce(nonRetryableError);

      const job = createMockJob();
      
      try {
        await processJob(job);
        fail('Should have thrown');
      } catch (error) {
        expect(error.unrecoverable).toBe(true);
      }
    });
  });

  /**
   * T045: Integration test - Worker handles deleted asset gracefully
   */
  describe('Deleted Asset Handling', () => {
    it('should complete job gracefully when asset is deleted', async () => {
      // Delete the asset before processing
      await Asset.deleteOne({ _id: testAsset._id });

      const job = createMockJob();
      const result = await processJob(job);

      // Should complete without throwing
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Asset not found');
      
      // Should not call AI service
      expect(callAnalyze).not.toHaveBeenCalled();
      
      // Should not emit event
      expect(emitAssetProcessed).not.toHaveBeenCalled();
    });

    it('should complete job gracefully when asset ownership changed', async () => {
      // Create another user and update asset ownership
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: '$2a$10$hashedpassword123',
        profile: {
          displayName: 'Other User'
        }
      });
      
      await Asset.findByIdAndUpdate(testAsset._id, { userId: otherUser._id });

      const job = createMockJob(); // Still has original userId
      const result = await processJob(job);

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Ownership mismatch');
      expect(callAnalyze).not.toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should return success result with processing details', async () => {
      callAnalyze.mockResolvedValueOnce({
        brand: { value: 'Nike', confidence: 0.95 },
        model: { value: 'Air Force 1', confidence: 0.90 },
        processedImageUrl: 'https://res.cloudinary.com/test/processed.jpg'
      });

      const job = createMockJob();
      const result = await processJob(job);

      expect(result.success).toBe(true);
      expect(result.assetId).toBe(testAsset._id.toString());
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.aiMetadata).toBeDefined();
    });
  });
});
