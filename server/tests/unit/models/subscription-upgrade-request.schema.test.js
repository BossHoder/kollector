const mongoose = require('mongoose');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');

describe('SubscriptionUpgradeRequest schema', () => {
  it('defines additive request state and lifecycle fields', () => {
    expect(SubscriptionUpgradeRequest.schema.path('type')).toBeDefined();
    expect(SubscriptionUpgradeRequest.schema.path('status')).toBeDefined();
    expect(SubscriptionUpgradeRequest.schema.path('submittedAt')).toBeDefined();
    expect(SubscriptionUpgradeRequest.schema.path('proofFile.deleteAt')).toBeDefined();
    expect(SubscriptionUpgradeRequest.schema.path('metadataExpireAt')).toBeDefined();

    expect(SubscriptionUpgradeRequest.schema.path('type').enumValues).toEqual(
      expect.arrayContaining(['upgrade', 'renewal'])
    );

    expect(SubscriptionUpgradeRequest.schema.path('status').enumValues).toEqual(
      expect.arrayContaining(['pending', 'approved', 'rejected', 'expired'])
    );
  });

  it('requires transferReference for pending requests', async () => {
    const doc = new SubscriptionUpgradeRequest({
      userId: new mongoose.Types.ObjectId(),
      type: 'upgrade',
      status: 'pending',
      submittedAt: new Date(),
      metadataExpireAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    await expect(doc.validate()).rejects.toThrow(/transferReference/i);
  });

  it('defaults proof retention and metadata retention windows from submission time', () => {
    const submittedAt = new Date('2026-04-01T00:00:00.000Z');
    const doc = new SubscriptionUpgradeRequest({
      userId: new mongoose.Types.ObjectId(),
      type: 'upgrade',
      status: 'pending',
      transferReference: 'BANK-REF-123',
      submittedAt,
      proofFile: {
        storageUrl: 'https://example.com/proof.png',
        uploadedAt: submittedAt,
      },
    });

    expect(doc.proofFile.deleteAt).toBeDefined();
    expect(doc.metadataExpireAt).toBeDefined();
  });
});
