const { createQuotaService } = require('../../../src/modules/subscription/quota.service');

describe('Quota ledger idempotency service', () => {
  it('reserves quota once and replays duplicate idempotency keys without double-charging', async () => {
    const service = createQuotaService();

    const command = {
      userId: '507f1f77bcf86cd799439011',
      actionType: 'analyze_queue',
      idempotencyKey: 'idem-001',
      monthKey: '2026-04',
    };

    const first = await service.reserveQuota(command);
    const second = await service.reserveQuota(command);

    expect(first.outcome).toBe('reserved');
    expect(second.outcome).toBe('reserved');
    expect(second.idempotentReplay).toBe(true);
  });

  it('releases quota exactly once for terminal internal/system failures', async () => {
    const service = createQuotaService();

    const command = {
      userId: '507f1f77bcf86cd799439011',
      actionType: 'enhance_image',
      idempotencyKey: 'idem-002',
      monthKey: '2026-04',
    };

    await service.reserveQuota(command);

    const firstRelease = await service.releaseQuota(command, {
      failureClass: 'internal_system',
    });

    const secondRelease = await service.releaseQuota(command, {
      failureClass: 'internal_system',
    });

    expect(firstRelease.outcome).toBe('released');
    expect(secondRelease.outcome).toBe('released');
    expect(secondRelease.idempotentReplay).toBe(true);
  });
});
