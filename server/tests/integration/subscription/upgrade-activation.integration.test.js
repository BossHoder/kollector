const request = require('supertest');
const { app } = require('../../../src/app');
const Subscription = require('../../../src/models/Subscription');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription upgrade activation integration', () => {
  let userToken;
  let adminToken;
  let userId;
  let requestId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await SubscriptionUpgradeRequest.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const userAuth = await authService.register('vip-upgrade-user@example.com', 'TestPass123');
    userToken = userAuth.accessToken;
    userId = userAuth.user.id;

    const adminAuth = await authService.register('vip-upgrade-admin@example.com', 'TestPass123');
    await User.findByIdAndUpdate(adminAuth.user.id, { role: 'admin' });
    adminToken = adminAuth.accessToken;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    const pending = await SubscriptionUpgradeRequest.create({
      userId,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'VIP-ACTIVATION-REF',
      submittedAt: new Date(),
      metadataExpireAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/vip-upgrade-proof.png',
        uploadedAt: new Date(),
        deleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    requestId = pending._id.toString();
  });

  it('activates VIP immediately after admin approval and exposes upgraded entitlements', async () => {
    const approvalResponse = await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'bank transfer verified' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(approvalResponse.body.data).toMatchObject({
      id: requestId,
      status: 'approved',
      tierAfterApproval: 'vip',
    });

    const subscription = await Subscription.findOne({ userId }).lean();
    expect(subscription).toMatchObject({
      tier: 'vip',
      status: 'active',
      paymentChannel: 'manual_bank',
    });
    expect(subscription.expiresAt).toBeTruthy();

    const statusResponse = await request(app)
      .get('/api/subscription/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(statusResponse.body.data).toMatchObject({
      tier: 'vip',
      status: 'active',
      entitlements: {
        assetLimit: 200,
        processingMonthlyLimit: 400,
        maintenanceExpMultiplier: 3,
      },
    });
  });
});
