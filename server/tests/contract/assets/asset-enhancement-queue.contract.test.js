describe('Asset enhancement queue contract', () => {
  let mockQueueAdd;
  let addToEnhancementQueue;
  let DEFAULT_ENHANCEMENT_JOB_OPTIONS;

  beforeEach(() => {
    jest.resetModules();
    mockQueueAdd = jest.fn().mockResolvedValue({ id: 'enhancement-job-123' });

    jest.doMock('../../../src/config/redis', () => ({
      getConnection: jest.fn().mockReturnValue({
        on: jest.fn(),
        quit: jest.fn(),
      }),
    }));

    jest.doMock('../../../src/config/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    jest.doMock('bullmq', () => ({
      Queue: jest.fn().mockImplementation(() => ({
        add: mockQueueAdd,
        getJobCounts: jest.fn(),
        close: jest.fn(),
      })),
    }));

    const queueModule = require('../../../src/modules/assets/assets.enhancement.queue');
    addToEnhancementQueue = queueModule.addToEnhancementQueue;
    DEFAULT_ENHANCEMENT_JOB_OPTIONS = queueModule.DEFAULT_ENHANCEMENT_JOB_OPTIONS;
  });

  it('submits payload matching asset-enhancement-job.schema.json', async () => {
    const jobId = await addToEnhancementQueue({
      assetId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      originalImageUrl: 'https://example.com/original.jpg',
      requestedAt: '2026-03-24T09:00:00.000Z',
    });

    expect(jobId).toBe('enhancement-job-123');
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'enhance-asset-image',
      expect.objectContaining({
        jobType: 'asset_image_enhancement',
        queue: 'asset-enhancement',
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        originalImageUrl: 'https://example.com/original.jpg',
        requestedAt: '2026-03-24T09:00:00.000Z',
        attempt: 1,
      }),
      DEFAULT_ENHANCEMENT_JOB_OPTIONS
    );
  });

  it('throws when required fields are missing', async () => {
    await expect(addToEnhancementQueue({
      assetId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
    })).rejects.toThrow('Missing required field: originalImageUrl');
  });
});
