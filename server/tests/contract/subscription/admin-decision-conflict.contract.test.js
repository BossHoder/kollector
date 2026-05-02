const request = require('supertest');
const { app } = require('../../../src/app');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Admin subscription decision conflict contract', () => {
  let adminToken;
  let userToken;
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

    const adminAuth = await authService.register('subscription-admin@example.com', 'TestPass123');
    await User.findByIdAndUpdate(adminAuth.user.id, { role: 'admin' });
    adminToken = adminAuth.accessToken;

    const userAuth = await authService.register('subscription-user@example.com', 'TestPass123');
    userToken = userAuth.accessToken;

    const pending = await SubscriptionUpgradeRequest.create({
      userId: userAuth.user.id,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'CONFLICT-REF',
      submittedAt: new Date('2026-04-01T00:00:00.000Z'),
      metadataExpireAt: new Date('2026-09-28T00:00:00.000Z'),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/conflict-proof.png',
        uploadedAt: new Date('2026-04-01T00:00:00.000Z'),
        deleteAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });

    requestId = pending._id.toString();
  });

  it('returns 403 for non-admin callers on admin review endpoints', async () => {
    const response = await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'verified transfer' })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error.code', 'FORBIDDEN');
  });

  it('returns 409 when an already-finalized request is approved or rejected again', async () => {
    await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'verified transfer' })
      .expect(200);

    const approveConflict = await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'verified transfer again' })
      .expect('Content-Type', /json/)
      .expect(409);

    expect(approveConflict.body).toHaveProperty(
      'error.code',
      'UPGRADE_REQUEST_ALREADY_FINALIZED'
    );

    const rejectConflict = await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'too late to reject' })
      .expect('Content-Type', /json/)
      .expect(409);

    expect(rejectConflict.body).toHaveProperty(
      'error.code',
      'UPGRADE_REQUEST_ALREADY_FINALIZED'
    );
  });
});
