const fs = require('node:fs/promises');
const path = require('node:path');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { getStorageRoot } = require('../../../src/config/cloudinary');
const {
  runMaintenanceTick,
} = require('../../../src/workers/subscription-maintenance.worker');

describe('Subscription retention windows integration', () => {
  let requestId;
  let proofPath;

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

    const user = await User.create({
      email: 'retention-user@example.com',
      passwordHash: 'TestPass123',
      profile: { displayName: 'retention-user' },
    });

    proofPath = path.join(getStorageRoot(), 'subscription-proofs', 'retention-proof.png');
    await fs.mkdir(path.dirname(proofPath), { recursive: true });
    await fs.writeFile(proofPath, Buffer.from('proof'));

    const record = await SubscriptionUpgradeRequest.create({
      userId: user._id,
      type: 'upgrade',
      status: 'approved',
      transferReference: 'RETENTION-REF',
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
      reviewedBy: user._id,
      metadataExpireAt: new Date('2026-06-30T00:00:00.000Z'),
      proofFile: {
        storageUrl: 'http://localhost:3000/uploads/subscription-proofs/retention-proof.png',
        uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
        deleteAt: new Date('2026-01-31T00:00:00.000Z'),
      },
      proofMetadata: {
        amount: 0.99,
        currency: 'USD',
        bankLabel: 'ACB',
        payerMask: '****1234',
      },
    });

    requestId = record._id.toString();
  });

  it('purges proof files after 30 days and metadata after 180 days', async () => {
    await runMaintenanceTick({
      now: new Date('2026-02-05T00:00:00.000Z'),
    });

    let stored = await SubscriptionUpgradeRequest.findById(requestId).lean();
    await expect(fs.stat(proofPath)).rejects.toThrow();
    expect(stored.proofFile).toBeNull();
    expect(stored.proofMetadata).toMatchObject({
      amount: 0.99,
      currency: 'USD',
    });

    await runMaintenanceTick({
      now: new Date('2026-07-10T00:00:00.000Z'),
    });

    stored = await SubscriptionUpgradeRequest.findById(requestId).lean();
    expect(stored.transferReference).toBeNull();
    expect(stored.proofMetadata).toMatchObject({
      amount: null,
      currency: null,
      bankLabel: null,
      payerMask: null,
    });
    expect(stored.metadataPurgedAt).toBeTruthy();
  });
});
