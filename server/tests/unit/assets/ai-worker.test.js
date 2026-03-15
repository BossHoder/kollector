/**
 * Unit Tests: AI Worker
 * Focused worker behavior tests without Mongo/Redis integration.
 */

jest.mock('../../../src/modules/assets/ai.client', () => ({
  callAnalyze: jest.fn()
}));

jest.mock('../../../src/modules/assets/assets.events', () => ({
  emitAssetProcessed: jest.fn(),
  buildSuccessPayload: jest.fn((assetId, aiMetadata, processedImageUrl, status = 'active') => ({
    assetId: String(assetId),
    status,
    aiMetadata,
    processedImageUrl
  })),
  buildFailurePayload: jest.fn((assetId, error) => ({
    assetId: String(assetId),
    status: 'failed',
    error
  }))
}));

jest.mock('../../../src/models/Asset', () => ({
  findById: jest.fn()
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../../src/config/redis', () => ({
  getConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    quit: jest.fn()
  })
}));

const Asset = require('../../../src/models/Asset');
const { callAnalyze } = require('../../../src/modules/assets/ai.client');
const {
  emitAssetProcessed,
  buildFailurePayload
} = require('../../../src/modules/assets/assets.events');
const { processJob } = require('../../../src/workers/ai.worker');

describe('AI Worker', () => {
  function createAsset(overrides = {}) {
    return {
      _id: '507f1f77bcf86cd799439011',
      userId: { toString: () => '507f1f77bcf86cd799439012' },
      status: 'processing',
      images: {
        original: {
          url: 'https://res.cloudinary.com/test/image/upload/original.jpg'
        }
      },
      aiMetadata: {},
      save: jest.fn().mockResolvedValue(undefined),
      set(path, value) {
        if (path === 'aiMetadata.error') {
          this.aiMetadata.error = value;
        }
        if (path === 'aiMetadata.failedAt') {
          this.aiMetadata.failedAt = value;
        }
      },
      ...overrides
    };
  }

  function createJob(overrides = {}) {
    return {
      id: 'job-123',
      data: {
        assetId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/original.jpg',
        category: 'sneaker',
        createdAt: new Date().toISOString(),
        ...overrides.data
      },
      attemptsMade: 0,
      opts: {
        attempts: 3,
        ...overrides.opts
      },
      ...overrides
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    buildFailurePayload.mockImplementation((assetId, error) => ({
      assetId: String(assetId),
      status: 'failed',
      error
    }));
  });

  it('returns partial when processed image exists but metadata is empty', async () => {
    const asset = createAsset();
    Asset.findById.mockResolvedValue(asset);
    callAnalyze.mockResolvedValue({
      brand: null,
      model: null,
      colorway: null,
      processedImageUrl: 'https://res.cloudinary.com/test/image/upload/processed.png'
    });

    const result = await processJob(createJob());

    expect(result.success).toBe(true);
    expect(asset.status).toBe('partial');
    expect(asset.images.processed.url).toBe('https://res.cloudinary.com/test/image/upload/processed.png');
  });

  it('persists failure and throws when a non-retryable job can be discarded', async () => {
    const asset = createAsset();
    Asset.findById
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce(asset);

    const nonRetryableError = new Error('Unsupported image content');
    nonRetryableError.retryable = false;
    callAnalyze.mockRejectedValue(nonRetryableError);

    const discard = jest.fn().mockResolvedValue(undefined);
    const job = createJob({ discard });

    await expect(processJob(job)).rejects.toThrow('Unsupported image content');

    expect(discard).toHaveBeenCalledTimes(1);
    expect(asset.status).toBe('failed');
    expect(asset.aiMetadata.error).toBe('Unsupported image content');
    expect(buildFailurePayload).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'Unsupported image content'
    );
    expect(emitAssetProcessed).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      expect.objectContaining({
        status: 'failed',
        error: 'Unsupported image content'
      })
    );
  });

  it('returns an explicit failure result when discard is unavailable', async () => {
    const asset = createAsset();
    Asset.findById
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce(asset);

    const nonRetryableError = new Error('Invalid image format');
    nonRetryableError.retryable = false;
    callAnalyze.mockRejectedValue(nonRetryableError);

    const result = await processJob(createJob());

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        failed: true,
        retryable: false,
        error: 'Invalid image format'
      })
    );
    expect(asset.status).toBe('failed');
  });
});
