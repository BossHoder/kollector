import { listAssets } from './assetsApi';
import { apiRequest } from '../services/apiClient';

jest.mock('../services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

describe('assetsApi.listAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps server payload shape items + nextCursor', async () => {
    apiRequest.mockResolvedValue({
      items: [{ id: 'asset-1' }, { id: 'asset-2' }],
      nextCursor: 'cursor-2',
    });

    const result = await listAssets({ limit: 20 });

    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].id).toBe('asset-1');
    expect(result.pagination.nextCursor).toBe('cursor-2');
    expect(result.pagination.hasMore).toBe(true);
  });

  it('maps server payload shape assets + pagination', async () => {
    apiRequest.mockResolvedValue({
      assets: [{ id: 'asset-1' }],
      pagination: {
        total: 1,
        limit: 20,
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await listAssets({ limit: 20 });

    expect(result.assets).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.hasMore).toBe(false);
  });
});
