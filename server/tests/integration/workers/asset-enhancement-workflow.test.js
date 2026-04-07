describe('Asset enhancement workflow chaining', () => {
  let mockAsset;
  let mockCallEnhanceImage;
  let mockAddToProcessingQueue;
  let mockEmitAssetImageEnhanced;
  let mockBuildEnhancementSuccessPayload;
  let mockBuildEnhancementFailurePayload;
  let mockExtractPublicIdFromUrl;
  let Asset;
  let processEnhancementJob;
  let handleEnhancementFailure;

  function createMockAsset() {
    const asset = {
      _id: 'asset-1',
      userId: {
        toString: () => 'user-1',
      },
      category: 'sneaker',
      status: 'processing',
      images: {},
      aiMetadata: {},
      enhancement: {
        toObject: () => ({
          status: 'queued',
          requestedBy: 'user-1',
        }),
      },
      set: jest.fn((path, value) => {
        const [root, key] = path.split('.');
        asset[root] = asset[root] || {};
        asset[root][key] = value;
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    return asset;
  }

  beforeEach(() => {
    jest.resetModules();

    mockAsset = createMockAsset();
    mockCallEnhanceImage = jest.fn().mockResolvedValue({
      enhancedImageUrl: 'https://cdn.example.com/assets/enhanced.png',
      width: 1600,
      height: 1200,
    });
    mockAddToProcessingQueue = jest.fn().mockResolvedValue('processing-job-456');
    mockEmitAssetImageEnhanced = jest.fn();
    mockBuildEnhancementSuccessPayload = jest.fn().mockReturnValue({
      event: 'asset_image_enhanced',
      assetId: 'asset-1',
    });
    mockBuildEnhancementFailurePayload = jest.fn().mockReturnValue({
      event: 'asset_image_enhanced',
      assetId: 'asset-1',
      status: 'failed',
    });
    mockExtractPublicIdFromUrl = jest.fn().mockReturnValue('assets/enhanced/enhanced-123');

    Asset = {
      findById: jest.fn().mockResolvedValue(mockAsset),
    };

    jest.doMock('../../../src/config/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    jest.doMock('../../../src/config/redis', () => ({
      getConnection: jest.fn().mockReturnValue({}),
    }));

    jest.doMock('../../../src/models/Asset', () => Asset);

    jest.doMock('../../../src/modules/assets/ai.client', () => ({
      callEnhanceImage: mockCallEnhanceImage,
    }));

    jest.doMock('../../../src/modules/assets/assets.queue', () => ({
      addToProcessingQueue: mockAddToProcessingQueue,
    }));

    jest.doMock('../../../src/config/cloudinary', () => ({
      extractPublicIdFromUrl: mockExtractPublicIdFromUrl,
    }));

    jest.doMock('../../../src/modules/assets/assets.enhancement.events', () => ({
      emitAssetImageEnhanced: mockEmitAssetImageEnhanced,
      buildEnhancementSuccessPayload: mockBuildEnhancementSuccessPayload,
      buildEnhancementFailurePayload: mockBuildEnhancementFailurePayload,
    }));

    ({
      processEnhancementJob,
      handleEnhancementFailure,
    } = require('../../../src/workers/asset-enhancement.worker'));
  });

  it('queues AI processing with the enhanced image after enhancement succeeds', async () => {
    const job = {
      id: 'enhancement-job-123',
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: {
        assetId: 'asset-1',
        userId: 'user-1',
        originalImageUrl: 'https://example.com/assets/original.jpg',
        requestedAt: '2026-04-07T00:00:00.000Z',
      },
    };

    const result = await processEnhancementJob(job);

    expect(mockCallEnhanceImage).toHaveBeenCalledWith({
      imageUrl: 'https://example.com/assets/original.jpg',
      options: undefined,
      assetId: 'asset-1',
      jobId: 'enhancement-job-123',
    });
    expect(mockAddToProcessingQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-1',
        userId: 'user-1',
        imageUrl: 'https://cdn.example.com/assets/enhanced.png',
        category: 'sneaker',
      })
    );
    expect(mockAsset.status).toBe('processing');
    expect(mockAsset.processingJobId).toBe('processing-job-456');
    expect(mockAsset.images.enhanced).toEqual(
      expect.objectContaining({
        url: 'https://cdn.example.com/assets/enhanced.png',
        publicId: 'assets/enhanced/enhanced-123',
        width: 1600,
        height: 1200,
      })
    );
    expect(mockAsset.save).toHaveBeenCalledTimes(2);
    expect(mockEmitAssetImageEnhanced).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        assetId: 'asset-1',
        nextProcessingJobId: 'processing-job-456',
      })
    );
  });

  it('marks the asset as failed if enhancement stage fails before analyze can start', async () => {
    const error = new Error('Enhancement service unavailable');
    const job = {
      id: 'enhancement-job-123',
      attemptsMade: 1,
      data: {
        assetId: 'asset-1',
        userId: 'user-1',
        requestedAt: '2026-04-07T00:00:00.000Z',
      },
    };

    await handleEnhancementFailure(job, error);

    expect(mockAsset.status).toBe('failed');
    expect(mockAsset.processingJobId).toBeUndefined();
    expect(mockAsset.aiMetadata.error).toBe('Enhancement service unavailable');
    expect(mockBuildEnhancementFailurePayload).toHaveBeenCalledWith(
      'asset-1',
      'Enhancement service unavailable',
      1
    );
    expect(mockEmitAssetImageEnhanced).toHaveBeenCalledTimes(1);
  });
});
