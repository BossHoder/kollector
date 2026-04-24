describe('Asset enhancement acknowledgement metrics', () => {
  let controller;
  let assetService;
  let subscriptionService;

  beforeEach(() => {
    jest.resetModules();

    jest.doMock('../../../src/modules/assets/assets.service', () => ({
      queueEnhancement: jest.fn(),
    }));

    jest.doMock('../../../src/modules/gamification/gamification.service', () => ({
      maintainAsset: jest.fn(),
    }));

    jest.doMock('../../../src/modules/assets/assets.queue', () => ({
      getQueueMetrics: jest.fn().mockResolvedValue({}),
    }));

    jest.doMock('../../../src/modules/assets/assets.enhancement.queue', () => ({
      getEnhancementQueueMetrics: jest.fn().mockResolvedValue({}),
    }));

    jest.doMock('../../../src/modules/subscription/subscription.service', () => ({
      reserveProcessingQuota: jest.fn().mockResolvedValue({}),
      releaseProcessingQuota: jest.fn().mockResolvedValue({}),
    }));

    jest.doMock('../../../src/config/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    controller = require('../../../src/modules/assets/assets.controller');
    assetService = require('../../../src/modules/assets/assets.service');
    subscriptionService = require('../../../src/modules/subscription/subscription.service');
  });

  it('tracks accepted enhancement acknowledgements', async () => {
    assetService.queueEnhancement.mockResolvedValue({
      assetId: 'asset-1',
      jobId: 'job-1',
      status: 'queued',
    });

    const req = {
      user: { id: 'user-1' },
      params: { id: 'asset-1' },
      id: 'req-1',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await controller.queueEnhancement(req, res, next);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(subscriptionService.reserveProcessingQuota).toHaveBeenCalledWith('user-1', {
      actionType: 'enhance_image',
      resourceId: 'asset-1',
      idempotencyKey: 'enhance_image:asset-1:req-1',
    });
    expect(controller.getEnhancementAckMetrics().accepted).toBeGreaterThanOrEqual(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('tracks conflicts separately from accepted acknowledgements', async () => {
    const conflictError = new Error('Enhancement already queued or processing');
    conflictError.code = 'ENHANCEMENT_ALREADY_ACTIVE';
    assetService.queueEnhancement.mockRejectedValue(conflictError);

    const req = {
      user: { id: 'user-1' },
      params: { id: 'asset-1' },
      id: 'req-2',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.queueEnhancement(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(subscriptionService.releaseProcessingQuota).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        idempotencyKey: 'enhance_image:asset-1:req-2',
      },
      {
        failureClass: 'business_validation',
      }
    );
    expect(controller.getEnhancementAckMetrics().conflicts).toBeGreaterThanOrEqual(1);
  });
});
