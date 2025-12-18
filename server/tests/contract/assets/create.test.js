const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('POST /api/assets', () => {
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
    
    // Create and login test user
    const result = await authService.register('test@example.com', 'TestPass123');
    accessToken = result.accessToken;
    userId = result.user.id;
  });

  describe('Success Cases', () => {
    it('should create a new asset with valid category', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'sneaker'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('category', 'sneaker');
      expect(response.body).toHaveProperty('status', 'draft');
      expect(response.body.userId.toString()).toBe(userId.toString());
      expect(response.body).toHaveProperty('condition');
      expect(response.body.condition).toHaveProperty('health', 100);
      expect(response.body.condition).toHaveProperty('decayRate', 2);
    });

    it('should create asset with all valid categories', async () => {
      const categories = ['sneaker', 'lego', 'camera', 'other'];
      
      for (const category of categories) {
        const response = await request(app)
          .post('/api/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ category })
          .expect(201);

        expect(response.body).toHaveProperty('category', category);
      }
    });

    it('should set default status to draft', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'camera'
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'draft');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when category is missing', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 with invalid category', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'invalid-category'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 with invalid status', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'sneaker',
          status: 'invalid-status'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/assets')
        .send({
          category: 'sneaker'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          category: 'sneaker'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|AUTHENTICATION_ERROR/);
    });
  });
});
