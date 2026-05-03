const request = require('supertest');
const { app } = require('../../../src/app');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { registeredOpenApiContracts } = require('../../../src/contracts/openapi');

describe('POST /api/subscription/upgrade-requests contract', () => {
  let accessToken;
  let userId;

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

    const auth = await authService.register('upgrade-request@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;
  });

  it('is registered in the additive 1.3.0 subscription contract', () => {
    const contract = registeredOpenApiContracts.subscriptionMvp;

    expect(contract.paths['/api/subscription/upgrade-requests']).toBeDefined();
    expect(contract.paths['/api/subscription/upgrade-requests'].post).toBeDefined();
  });

  it('accepts JSON bank-transfer requests without proof uploads and returns retention fields', async () => {
    const response = await request(app)
      .post('/api/subscription/upgrade-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'upgrade',
        transferReference: 'BANK-REF-2026-001',
        amount: 99000,
        currency: 'VND',
        bankLabel: 'VPBANK',
        payerMask: '8938',
      })
      .expect('Content-Type', /json/)
      .expect(202);

    expect(response.body.data).toMatchObject({
      userId,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'BANK-REF-2026-001',
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      proofFileDeleteAt: null,
    });
    expect(response.body.data.metadataExpireAt).toEqual(expect.any(String));

    const stored = await SubscriptionUpgradeRequest.findById(response.body.data.id).lean();
    expect(String(stored.userId)).toBe(userId);
    expect(stored.proofFile).toBeNull();
    expect(stored.proofMetadata).toMatchObject({
      amount: 99000,
      currency: 'VND',
      bankLabel: 'VPBANK',
      payerMask: '8938',
    });
  });

  it('rejects missing transferReference', async () => {
    const response = await request(app)
      .post('/api/subscription/upgrade-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'upgrade',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });
});
