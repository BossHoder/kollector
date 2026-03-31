jest.mock('../../../src/modules/assets/assets.enhancement.queue', () => ({
  addToEnhancementQueue: jest.fn().mockResolvedValue('enhancement-job-123'),
  getEnhancementQueueMetrics: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  }),
  closeEnhancementQueue: jest.fn(),
}));

const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

jest.setTimeout(30000);

describe('POST /api/assets/:id/enhance-image', () => {
  let accessToken;
  let assetId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});

    const authResult = await authService.register('enhance@example.com', 'TestPass123');
    accessToken = authResult.accessToken;

    const asset = await Asset.create({
      userId: authResult.user.id,
      category: 'sneaker',
      status: 'active',
      images: {
        original: {
          url: 'https://example.com/original.jpg',
          uploadedAt: new Date(),
        },
      },
    });

    assetId = asset._id.toString();
  });

  it('returns 202 and queues enhancement for a valid asset', async () => {
    const response = await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202);

    expect(response.body).toEqual({
      success: true,
      data: {
        assetId,
        jobId: 'enhancement-job-123',
        status: 'queued',
      },
    });
  });

  it('returns 409 when enhancement is already queued', async () => {
    await Asset.findByIdAndUpdate(assetId, {
      enhancement: {
        status: 'queued',
        attemptCount: 0,
      },
    });

    const response = await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);

    expect(response.body.error.code).toBe('ENHANCEMENT_ALREADY_ACTIVE');
  });
});
