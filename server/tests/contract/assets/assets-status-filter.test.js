/**
 * Contract Test: Asset Status Filter Validation
 *
 * Tests that the GET /api/assets endpoint accepts all valid status values
 * as defined in the Asset model schema, including 'failed' and 'partial'.
 *
 * This test was added for feature 011-mobile-ux-parity to ensure mobile
 * clients can filter by failed/partial status.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const assetService = require('../../../src/modules/assets/assets.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('GET /api/assets - Status Filter Validation', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});
    
    const result = await authService.register('test@example.com', 'TestPass123');
    accessToken = result.accessToken;
    userId = result.user.id;
  });

  describe('Valid Status Filters', () => {
    const validStatuses = ['draft', 'processing', 'active', 'archived', 'failed', 'partial'];

    validStatuses.forEach((status) => {
      it(`should accept status filter: ${status}`, async () => {
        const response = await request(app)
          .get(`/api/assets?status=${status}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect('Content-Type', /json/);

        // Should return 200, not 400 validation error
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
      });
    });
  });

  describe('Status Filter Returns Correct Assets', () => {
    it('should filter by failed status', async () => {
      // Create assets with different statuses
      const draftAsset = await assetService.createAsset(userId, { category: 'sneaker' });
      const activeAsset = await assetService.createAsset(userId, { category: 'lego' });
      const failedAsset = await assetService.createAsset(userId, { category: 'camera' });

      // Update statuses directly in DB (simulating system state changes)
      await Asset.findByIdAndUpdate(activeAsset.id, { status: 'active' });
      await Asset.findByIdAndUpdate(failedAsset.id, { status: 'failed' });

      const response = await request(app)
        .get('/api/assets?status=failed')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(failedAsset.id);
      expect(response.body.items[0].status).toBe('failed');
    });

    it('should filter by partial status', async () => {
      // Create asset and set to partial
      const asset = await assetService.createAsset(userId, { category: 'sneaker' });
      await Asset.findByIdAndUpdate(asset.id, { status: 'partial' });

      const response = await request(app)
        .get('/api/assets?status=partial')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe('partial');
    });
  });

  describe('Invalid Status Filters', () => {
    it('should reject invalid status values', async () => {
      const response = await request(app)
        .get('/api/assets?status=invalid_status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
