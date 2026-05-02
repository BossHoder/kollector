const request = require('supertest');
const { app } = require('../../../src/app');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('VIP theme entitlement integration', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('vip-theme-entitlement@example.com', 'TestPass123');
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

  it('returns all active presets as selectable for VIP users', async () => {
    const response = await request(app)
      .get('/api/subscription/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.entitlements.theme.selectablePresetIds).toEqual([
      'vault-graphite',
      'ledger-ivory',
      'museum-forest',
      'archive-cobalt',
    ]);
    expect(response.body.data.entitlements.theme.lockedPresetIds).toEqual([]);
  });
});
