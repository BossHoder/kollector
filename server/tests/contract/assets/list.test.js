const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const assetService = require('../../../src/modules/assets/assets.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('GET /api/assets', () => {
  let accessToken;
  let userId;
  let user2AccessToken;
  let user2Id;

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
  });

  describe('Success Cases', () => {
    it('should return empty list when user has no assets', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toEqual([]);
      expect(response.body).toHaveProperty('nextCursor', null);
    });

    it('should list user assets', async () => {
      // Create assets for user 1
      await assetService.createAsset(userId, { category: 'sneaker' });
      await assetService.createAsset(userId, { category: 'lego' });
      await assetService.createAsset(userId, { category: 'camera' });

      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should only return current user assets (ownership check)', async () => {
      // Create assets for both users
      await assetService.createAsset(userId, { category: 'sneaker' });
      await assetService.createAsset(user2Id, { category: 'lego' });

      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toHaveProperty('category', 'sneaker');
    });

    it('should filter by category', async () => {
      await assetService.createAsset(userId, { category: 'sneaker' });
      await assetService.createAsset(userId, { category: 'lego' });
      await assetService.createAsset(userId, { category: 'sneaker' });

      const response = await request(app)
        .get('/api/assets?category=sneaker')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every(a => a.category === 'sneaker')).toBe(true);
    });

    it('should filter by status', async () => {
      await assetService.createAsset(userId, { category: 'sneaker', status: 'draft' });
      await assetService.createAsset(userId, { category: 'lego', status: 'active' });

      const response = await request(app)
        .get('/api/assets?status=draft')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toHaveProperty('status', 'draft');
    });

    it('should paginate with limit', async () => {
      // Create 5 assets
      for (let i = 0; i < 5; i++) {
        await assetService.createAsset(userId, { category: 'sneaker' });
      }

      const response = await request(app)
        .get('/api/assets?limit=3')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      expect(response.body.nextCursor).toBeTruthy();
    });
  });

  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/assets')
        .expect(401);
    });
  });
});
