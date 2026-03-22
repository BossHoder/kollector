jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
});

import {
  clearMaintenanceQueue,
  createOfflineQueue,
  registerMaintenanceRollback,
} from './offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => {
    await clearMaintenanceQueue();
  });

  it('injects Bearer auth into queued maintenance payloads', async () => {
    const queue = createOfflineQueue({
      storageKey: 'queue-auth',
      getAuthToken: jest.fn().mockResolvedValue('token-123'),
      request: jest.fn().mockResolvedValue({ ok: true }),
    });

    const item = await queue.enqueue({
      endpoint: '/assets/asset-1/maintain',
      body: { version: 1, cleanedPercentage: 90 },
    });

    expect(item.headers.Authorization).toBe('Bearer token-123');
  });

  it('replays persisted requests from storage', async () => {
    const request = jest.fn().mockResolvedValue({ ok: true });
    const firstQueue = createOfflineQueue({
      storageKey: 'queue-replay',
      getAuthToken: jest.fn().mockResolvedValue('token-abc'),
      request,
    });

    await firstQueue.enqueue({
      endpoint: '/assets/asset-1/maintain',
      body: { version: 2, cleanedPercentage: 95 },
    });

    const secondQueue = createOfflineQueue({
      storageKey: 'queue-replay',
      getAuthToken: jest.fn().mockResolvedValue('token-abc'),
      request,
    });

    await secondQueue.flush();

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: '/assets/asset-1/maintain',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-abc',
      }),
    }));
    await expect(secondQueue.getItems()).resolves.toEqual([]);
  });

  it('rolls back and removes requests on permanent backend errors', async () => {
    const queue = createOfflineQueue({
      storageKey: 'queue-rollback',
      getAuthToken: jest.fn().mockResolvedValue('token-z'),
      request: jest.fn().mockRejectedValue({ status: 409 }),
    });

    const item = await queue.enqueue({
      endpoint: '/assets/asset-2/maintain',
      body: { version: 3, cleanedPercentage: 88 },
    });
    const rollback = jest.fn();
    registerMaintenanceRollback(item.id, rollback);

    const results = await queue.flush();

    expect(rollback).toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({
        id: item.id,
        status: 'rolled_back',
      }),
    ]);
    await expect(queue.getItems()).resolves.toEqual([]);
  });
});
