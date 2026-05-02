const request = require('supertest');
const { app } = require('../../../src/app');
const Subscription = require('../../../src/models/Subscription');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const TierAuditLog = require('../../../src/models/TierAuditLog');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription upgrade audit integration', () => {
  let adminToken;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await TierAuditLog.deleteMany({});
    await SubscriptionUpgradeRequest.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const adminAuth = await authService.register('audit-admin@example.com', 'TestPass123');
    await User.findByIdAndUpdate(adminAuth.user.id, { role: 'admin' });
    adminToken = adminAuth.accessToken;

    const userAuth = await authService.register('audit-user@example.com', 'TestPass123');
    userId = userAuth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });
  });

  it('writes tier audit records on approval and reviewer decision fields on rejection', async () => {
    const approved = await SubscriptionUpgradeRequest.create({
      userId,
      type: 'upgrade',
      status: 'pending',
      transferReference: 'APPROVE-AUDIT-REF',
      submittedAt: new Date(),
      metadataExpireAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/approve-audit-proof.png',
        uploadedAt: new Date(),
        deleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${approved._id.toString()}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'approved for audit' })
      .expect(200);

    const tierAudit = await TierAuditLog.findOne({ userId }).lean();
    expect(tierAudit).toMatchObject({
      userId: approved.userId,
      fromTier: 'free',
      toTier: 'vip',
      reason: 'upgrade_approved',
    });

    const rejected = await SubscriptionUpgradeRequest.create({
      userId,
      type: 'renewal',
      status: 'pending',
      transferReference: 'REJECT-AUDIT-REF',
      submittedAt: new Date(),
      metadataExpireAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/reject-audit-proof.png',
        uploadedAt: new Date(),
        deleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await request(app)
      .post(`/api/admin/subscription/upgrade-requests/${rejected._id.toString()}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'mismatched transfer reference' })
      .expect(200);

    const rejectedRecord = await SubscriptionUpgradeRequest.findById(rejected._id).lean();
    expect(rejectedRecord.reviewedAt).toBeTruthy();
    expect(String(rejectedRecord.reviewedBy)).toBeTruthy();
    expect(rejectedRecord.rejectionReason).toBe('mismatched transfer reference');
  });
});
