import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../services/apiClient';
import { getAccessToken } from '../services/tokenStore';

const STORAGE_KEY = 'kollector_maintenance_queue';
const PERMANENT_FAILURE_STATUSES = new Set([400, 404, 409, 429]);

const inMemoryStorage = new Map();
const rollbackHandlers = new Map();

function createRequestId() {
  return `maintenance-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function setStoredValue(key, value) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    inMemoryStorage.set(key, value);
  }
}

async function getStoredValue(key) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }

  try {
    const value = await SecureStore.getItemAsync(key);
    if (value != null) {
      return value;
    }
  } catch {
    // Fall through to the in-memory store.
  }

  return inMemoryStorage.get(key) || null;
}

function normalizeStatus(error) {
  return error?.status
    ?? error?.response?.status
    ?? error?.data?.status
    ?? error?.data?.error?.status
    ?? null;
}

async function defaultQueueRequest(item) {
  return apiRequest(item.endpoint, {
    method: item.method,
    body: item.body,
    headers: item.headers,
    authenticated: false,
  });
}

async function readQueue(storageKey = STORAGE_KEY) {
  const storedValue = await getStoredValue(storageKey);

  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items, storageKey = STORAGE_KEY) {
  await setStoredValue(storageKey, JSON.stringify(items));
}

export function createOfflineQueue({
  storageKey = STORAGE_KEY,
  request = defaultQueueRequest,
  getAuthToken = getAccessToken,
} = {}) {
  return {
    async enqueue({ endpoint, method = 'POST', body, headers = {}, meta = {} }) {
      const accessToken = await getAuthToken();
      const item = {
        id: createRequestId(),
        endpoint,
        method,
        body,
        headers: {
          ...headers,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        meta,
        createdAt: new Date().toISOString(),
      };
      const items = await readQueue(storageKey);
      items.push(item);
      await writeQueue(items, storageKey);
      return item;
    },

    async flush() {
      const items = await readQueue(storageKey);
      const remainingItems = [];
      const results = [];

      for (const item of items) {
        try {
          const accessToken = await getAuthToken();
          const response = await request({
            ...item,
            headers: {
              ...item.headers,
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          });

          rollbackHandlers.delete(item.id);
          results.push({
            id: item.id,
            status: 'success',
            response,
          });
        } catch (error) {
          const status = normalizeStatus(error);

          if (PERMANENT_FAILURE_STATUSES.has(status)) {
            const rollback = rollbackHandlers.get(item.id);
            if (rollback) {
              await rollback(error, item);
            }
            rollbackHandlers.delete(item.id);
            results.push({
              id: item.id,
              status: 'rolled_back',
              error,
            });
            continue;
          }

          remainingItems.push(item);
          results.push({
            id: item.id,
            status: 'queued',
            error,
          });
        }
      }

      await writeQueue(remainingItems, storageKey);
      return results;
    },

    async getItems() {
      return readQueue(storageKey);
    },

    async clear() {
      await writeQueue([], storageKey);
    },
  };
}

export function registerMaintenanceRollback(requestId, callback) {
  rollbackHandlers.set(requestId, callback);
}

export function clearMaintenanceRollback(requestId) {
  rollbackHandlers.delete(requestId);
}

export const maintenanceQueue = createOfflineQueue();

export async function enqueueMaintenanceRequest(input) {
  return maintenanceQueue.enqueue(input);
}

export async function flushMaintenanceQueue() {
  return maintenanceQueue.flush();
}

export async function getQueuedMaintenanceRequests() {
  return maintenanceQueue.getItems();
}

export async function clearMaintenanceQueue() {
  rollbackHandlers.clear();
  return maintenanceQueue.clear();
}

export default maintenanceQueue;
