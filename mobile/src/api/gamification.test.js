import { queueAssetMaintenance } from './gamification';

describe('queueAssetMaintenance', () => {
  const asset = {
    id: 'asset-1',
    version: 4,
    condition: {
      health: 50,
      maintenanceCount: 0,
    },
    visualLayers: ['dust_medium'],
  };

  it('applies optimistic state immediately and completes in the background', async () => {
    const onOptimisticUpdate = jest.fn();
    const onSuccess = jest.fn();
    let resolveFlush;
    const enqueueRequest = jest.fn().mockResolvedValue({
      id: 'request-1',
      headers: {
        Authorization: 'Bearer token-123',
      },
    });
    const flushQueue = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFlush = () => resolve([
        {
          id: 'request-1',
          status: 'success',
          response: {
            previousHealth: 50,
            newHealth: 77,
            xpAwarded: 10,
            streakDays: 2,
            badgesUnlocked: [],
          },
        },
      ]);
    }));

    const result = await queueAssetMaintenance({
      asset,
      cleanedPercentage: 92,
      durationMs: 2300,
      onOptimisticUpdate,
      onSuccess,
    }, {
      enqueueRequest,
      flushQueue,
      registerRollback: jest.fn(),
    });

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        condition: expect.objectContaining({
          health: 75,
          maintenanceCount: 1,
        }),
        version: 5,
      }),
      expect.any(Object)
    );
    expect(result.queued).toBe(true);
    expect(result.queuedItem.headers.Authorization).toBe('Bearer token-123');
    expect(onSuccess).not.toHaveBeenCalled();

    resolveFlush();
    await result.flushPromise;

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        newHealth: 77,
      }),
      expect.objectContaining({
        condition: expect.objectContaining({
          health: 77,
          maintenanceCount: 1,
        }),
      })
    );
  });

  it('registers rollback handlers for permanent failures', async () => {
    const onRollback = jest.fn();
    const enqueueRequest = jest.fn().mockResolvedValue({
      id: 'request-2',
      headers: {
        Authorization: 'Bearer token-xyz',
      },
    });
    let rollbackHandler;
    const registerRollback = jest.fn((_id, callback) => {
      rollbackHandler = callback;
    });

    const result = await queueAssetMaintenance({
      asset,
      cleanedPercentage: 90,
      durationMs: 2200,
      onRollback,
    }, {
      enqueueRequest,
      flushQueue: jest.fn().mockResolvedValue([]),
      registerRollback,
    });

    await rollbackHandler({ status: 429 }, { id: 'request-2' });

    expect(registerRollback).toHaveBeenCalledWith('request-2', expect.any(Function));
    expect(result.queuedItem.headers.Authorization).toBe('Bearer token-xyz');
    expect(onRollback).toHaveBeenCalledWith(expect.objectContaining({
      snapshot: expect.objectContaining({
        visualLayers: ['dust_medium'],
        version: 4,
      }),
    }));
  });
});
