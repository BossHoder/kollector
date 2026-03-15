import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePendingUploads, clearPendingUploadsStore } from './usePendingUploads';

describe('usePendingUploads', () => {
  beforeEach(() => {
    clearPendingUploadsStore();
  });

  it('creates and updates local placeholder lifecycle states', () => {
    const { result } = renderHook(() => usePendingUploads());

    let draft;
    act(() => {
      draft = result.current.addPendingUpload({
        localId: 'local-1',
        imageUri: 'file://image.jpg',
        category: 'camera',
        status: 'failed_upload',
      });
    });

    expect(draft.localId).toBe('local-1');
    expect(result.current.pendingUploads[0].status).toBe('failed_upload');

    act(() => {
      result.current.updatePendingUpload('local-1', { status: 'pending_upload', errorMessage: null });
    });

    expect(result.current.pendingUploads[0].status).toBe('pending_upload');
  });

  it('transitions failed_upload -> pending_upload -> removed on successful retry', async () => {
    const { result } = renderHook(() => usePendingUploads());

    act(() => {
      result.current.addPendingUpload({
        localId: 'local-2',
        imageUri: 'file://image2.jpg',
        category: 'sneaker',
        status: 'failed_upload',
      });
    });

    const uploader = jest.fn().mockResolvedValue({ asset: { id: 'asset-99' } });

    await act(async () => {
      await result.current.retryPendingUpload('local-2', uploader);
    });

    expect(uploader).toHaveBeenCalledTimes(1);
    expect(result.current.pendingUploads).toHaveLength(0);
  });

  it('returns placeholder to failed_upload when retry fails', async () => {
    const { result } = renderHook(() => usePendingUploads());

    act(() => {
      result.current.addPendingUpload({
        localId: 'local-3',
        imageUri: 'file://image3.jpg',
        category: 'lego',
        status: 'failed_upload',
      });
    });

    await expect(
      result.current.retryPendingUpload('local-3', async () => {
        throw new Error('network down');
      })
    ).rejects.toThrow('network down');

    await waitFor(() => {
      expect(result.current.pendingUploads[0].status).toBe('failed_upload');
      expect(result.current.pendingUploads[0].retryCount).toBe(1);
    });
  });
});
