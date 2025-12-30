/**
 * Contract Tests: GET /api/assets/queue-status
 * Tests for queue monitoring endpoint
 * @module tests/contract/assets/queue-status.test
 */

const request = require('supertest');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

// Create mock function that we can control
const mockGetQueueMetrics = jest.fn();

// Mock the queue module
jest.mock('../../../src/modules/assets/assets.queue', () => {
  const original = jest.requireActual('../../../src/modules/assets/assets.queue');
  return {
    ...original,
    addToProcessingQueue: jest.fn(),
    getQueue: jest.fn(),
    getQueueMetrics: mockGetQueueMetrics,
    closeQueue: jest.fn()
  };
});

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

// Import app after mocks are set up
const { app } = require('../../../src/app');

describe('GET /api/assets/queue-status', () => {
  let accessToken;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
    
    // Set up the mock return value for each test
    mockGetQueueMetrics.mockResolvedValue({
      waiting: 5,
      active: 2,
      completed: 150,
      failed: 3,
      delayed: 0,
      paused: 0
    });
    
    // Create and login test user
    const result = await authService.register('test@example.com', 'TestPass123');
    accessToken = result.accessToken;
  });

  /**
   * T057: Contract test - GET /api/assets/queue-status returns job counts
   */
  describe('Success Cases', () => {
    it('should return 200 with queue job counts', async () => {
      const response = await request(app)
        .get('/api/assets/queue-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('waiting');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('failed');
      
      // Verify they are numbers
      expect(typeof response.body.data.waiting).toBe('number');
      expect(typeof response.body.data.active).toBe('number');
      expect(typeof response.body.data.completed).toBe('number');
      expect(typeof response.body.data.failed).toBe('number');
    });

    it('should return correct mock values', async () => {
      const response = await request(app)
        .get('/api/assets/queue-status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 3,
        delayed: 0,
        paused: 0
      });
    });
  });

  /**
   * T058: Contract test - Unauthenticated returns 401
   */
  describe('Authentication Validation', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/assets/queue-status')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'No token provided');
    });

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/assets/queue-status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });
  });
});
