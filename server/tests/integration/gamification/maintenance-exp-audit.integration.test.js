const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Maintenance EXP audit integration', () => {
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

    const auth = await authService.register('maintenance-exp-audit@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'vip',
      status: 'active',
      paymentChannel: 'manual_bank',
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  });

  it('stores multiplier-aware maintenance audit fields and user XP totals', async () => {
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

    await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ version: 1, cleanedPercentage: 90, durationMs: 2200 })
      .expect(200);

    const persistedAsset = await Asset.findById(asset._id).lean();
    const persistedUser = await User.findById(userId).lean();

    expect(persistedAsset.maintenanceLogs).toHaveLength(1);
    expect(persistedAsset.maintenanceLogs[0]).toMatchObject({
      xpAwarded: 30,
      expMultiplier: 3,
      xpDelta: 30,
    });
    expect(persistedUser.gamification.totalXp).toBe(30);
  });
});
