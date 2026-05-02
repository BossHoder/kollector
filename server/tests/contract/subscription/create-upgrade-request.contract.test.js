const request = require('supertest');
const { app } = require('../../../src/app');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { registeredOpenApiContracts } = require('../../../src/contracts/openapi');

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yd7wAAAAASUVORK5CYII=',
  'base64'
);

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

  it('is registered in the additive 1.2.0 subscription contract', () => {
    const contract = registeredOpenApiContracts.subscriptionMvp;

    expect(contract.paths['/api/subscription/upgrade-requests']).toBeDefined();
    expect(contract.paths['/api/subscription/upgrade-requests'].post).toBeDefined();
  });

  it('accepts multipart bank-transfer proof uploads and returns retention fields', async () => {
    const response = await request(app)
      .post('/api/subscription/upgrade-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('proofFile', tinyPng, {
        filename: 'proof.png',
        contentType: 'image/png',
      })
      .field('type', 'upgrade')
      .field('transferReference', 'BANK-REF-2026-001')
      .field('amount', '0.99')
      .field('currency', 'usd')
      .field('bankLabel', 'ACB')
      .field('payerMask', '****1234')
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
    });
    expect(response.body.data.proofFileDeleteAt).toEqual(expect.any(String));
    expect(response.body.data.metadataExpireAt).toEqual(expect.any(String));

    const stored = await SubscriptionUpgradeRequest.findById(response.body.data.id).lean();
    expect(String(stored.userId)).toBe(userId);
    expect(stored.proofMetadata).toMatchObject({
      amount: 0.99,
      currency: 'USD',
      bankLabel: 'ACB',
      payerMask: '****1234',
    });
  });

  it('rejects missing proofFile because the multipart contract requires transfer proof', async () => {
    const response = await request(app)
      .post('/api/subscription/upgrade-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('type', 'upgrade')
      .field('transferReference', 'BANK-REF-2026-002')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR');
  });
});
