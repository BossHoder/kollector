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
const Asset = require('../../../src/models/Asset');
const MonthlyUsageCounter = require('../../../src/models/MonthlyUsageCounter');
const QuotaLedgerEntry = require('../../../src/models/QuotaLedgerEntry');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { addToEnhancementQueue } = require('../../../src/modules/assets/assets.enhancement.queue');
const { currentUtcMonthKey } = require('../../../src/modules/subscription/quota.service');
const { handleEnhancementFailure } = require('../../../src/workers/asset-enhancement.worker');

describe('Processing quota accounting integration', () => {
  let accessToken;
  let assetId;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    addToEnhancementQueue.mockResolvedValue('enhancement-job-123');

    await Asset.deleteMany({});
    await MonthlyUsageCounter.deleteMany({});
    await QuotaLedgerEntry.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('processing-accounting@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    const asset = await Asset.create({
      userId,
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

  it('reserves quota on accepted enhancement and releases it once after terminal internal failure', async () => {
    const response = await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202);

    expect(response.body).toHaveProperty('data.jobId', 'enhancement-job-123');

    const counterAfterReserve = await MonthlyUsageCounter.findOne({
      userId,
      monthKey: currentUtcMonthKey(),
    }).lean();

    expect(counterAfterReserve).toMatchObject({
      allowance: 20,
      reservedCount: 1,
      consumedCount: 0,
      releasedCount: 0,
    });

    const queuedJobPayload = addToEnhancementQueue.mock.calls[0][0];
    const failure = new Error('Enhancement service unavailable');
    failure.failureClass = 'internal_system';

    await handleEnhancementFailure(
      {
        id: 'enhancement-job-123',
        attemptsMade: 1,
        data: queuedJobPayload,
      },
      failure
    );

    const counterAfterRelease = await MonthlyUsageCounter.findOne({
      userId,
      monthKey: currentUtcMonthKey(),
    }).lean();

    expect(counterAfterRelease).toMatchObject({
      reservedCount: 1,
      consumedCount: 0,
      releasedCount: 1,
    });

    const ledgerEntry = await QuotaLedgerEntry.findOne({
      idempotencyKey: queuedJobPayload.quotaIdempotencyKey,
    }).lean();

    expect(ledgerEntry).toMatchObject({
      actionType: 'enhance_image',
      state: 'released',
      failureClass: 'internal_system',
    });
  });
});
