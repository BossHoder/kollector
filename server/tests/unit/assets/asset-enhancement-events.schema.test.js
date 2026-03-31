const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockGetIO = jest.fn().mockReturnValue({ to: mockTo });

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../src/config/socket', () => ({
  getIO: () => mockGetIO(),
}));

const {
  buildEnhancementFailurePayload,
  buildEnhancementSuccessPayload,
  emitAssetImageEnhanced,
} = require('../../../src/modules/assets/assets.enhancement.events');

describe('Asset enhancement socket events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIO.mockReturnValue({ to: mockTo });
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  it('builds a success payload matching the enhancement event schema', () => {
    const payload = buildEnhancementSuccessPayload(
      '507f1f77bcf86cd799439011',
      'https://example.com/enhanced.jpg',
      1
    );

    expect(payload).toEqual(expect.objectContaining({
      event: 'asset_image_enhanced',
      assetId: '507f1f77bcf86cd799439011',
      status: 'succeeded',
      enhancedImageUrl: 'https://example.com/enhanced.jpg',
      attemptCount: 1,
      timestamp: expect.any(String),
    }));
  });

  it('builds a failure payload matching the enhancement event schema', () => {
    const payload = buildEnhancementFailurePayload(
      '507f1f77bcf86cd799439011',
      'Enhancement failed after 3 attempts',
      3
    );

    expect(payload).toEqual(expect.objectContaining({
      event: 'asset_image_enhanced',
      assetId: '507f1f77bcf86cd799439011',
      status: 'failed',
      error: 'Enhancement failed after 3 attempts',
      attemptCount: 3,
      timestamp: expect.any(String),
    }));
  });

  it('emits the additive asset_image_enhanced event to the user room', () => {
    const payload = buildEnhancementSuccessPayload(
      '507f1f77bcf86cd799439011',
      'https://example.com/enhanced.jpg',
      1
    );

    emitAssetImageEnhanced('507f1f77bcf86cd799439099', payload);

    expect(mockTo).toHaveBeenCalledWith('user:507f1f77bcf86cd799439099');
    expect(mockEmit).toHaveBeenCalledWith('asset_image_enhanced', payload);
  });
});
