const request = require('supertest');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

const mockGetQueueMetrics = jest.fn();
const mockGetEnhancementQueueMetrics = jest.fn();
const mockListFailedJobs = jest.fn();
const mockListEnhancementFailedJobs = jest.fn();

jest.mock('../../../src/modules/assets/assets.queue', () => {
  const original = jest.requireActual('../../../src/modules/assets/assets.queue');
  return {
    ...original,
    getQueueMetrics: mockGetQueueMetrics,
    listFailedJobs: mockListFailedJobs,
  };
});

jest.mock('../../../src/modules/assets/assets.enhancement.queue', () => ({
  getEnhancementQueueMetrics: mockGetEnhancementQueueMetrics,
  listEnhancementFailedJobs: mockListEnhancementFailedJobs,
  closeEnhancementQueue: jest.fn(),
}));

jest.mock('../../../src/config/redis', () => ({
  getConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    quit: jest.fn(),
  }),
  createConnection: jest.fn().mockReturnValue({}),
  closeConnection: jest.fn(),
}));

jest.mock('../../../src/config/socket', () => ({
  initSocket: jest.fn(),
  getIO: jest.fn(),
  closeSocket: jest.fn(),
}));

jest.mock('../../../src/workers/ai.worker', () => ({
  startWorker: jest.fn().mockReturnValue({ close: jest.fn() }),
  getWorker: jest.fn(),
}));

jest.mock('../../../src/workers/asset-enhancement.worker', () => ({
  startEnhancementWorker: jest.fn().mockReturnValue({ close: jest.fn() }),
  getEnhancementWorker: jest.fn(),
}));

const { app } = require('../../../src/app');

describe('Admin operations contract', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();

    mockGetQueueMetrics.mockResolvedValue({
      waiting: 3,
      active: 1,
      completed: 7,
      failed: 1,
      delayed: 0,
      paused: 0,
    });
    mockGetEnhancementQueueMetrics.mockResolvedValue({
      waiting: 2,
      active: 1,
      completed: 4,
      failed: 1,
      delayed: 0,
      paused: 0,
    });
    mockListFailedJobs.mockResolvedValue([
      {
        id: 'ai-job-1',
        queueName: 'ai-processing',
        assetId: 'asset-1',
        userId: 'user-1',
        failureReason: 'Timeout',
        attemptsMade: 3,
        maxAttempts: 3,
        createdAt: '2026-05-03T09:00:00.000Z',
        processedAt: '2026-05-03T09:01:00.000Z',
        failedAt: '2026-05-03T09:02:00.000Z',
      },
    ]);
    mockListEnhancementFailedJobs.mockResolvedValue([
      {
        id: 'enh-job-1',
        queueName: 'asset-enhancement',
        assetId: 'asset-2',
        userId: 'user-2',
        failureReason: 'Remote 500',
        attemptsMade: 2,
        maxAttempts: 3,
        createdAt: '2026-05-03T10:00:00.000Z',
        processedAt: '2026-05-03T10:01:00.000Z',
        failedAt: '2026-05-03T10:02:00.000Z',
      },
    ]);

    const adminAuth = await authService.register('ops@example.com', 'TestPass123');
    await User.findByIdAndUpdate(adminAuth.user.id, { role: 'admin' });
    adminToken = adminAuth.accessToken;

    const userAuth = await authService.register('user@example.com', 'TestPass123');
    userToken = userAuth.accessToken;
  });

  it('protects admin operations endpoints from non-admin callers', async () => {
    const response = await request(app)
      .get('/api/admin/operations/queue-status')
      .set('Authorization', `Bearer ${userToken}`)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error.code', 'FORBIDDEN');
  });

  it('returns queue metrics and failed jobs for admins', async () => {
    const queueResponse = await request(app)
      .get('/api/admin/operations/queue-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(queueResponse.body.data).toMatchObject({
      aiProcessing: expect.objectContaining({
        waiting: 3,
        active: 1,
      }),
      assetEnhancement: expect.objectContaining({
        waiting: 2,
        failed: 1,
      }),
      enhancementAck: expect.any(Object),
      lastRefreshedAt: expect.any(String),
    });

    const failedJobsResponse = await request(app)
      .get('/api/admin/operations/failed-jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(failedJobsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'enh-job-1',
          queueName: 'asset-enhancement',
          failureReason: 'Remote 500',
        }),
        expect.objectContaining({
          id: 'ai-job-1',
          queueName: 'ai-processing',
          failureReason: 'Timeout',
        }),
      ])
    );
  });
});
