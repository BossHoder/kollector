describe('Asset enhancement worker bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();

    jest.doMock('../../../src/config/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    jest.doMock('../../../src/config/redis', () => ({
      getConnection: jest.fn().mockReturnValue({
        on: jest.fn(),
        quit: jest.fn(),
      }),
    }));

    jest.doMock('../../../src/modules/assets/ai.client', () => ({
      callEnhanceImage: jest.fn(),
    }));

    jest.doMock('../../../src/models/Asset', () => ({
      findById: jest.fn(),
    }));

    jest.doMock('../../../src/config/cloudinary', () => ({
      extractPublicIdFromUrl: jest.fn(),
    }));

    jest.doMock('../../../src/modules/assets/assets.enhancement.events', () => ({
      emitAssetImageEnhanced: jest.fn(),
      buildEnhancementSuccessPayload: jest.fn(),
      buildEnhancementFailurePayload: jest.fn(),
    }));
  });

  it('registers a BullMQ worker on the asset-enhancement queue', () => {
    const Worker = jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    }));

    jest.doMock('bullmq', () => ({
      Worker,
    }));

    const { startEnhancementWorker, WORKER_CONCURRENCY } = require('../../../src/workers/asset-enhancement.worker');

    startEnhancementWorker();

    expect(Worker).toHaveBeenCalledWith(
      'asset-enhancement',
      expect.any(Function),
      expect.objectContaining({
        concurrency: WORKER_CONCURRENCY,
      })
    );
  });
});
