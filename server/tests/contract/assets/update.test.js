const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const assetService = require('../../../src/modules/assets/assets.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('PATCH /api/assets/:id', () => {
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
    
    const result1 = await authService.register('user1@example.com', 'TestPass123');
    accessToken = result1.accessToken;
    userId = result1.user.id;

    const result2 = await authService.register('user2@example.com', 'TestPass123');
    user2AccessToken = result2.accessToken;
    user2Id = result2.user.id;

    asset = await assetService.createAsset(userId, { category: 'sneaker' });
  });

  describe('Success Cases', () => {
    it('should update asset category', async () => {
      const response = await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'lego' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('category', 'lego');
    });

    it('should update asset status', async () => {
      const response = await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'active');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 when asset does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .patch(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'lego' })
        .expect(404);
    });

    it('should return 404 when trying to update another user asset', async () => {
      await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .send({ category: 'lego' })
        .expect(404);
    });

    it('should return 400 with invalid category', async () => {
      await request(app)
        .patch(`/api/assets/${asset._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'invalid' })
        .expect(400);
    });
  });
});
