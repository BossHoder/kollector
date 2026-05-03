const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Subscription = require('../../../src/models/Subscription');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Admin user lookup contract', () => {
  let adminToken;
  let targetUserId;

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

    const adminAuth = await authService.register('ops-admin@example.com', 'TestPass123');
    await User.findByIdAndUpdate(adminAuth.user.id, { role: 'admin' });
    adminToken = adminAuth.accessToken;

    const userAuth = await authService.register('vip-customer@example.com', 'TestPass123');
    targetUserId = userAuth.user.id;

    await Subscription.findOneAndUpdate(
      { userId: targetUserId },
      {
        $set: {
          userId: targetUserId,
          tier: 'vip',
          status: 'active',
          activatedAt: new Date('2026-05-01T00:00:00.000Z'),
          expiresAt: new Date('2026-06-01T00:00:00.000Z'),
          graceEndsAt: null,
        },
      },
      { new: true, upsert: true }
    );

    await SubscriptionUpgradeRequest.create({
      userId: targetUserId,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'VIP-TRACE-001',
      submittedAt: new Date('2026-05-02T00:00:00.000Z'),
      metadataExpireAt: new Date('2026-11-02T00:00:00.000Z'),
      proofMetadata: {
        amount: 99000,
        currency: 'VND',
        bankLabel: 'VPBANK',
        payerMask: '8938',
      },
    });
  });

  it('lists users with pagination and optional email filter for admin callers', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .query({ email: 'vip-customer@example.com' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: targetUserId,
          email: 'vip-customer@example.com',
          role: 'user',
          subscription: expect.objectContaining({
            tier: 'vip',
            status: 'active',
          }),
        }),
      ])
    );
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns a single user summary with subscription and recent requests', async () => {
    const response = await request(app)
      .get(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toMatchObject({
      user: {
        id: targetUserId,
        email: 'vip-customer@example.com',
        role: 'user',
      },
      subscription: {
        tier: 'vip',
        status: 'active',
        usage: expect.objectContaining({
          nextResetAt: expect.any(String),
        }),
      },
    });
    expect(response.body.data.recentUpgradeRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transferReference: 'VIP-TRACE-001',
          payment: expect.objectContaining({
            amount: 99000,
            currency: 'VND',
          }),
        }),
      ])
    );
  });
});
