const mongoose = require('mongoose');
const Subscription = require('../../../src/models/Subscription');

describe('UserSubscription schema', () => {
  it('defines tier and status enums with Free defaults', () => {
    expect(Subscription.schema.path('tier')).toBeDefined();
    expect(Subscription.schema.path('status')).toBeDefined();

    expect(Subscription.schema.path('tier').enumValues).toEqual(
      expect.arrayContaining(['free', 'vip'])
    );

    expect(Subscription.schema.path('status').enumValues).toEqual(
      expect.arrayContaining(['active', 'grace_pending_renewal', 'expired'])
    );

    const doc = new Subscription({
      userId: new mongoose.Types.ObjectId(),
    });

    expect(doc.tier).toBe('free');
    expect(doc.status).toBe('active');
  });

  it('requires graceEndsAt while status is grace_pending_renewal', async () => {
    const doc = new Subscription({
      userId: new mongoose.Types.ObjectId(),
      tier: 'vip',
      status: 'grace_pending_renewal',
      expiresAt: new Date(),
    });

    await expect(doc.validate()).rejects.toThrow(/graceEndsAt/i);
  });

  it('keeps payment channel options for present and future sources', () => {
    expect(Subscription.schema.path('paymentChannel').enumValues).toEqual(
      expect.arrayContaining(['manual_bank', 'google_play', 'app_store'])
    );
  });
});
