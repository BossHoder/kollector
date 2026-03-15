import { renderHook, act } from '@testing-library/react-native';
import { useRealtimeFallback } from './useRealtimeFallback';

describe('useRealtimeFallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts polling on disconnect and updates lastPolledAt', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useRealtimeFallback({
      isConnected: false,
      onPoll,
      intervalMs: 1000,
    }));

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(result.current.isFallbackActive).toBe(true);
    expect(result.current.lastPolledAt).not.toBeNull();
  });

  it('stops polling and invokes onReconnect when transitioning to connected', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);
    const onReconnect = jest.fn();

    const { rerender } = renderHook(
      ({ isConnected }) => useRealtimeFallback({
        isConnected,
        onPoll,
        onReconnect,
        intervalMs: 1000,
      }),
      { initialProps: { isConnected: false } }
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);

    rerender({ isConnected: true });

    expect(onReconnect).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
  });
});
