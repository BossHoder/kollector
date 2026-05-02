const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

function buildMaintenableAsset(userId) {
  return {
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
  };
}

describe('VIP maintenance EXP multiplier integration', () => {
  let freeToken;
  let vipToken;
  let freeUserId;
  let vipUserId;

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

    const freeAuth = await authService.register('free-maintenance@example.com', 'TestPass123');
    freeToken = freeAuth.accessToken;
    freeUserId = freeAuth.user.id;

    const vipAuth = await authService.register('vip-maintenance@example.com', 'TestPass123');
    vipToken = vipAuth.accessToken;
    vipUserId = vipAuth.user.id;

    await Subscription.create({
      userId: freeUserId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    await Subscription.create({
      userId: vipUserId,
      tier: 'vip',
      status: 'active',
      paymentChannel: 'manual_bank',
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  });

  it('awards 1x EXP for Free and 3x EXP for VIP on the same maintenance action', async () => {
    const freeAsset = await Asset.create(buildMaintenableAsset(freeUserId));
    const vipAsset = await Asset.create(buildMaintenableAsset(vipUserId));

    const freeResponse = await request(app)
      .post(`/api/assets/${freeAsset._id}/maintain`)
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ version: 1, cleanedPercentage: 90, durationMs: 2200 })
      .expect(200);

    const vipResponse = await request(app)
      .post(`/api/assets/${vipAsset._id}/maintain`)
      .set('Authorization', `Bearer ${vipToken}`)
      .send({ version: 1, cleanedPercentage: 90, durationMs: 2200 })
      .expect(200);

    expect(freeResponse.body.xpAwarded).toBe(10);
    expect(vipResponse.body.xpAwarded).toBe(30);
  });
});
