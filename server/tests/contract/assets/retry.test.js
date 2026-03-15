/**
 * Asset Retry Contract Tests
 *
 * Tests for POST /api/assets/:id/retry endpoint:
 * - Expected 202 response + status=processing
 * - Non-retryable states return 409
 * - Missing asset returns 404
 */

const request = require('supertest');
const app = require('../../../src/app');
const { connectDB, closeDB, clearDB } = require('../../helpers/db');
const { createTestUser, generateAuthToken } = require('../../helpers/auth');
const Asset = require('../../../src/models/Asset');

describe('POST /api/assets/:id/retry', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    testUser = await createTestUser();
    authToken = generateAuthToken(testUser);
  });

  describe('Success Cases', () => {
    it('should return 202 and set status to processing for failed asset', async () => {
      // Create a failed asset
      const failedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Failed Asset',
        status: 'failed',
        category: 'sneaker',
        error: 'Previous analysis failed',
      });

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      expect(response.body).toHaveProperty('asset');
      expect(response.body.asset.status).toBe('processing');
      expect(response.body.asset.error).toBeNull();
    });

    it('should return 202 for partial asset', async () => {
      // Create a partial asset
      const partialAsset = await Asset.create({
        userId: testUser._id,
        title: 'Partial Asset',
        status: 'partial',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${partialAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      expect(response.body.asset.status).toBe('processing');
    });

    it('should clear previous error on retry', async () => {
      const failedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Failed Asset',
        status: 'failed',
        category: 'sneaker',
        error: 'Image quality too low',
      });

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      expect(response.body.asset.error).toBeNull();
    });

    it('should enqueue new processing job', async () => {
      const failedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Failed Asset',
        status: 'failed',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      // Job should be queued (implementation specific)
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Non-Retryable States (409 Conflict)', () => {
    it('should return 409 for active asset', async () => {
      const activeAsset = await Asset.create({
        userId: testUser._id,
        title: 'Active Asset',
        status: 'active',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${activeAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot.*retry|not.*retryable/i);
    });

    it('should return 409 for processing asset', async () => {
      const processingAsset = await Asset.create({
        userId: testUser._id,
        title: 'Processing Asset',
        status: 'processing',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${processingAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toMatch(/cannot.*retry|already.*processing/i);
    });

    it('should return 409 for draft asset', async () => {
      const draftAsset = await Asset.create({
        userId: testUser._id,
        title: 'Draft Asset',
        status: 'draft',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${draftAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for archived asset', async () => {
      const archivedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Archived Asset',
        status: 'archived',
        category: 'sneaker',
      });

      const response = await request(app)
        .post(`/api/assets/${archivedAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Not Found (404)', () => {
    it('should return 404 for non-existent asset', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post(`/api/assets/${fakeId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for asset owned by different user', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherUserAsset = await Asset.create({
        userId: otherUser._id,
        title: 'Other User Asset',
        status: 'failed',
        category: 'sneaker',
      });

      // Try to retry as original testUser
      const response = await request(app)
        .post(`/api/assets/${otherUserAsset._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication (401)', () => {
    it('should return 401 without auth token', async () => {
      const failedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Failed Asset',
        status: 'failed',
        category: 'sneaker',
      });

      await request(app)
        .post(`/api/assets/${failedAsset._id}/retry`)
        .expect(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const failedAsset = await Asset.create({
        userId: testUser._id,
        title: 'Failed Asset',
        status: 'failed',
        category: 'sneaker',
      });

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
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
