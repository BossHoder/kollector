import { uploadAsset } from './uploadApi';
import { uploadFile } from '../services/apiClient';

jest.mock('../services/apiClient', () => ({
  uploadFile: jest.fn(),
}));

describe('uploadApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps upload metadata from response.data.asset payload', async () => {
    uploadFile.mockResolvedValue({
      data: {
        asset: {
          id: 'asset-1',
          status: 'processing',
          originalFilename: 'test.jpg',
          fileSizeBytes: 1310720,
          mimeType: 'image/jpeg',
          uploadedAt: '2026-03-10T10:00:00.000Z',
        },
        status: 'processing',
      },
    });

    const response = await uploadAsset({
      uri: 'file://image.jpg',
      type: 'image/jpeg',
      fileName: 'image.jpg',
      category: 'cards',
      assetName: 'test',
    });

    expect(response.asset.originalFilename).toBe('test.jpg');
    expect(response.asset.fileSizeMB).toBe(1.25);
    expect(response.asset.mimeType).toBe('image/jpeg');
    expect(response.asset.uploadedAt).toBe('2026-03-10T10:00:00.000Z');
  });
});
