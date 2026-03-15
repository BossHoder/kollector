const request = require('supertest');

const mockAddToProcessingQueue = jest.fn();

jest.mock('../../../src/modules/assets/assets.queue', () => ({
  addToProcessingQueue: mockAddToProcessingQueue,
  getQueue: jest.fn(),
  getQueueMetrics: jest.fn(),
  closeQueue: jest.fn(),
  DEFAULT_JOB_OPTIONS: {},
  QUEUE_NAME: 'ai-processing',
}));

const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

function buildRetryableAsset(overrides = {}) {
  return {
    category: 'sneaker',
    images: {
      original: {
        url: 'https://example.com/assets/original.jpg',
        publicId: 'assets/original',
        uploadedAt: new Date(),
      },
    },
    condition: {
      health: 100,
      decayRate: 2,
    },
    ...overrides,
  };
}

describe('POST /api/assets/:id/retry', () => {
  let accessToken;
  let userId;
  let otherUserToken;
  let otherUserId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});
    jest.clearAllMocks();
    mockAddToProcessingQueue.mockResolvedValue('mock-retry-job-id');

    const result1 = await authService.register('user1@example.com', 'TestPass123');
    accessToken = result1.accessToken;
    userId = result1.user.id;

    const result2 = await authService.register('user2@example.com', 'TestPass123');
    otherUserToken = result2.accessToken;
    otherUserId = result2.user.id;
  });

  describe('Success Cases', () => {
    it('should return 202 and set status to processing for failed asset', async () => {
      const failedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'failed',
        aiMetadata: {
          error: 'Previous analysis failed',
          failedAt: new Date(),
        },
      }));

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.asset.status).toBe('processing');
      expect(response.body.asset.processingJobId).toBe('mock-retry-job-id');
      expect(mockAddToProcessingQueue).toHaveBeenCalledTimes(1);
    });

    it('should return 202 for partial asset', async () => {
      const partialAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'partial',
      }));

      const response = await request(app)
        .post(`/api/assets/${partialAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body.asset.status).toBe('processing');
    });

    it('should clear previous aiMetadata error on retry', async () => {
      const failedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'failed',
        aiMetadata: {
          error: 'Image quality too low',
          failedAt: new Date(),
        },
      }));

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body.asset.aiMetadata?.error ?? null).toBeNull();
      expect(response.body.asset.aiMetadata?.failedAt ?? null).toBeNull();
    });

    it('should enqueue a new processing job', async () => {
      const failedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'failed',
      }));

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202);

      expect(response.body).toHaveProperty('message');
      expect(mockAddToProcessingQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: String(failedAsset._id),
          userId: String(userId),
          imageUrl: 'https://example.com/assets/original.jpg',
          category: 'sneaker',
        })
      );
    });
  });

  describe('Non-Retryable States (409 Conflict)', () => {
    it('should return 409 for active asset', async () => {
      const activeAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'active',
      }));

      const response = await request(app)
        .post(`/api/assets/${activeAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot.*retr|not.*retryable/i);
    });

    it('should return 409 for processing asset', async () => {
      const processingAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'processing',
      }));

      const response = await request(app)
        .post(`/api/assets/${processingAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body.error).toMatch(/cannot.*retr|already.*processing/i);
    });

    it('should return 409 for draft asset', async () => {
      const draftAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'draft',
      }));

      const response = await request(app)
        .post(`/api/assets/${draftAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for archived asset', async () => {
      const archivedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'archived',
      }));

      const response = await request(app)
        .post(`/api/assets/${archivedAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Not Found (404)', () => {
    it('should return 404 for non-existent asset', async () => {
      await request(app)
        .post('/api/assets/507f1f77bcf86cd799439011/retry')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for asset owned by different user', async () => {
      const otherUserAsset = await Asset.create(buildRetryableAsset({
        userId: otherUserId,
        status: 'failed',
      }));

      await request(app)
        .post(`/api/assets/${otherUserAsset._id}/retry`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Authentication (401)', () => {
    it('should return 401 without auth token', async () => {
      const failedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'failed',
      }));

      await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .expect(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const failedAsset = await Asset.create(buildRetryableAsset({
        userId,
        status: 'failed',
      }));

      await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Validation (400)', () => {
    it('should return 400 for invalid asset ID format', async () => {
      await request(app)
        .post('/api/assets/invalid-id/retry')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
