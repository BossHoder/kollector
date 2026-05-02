const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { runMaintenanceTick } = require('../../../src/workers/subscription-maintenance.worker');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Downgrade maintenance EXP reset integration', () => {
  let accessToken;
  let userId;

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

    const auth = await authService.register('downgrade-exp-reset@example.com', 'TestPass123');
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

    await runMaintenanceTick({
      now: new Date('2026-05-04T00:10:00.000Z'),
      listRequests: async () => [],
    });
  });

  it('reverts maintenance EXP back to the Free multiplier after downgrade', async () => {
    const asset = await Asset.create({
      userId,
      category: 'sneaker',
      status: 'active',
      version: 1,
      condition: {
        health: 50,
        decayRate: 2,
        lastDecayDate: null,
        lastMaintenanceDate: null,
        maintenanceCount: 0,
      },
      visualLayers: ['dust_medium'],
      images: {
        original: {
          url: 'https://example.com/original.jpg',
          uploadedAt: new Date(),
        },
      },
    });

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ version: 1, cleanedPercentage: 90, durationMs: 2200 })
      .expect(200);

    expect(response.body.xpAwarded).toBe(10);
  });
});
