const { registeredSchemaContracts } = require('../../../src/contracts/openapi');
const {
  buildSubscriptionQuotaUpdatedEvent,
} = require('../../../src/modules/subscription/subscription.events');

describe('subscription_quota_updated event schema contract', () => {
  it('builds payload with required usage fields and valid enum values', () => {
    const payload = buildSubscriptionQuotaUpdatedEvent({
      occurredAt: '2026-04-16T08:00:00.000Z',
      userId: '507f1f77bcf86cd799439011',
      actionType: 'analyze_queue',
      idempotencyKey: 'idem-123',
      outcome: 'reserved',
      usage: {
        tier: 'free',
        used: 5,
        limit: 20,
        remaining: 15,
        nextResetAt: '2026-05-01T00:00:00.000Z',
      },
    });

    const schema = registeredSchemaContracts.subscriptionEvents.$defs.SubscriptionQuotaUpdatedEvent;

    for (const field of schema.required) {
      expect(payload).toHaveProperty(field);
    }

    expect(payload.event).toBe('subscription_quota_updated');
    expect(schema.properties.actionType.enum).toContain(payload.actionType);
    expect(schema.properties.outcome.enum).toContain(payload.outcome);

    for (const usageField of schema.properties.usage.required) {
      expect(payload.usage).toHaveProperty(usageField);
    }
  });
});
