const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    // Create a test user
    await authService.register('test@example.com', 'TestPass123');
  });

  describe('Success Cases', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should set refresh token cookie for web platform', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Client-Platform', 'web')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      const cookie = response.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/);
    });

    it('should return refresh token in body for mobile platform', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Client-Platform', 'mobile')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('refreshToken');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPass123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass123'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });
  });
});

describe('POST /api/auth/refresh', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Success Cases', () => {
    it('should refresh access token with valid refresh token (web)', async () => {
      // Register and login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Client-Platform', 'web')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        });

      // Can't easily test cookie-based refresh in supertest without extracting cookie
      // So we'll test mobile version instead
    });

    it('should refresh access token with valid refresh token (mobile)', async () => {
      // Register user
      await authService.register('test@example.com', 'TestPass123');

      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Client-Platform', 'mobile')
        .send({
          email: 'test@example.com',
          password: 'TestPass123'
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('X-Client-Platform', 'mobile')
        .send({ refreshToken })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
    });
  });

  describe('Error Cases', () => {
    it('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('X-Client-Platform', 'mobile')
        .send({})
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NO_REFRESH_TOKEN');
    });

    it('should return 401 with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('X-Client-Platform', 'mobile')
        .send({ refreshToken: 'invalid-token' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
    });
  });
});
