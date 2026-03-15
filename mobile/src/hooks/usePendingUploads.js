import { useCallback, useEffect, useMemo, useState } from 'react';

let store = [];
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(store));
}

function nowIso() {
  return new Date().toISOString();
}

export function clearPendingUploadsStore() {
  store = [];
  emit();
}

export function usePendingUploads() {
  const [pendingUploads, setPendingUploads] = useState(store);

  useEffect(() => {
    const listener = (nextStore) => setPendingUploads([...nextStore]);
    listeners.add(listener);
    listener(store);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addPendingUpload = useCallback((draft) => {
    const newItem = {
      localId: draft.localId || `local-${Date.now()}`,
      imageUri: draft.imageUri,
      category: draft.category,
      title: draft.title || null,
      originalFilename: draft.originalFilename || null,
      status: draft.status || 'failed_upload',
      errorMessage: draft.errorMessage || null,
      retryCount: draft.retryCount || 0,
      createdAt: draft.createdAt || nowIso(),
      updatedAt: nowIso(),
    };

    store = [newItem, ...store.filter((item) => item.localId !== newItem.localId)];
    emit();
    return newItem;
  }, []);

  const updatePendingUpload = useCallback((localId, updates) => {
    store = store.map((item) => {
      if (item.localId !== localId) {
        return item;
      }

      return {
        ...item,
        ...updates,
        updatedAt: nowIso(),
      };
    });
    emit();
  }, []);

  const removePendingUpload = useCallback((localId) => {
    store = store.filter((item) => item.localId !== localId);
    emit();
  }, []);

  const retryPendingUpload = useCallback(async (localId, uploader) => {
    const current = store.find((item) => item.localId === localId);
    if (!current) {
      return null;
    }

    updatePendingUpload(localId, {
      status: 'pending_upload',
      errorMessage: null,
      retryCount: (current.retryCount || 0) + 1,
    });

    try {
      const result = await uploader(current);
      removePendingUpload(localId);
      return result;
    } catch (error) {
      updatePendingUpload(localId, {
        status: 'failed_upload',
        errorMessage: error?.message || 'Retry upload failed',
      });
      throw error;
    }
  }, [removePendingUpload, updatePendingUpload]);

  return useMemo(() => ({
    pendingUploads,
    addPendingUpload,
    updatePendingUpload,
    removePendingUpload,
    retryPendingUpload,
    clearPendingUploads: clearPendingUploadsStore,
  }), [pendingUploads, addPendingUpload, updatePendingUpload, removePendingUpload, retryPendingUpload]);
}

export default usePendingUploads;
