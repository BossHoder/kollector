const mongoose = require('mongoose');
const request = require('supertest');
const { app } = require('../../../src/app');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('GET /api/subscription/upgrade-requests contracts', () => {
  let accessToken;
  let userId;
  let ownLatestRequestId;
  let ownOlderRequestId;
  let otherRequestId;

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

    const auth = await authService.register('upgrade-list@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    const otherAuth = await authService.register('upgrade-list-other@example.com', 'TestPass123');

    const ownOlder = await SubscriptionUpgradeRequest.create({
      userId,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'OLDER-REF',
      submittedAt: new Date('2026-04-01T00:00:00.000Z'),
      metadataExpireAt: new Date('2026-09-28T00:00:00.000Z'),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/older-proof.png',
        uploadedAt: new Date('2026-04-01T00:00:00.000Z'),
        deleteAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });

    const ownLatest = await SubscriptionUpgradeRequest.create({
      userId,
      type: 'renewal',
      status: 'approved',
      transferReference: 'LATEST-REF',
      submittedAt: new Date('2026-04-02T00:00:00.000Z'),
      reviewedAt: new Date('2026-04-03T00:00:00.000Z'),
      reviewedBy: new mongoose.Types.ObjectId(),
      metadataExpireAt: new Date('2026-09-29T00:00:00.000Z'),
      proofFile: null,
    });

    const other = await SubscriptionUpgradeRequest.create({
      userId: otherAuth.user.id,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'OTHER-REF',
      submittedAt: new Date('2026-04-04T00:00:00.000Z'),
      metadataExpireAt: new Date('2026-10-01T00:00:00.000Z'),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/other-proof.png',
        uploadedAt: new Date('2026-04-04T00:00:00.000Z'),
        deleteAt: new Date('2026-05-04T00:00:00.000Z'),
      },
    });

    ownOlderRequestId = ownOlder._id.toString();
    ownLatestRequestId = ownLatest._id.toString();
    otherRequestId = other._id.toString();
  });

  it('lists only the authenticated user requests in reverse-chronological order', async () => {
    const response = await request(app)
      .get('/api/subscription/upgrade-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((item) => item.id)).toEqual([
      ownLatestRequestId,
      ownOlderRequestId,
    ]);
    expect(response.body.data.every((item) => item.userId === userId)).toBe(true);
    expect(response.body.data[0].proofFileDeleteAt).toBeNull();
  });

  it('returns own request details and hides another user request with 404', async () => {
    const ownResponse = await request(app)
      .get(`/api/subscription/upgrade-requests/${ownLatestRequestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(ownResponse.body.data).toMatchObject({
      id: ownLatestRequestId,
      userId,
      type: 'renewal',
      status: 'approved',
      transferReference: 'LATEST-REF',
      proofFileDeleteAt: null,
    });

    const hiddenResponse = await request(app)
      .get(`/api/subscription/upgrade-requests/${otherRequestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(hiddenResponse.body).toHaveProperty('error.code', 'UPGRADE_REQUEST_NOT_FOUND');
  });
});
