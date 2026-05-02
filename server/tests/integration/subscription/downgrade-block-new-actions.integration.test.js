const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { runMaintenanceTick } = require('../../../src/workers/subscription-maintenance.worker');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription downgrade enforcement integration', () => {
  let accessToken;
  let userId;
  let assetId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Asset.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('downgrade-enforcement@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'vip',
      status: 'grace_pending_renewal',
      paymentChannel: 'manual_bank',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      graceEndsAt: new Date('2026-05-04T00:00:00.000Z'),
    });

    const createdAssets = await Asset.create(
      Array.from({ length: 20 }).map((_, index) => ({
        userId,
        category: 'sneaker',
        status: 'active',
        title: `Asset ${index + 1}`,
        images: {
          original: {
            url: `https://example.com/original-${index + 1}.jpg`,
            uploadedAt: new Date(),
          },
        },
      }))
    );

    assetId = createdAssets[0]._id.toString();

    await runMaintenanceTick({
      now: new Date('2026-05-04T00:30:00.000Z'),
      listRequests: async () => [],
    });
  });

  it('keeps existing assets readable while blocking new restricted actions after downgrade', async () => {
    const detailResponse = await request(app)
      .get(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body._id || detailResponse.body.id).toBeTruthy();

    const createResponse = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'sneaker', status: 'draft' })
      .expect(429);

    expect(createResponse.body.error).toMatchObject({
      code: 'ASSET_LIMIT_REACHED',
    });
  });
});
