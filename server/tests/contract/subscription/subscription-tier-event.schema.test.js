const { registeredSchemaContracts } = require('../../../src/contracts/openapi');
const {
  buildSubscriptionTierChangedEvent,
} = require('../../../src/modules/subscription/subscription.events');

describe('subscription_tier_changed event schema contract', () => {
  it('builds payload with all required fields in schema', () => {
    const payload = buildSubscriptionTierChangedEvent({
      occurredAt: '2026-04-15T12:00:00.000Z',
      userId: '507f1f77bcf86cd799439011',
      fromTier: 'free',
      toTier: 'vip',
      reason: 'upgrade_approved',
      effectiveAt: '2026-04-15T12:00:00.000Z',
      expiresAt: '2026-05-15T12:00:00.000Z',
      graceEndsAt: null,
    });

    const schema = registeredSchemaContracts.subscriptionEvents.$defs.SubscriptionTierChangedEvent;

    for (const field of schema.required) {
      expect(payload).toHaveProperty(field);
    }

    expect(payload.event).toBe('subscription_tier_changed');
    expect(schema.properties.reason.enum).toContain(payload.reason);
  });
});
