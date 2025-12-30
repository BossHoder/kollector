/**
 * Contract Tests: POST /api/assets/analyze-queue
 * Tests per contracts/analyze-queue.openapi.json
 * @module tests/contract/assets/analyze-queue.test
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Create mock functions at module scope
const mockUploadImage = jest.fn();
const mockAddToProcessingQueue = jest.fn();

// Mock the queue to avoid Redis dependency in contract tests
jest.mock('../../../src/modules/assets/assets.queue', () => {
  return {
    addToProcessingQueue: mockAddToProcessingQueue,
    getQueue: jest.fn(),
    getQueueMetrics: jest.fn(),
    closeQueue: jest.fn(),
    DEFAULT_JOB_OPTIONS: {},
    QUEUE_NAME: 'ai-processing'
  };
});

// Mock Cloudinary
jest.mock('../../../src/config/cloudinary', () => ({
  uploadImage: mockUploadImage
}));

// Mock Redis connection
jest.mock('../../../src/config/redis', () => ({
  getConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    quit: jest.fn()
  }),
  createConnection: jest.fn().mockReturnValue({}),
  closeConnection: jest.fn()
}));

// Mock Socket.io
jest.mock('../../../src/config/socket', () => ({
  initSocket: jest.fn(),
  getIO: jest.fn(),
  closeSocket: jest.fn()
}));

// Mock worker
jest.mock('../../../src/workers/ai.worker', () => ({
  startWorker: jest.fn().mockReturnValue({ close: jest.fn() }),
  getWorker: jest.fn()
}));

// Import app and models AFTER mocks are declared
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('POST /api/assets/analyze-queue', () => {
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
    jest.clearAllMocks();
    
    // Set up mocks for each test
    mockUploadImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/image/upload/v1234567890/assets/test.jpg',
      publicId: 'assets/test'
    });
    mockAddToProcessingQueue.mockResolvedValue('mock-job-id');
    
    // Create and login test user
    const result = await authService.register('test@example.com', 'TestPass123');
    accessToken = result.accessToken;
    userId = result.user.id;
  });

  /**
   * T013: Contract test - POST /api/assets/analyze-queue success returns 202
   */
  describe('Success Cases', () => {
    it('should return 202 with success response when valid image and category provided', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-content');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImageBuffer, { 
          filename: 'test-sneaker.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'sneaker')
        .expect('Content-Type', /json/)
        .expect(202);

      // Validate response structure per OpenAPI spec
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('assetId');
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('status', 'processing');
      expect(response.body.data).toHaveProperty('message');
      
      // Verify assetId is a valid MongoDB ObjectId format
      expect(response.body.data.assetId).toMatch(/^[a-fA-F0-9]{24}$/);
    });

    it('should create asset with status "processing"', async () => {
      const testImageBuffer = Buffer.from('fake-image-content');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImageBuffer, { 
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'lego')
        .expect(202);

      // Verify asset was created in database
      const asset = await Asset.findById(response.body.data.assetId);
      expect(asset).not.toBeNull();
      expect(asset.status).toBe('processing');
      expect(asset.category).toBe('lego');
      expect(asset.userId.toString()).toBe(userId.toString());
    });

    it('should accept all valid categories', async () => {
      const categories = ['sneaker', 'lego', 'camera', 'other'];
      
      for (const category of categories) {
        const testImageBuffer = Buffer.from('fake-image');
        
        const response = await request(app)
          .post('/api/assets/analyze-queue')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('image', testImageBuffer, { 
            filename: 'test.jpg',
            contentType: 'image/jpeg'
          })
          .field('category', category)
          .expect(202);

        expect(response.body.success).toBe(true);
      }
    });
  });

  /**
   * T014: Contract test - Missing image file returns 400
   */
  describe('Missing Image Validation', () => {
    it('should return 400 with VALIDATION_ERROR when image is missing', async () => {
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('category', 'sneaker')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
      
      // Should have error detail for image field
      const imageError = response.body.error.details.find(d => d.field === 'image');
      expect(imageError).toBeDefined();
    });
  });

  /**
   * T015: Contract test - Invalid category returns 400
   */
  describe('Invalid Category Validation', () => {
    it('should return 400 with VALIDATION_ERROR for invalid category', async () => {
      const testImageBuffer = Buffer.from('fake-image');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImageBuffer, { 
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'invalid-category')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
      
      // Should have error detail for category field
      const categoryError = response.body.error.details.find(d => d.field === 'category');
      expect(categoryError).toBeDefined();
    });

    it('should return 400 when category is missing', async () => {
      const testImageBuffer = Buffer.from('fake-image');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', testImageBuffer, { 
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  /**
   * T016: Contract test - File too large returns 400
   */
  describe('File Size Validation', () => {
    it('should return 400 when file exceeds 10MB limit', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('image', largeBuffer, { 
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'sneaker')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
      
      // Should have error detail mentioning 10MB limit
      const sizeError = response.body.error.details.find(d => d.field === 'image');
      expect(sizeError).toBeDefined();
      expect(sizeError.message).toContain('10MB');
    });
  });

  /**
   * T017: Contract test - Unauthenticated returns 401
   */
  describe('Authentication Validation', () => {
    it('should return 401 when no token provided', async () => {
      const testImageBuffer = Buffer.from('fake-image');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .attach('image', testImageBuffer, { 
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'sneaker')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'No token provided');
    });

    it('should return 401 when token is invalid', async () => {
      const testImageBuffer = Buffer.from('fake-image');
      
      const response = await request(app)
        .post('/api/assets/analyze-queue')
        .set('Authorization', 'Bearer invalid-token')
        .attach('image', testImageBuffer, { 
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('category', 'sneaker')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });
  });
});
