const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const assetService = require('../../../src/modules/assets/assets.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('GET /api/assets/:id', () => {
  let accessToken;
  let userId;
  let user2AccessToken;
  let user2Id;
  let asset;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});
    
    // Create two test users
    const result1 = await authService.register('user1@example.com', 'TestPass123');
    accessToken = result1.accessToken;
    userId = result1.user.id;

    const result2 = await authService.register('user2@example.com', 'TestPass123');
    user2AccessToken = result2.accessToken;
    user2Id = result2.user.id;

    // Create asset for user 1
    asset = await assetService.createAsset(userId, { category: 'sneaker' });
  });

  describe('Success Cases', () => {
    it('should get asset details by ID', async () => {
      const response = await request(app)
        .get(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('_id', asset._id.toString());
      expect(response.body).toHaveProperty('category', 'sneaker');
      expect(response.body).toHaveProperty('condition');
      expect(response.body.condition).toHaveProperty('health', 100);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 when asset does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 when trying to access another user asset', async () => {
      const response = await request(app)
        .get(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 400 with invalid asset ID', async () => {
      const response = await request(app)
        .get('/api/assets/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get(`/api/assets/${asset._id}`)
        .expect(401);
    });
  });
});
