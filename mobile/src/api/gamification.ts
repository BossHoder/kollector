import {
  enqueueMaintenanceRequest,
  flushMaintenanceQueue,
  registerMaintenanceRollback,
} from '../utils/offlineQueue';

function resolveAssetId(asset) {
  return asset?.id || asset?._id || null;
}

export function computeMaintenanceVisualLayers(health) {
  const normalizedHealth = Math.max(0, Math.min(100, Number(health) || 0));

  if (normalizedHealth >= 80) {
    return [];
  }

  if (normalizedHealth >= 60) {
    return ['dust_light'];
  }

  if (normalizedHealth >= 40) {
    return ['dust_medium'];
  }

  if (normalizedHealth >= 20) {
    return ['dust_heavy'];
  }

  return ['dust_heavy', 'yellowing'];
}

export function buildMaintenanceSnapshot(asset) {
  return {
    condition: {
      ...(asset?.condition || {}),
    },
    visualLayers: Array.isArray(asset?.visualLayers) ? [...asset.visualLayers] : [],
    version: Number(asset?.version ?? 1),
  };
}

export function buildOptimisticMaintenanceState(asset, occurredAt = new Date().toISOString()) {
  const previousHealth = Number(asset?.condition?.health ?? 100);
  const nextHealth = Math.min(100, previousHealth + 25);
  const currentMaintenanceCount = Number(asset?.condition?.maintenanceCount ?? 0);
  const currentVersion = Number(asset?.version ?? 1);

  return {
    condition: {
      ...(asset?.condition || {}),
      health: nextHealth,
      lastMaintenanceDate: occurredAt,
      maintenanceCount: currentMaintenanceCount + 1,
    },
    visualLayers: computeMaintenanceVisualLayers(nextHealth),
    version: currentVersion + 1,
  };
}

export function buildResolvedMaintenanceState(asset, response, occurredAt = new Date().toISOString()) {
  const currentMaintenanceCount = Number(asset?.condition?.maintenanceCount ?? 0);
  const currentVersion = Number(asset?.version ?? 1);
  const nextHealth = Number(response?.newHealth ?? asset?.condition?.health ?? 100);

  return {
    condition: {
      ...(asset?.condition || {}),
      health: nextHealth,
      lastMaintenanceDate: occurredAt,
      maintenanceCount: currentMaintenanceCount + 1,
    },
    visualLayers: computeMaintenanceVisualLayers(nextHealth),
    version: currentVersion + 1,
  };
}

export async function queueAssetMaintenance(
  {
    asset,
    cleanedPercentage,
    durationMs = 2000,
    onOptimisticUpdate,
    onRollback,
    onSuccess,
  },
  {
    enqueueRequest = enqueueMaintenanceRequest,
    flushQueue = flushMaintenanceQueue,
    registerRollback = registerMaintenanceRollback,
  } = {}
) {
  const assetId = resolveAssetId(asset);

  if (!assetId) {
    throw new Error('Asset ID is required for maintenance');
  }

  const snapshot = buildMaintenanceSnapshot(asset);
  const optimisticState = buildOptimisticMaintenanceState(asset);
  const occurredAt = optimisticState.condition.lastMaintenanceDate;

  if (onOptimisticUpdate) {
    onOptimisticUpdate(optimisticState, snapshot);
  }

  const queuedItem = await enqueueRequest({
    endpoint: `/assets/${assetId}/maintain`,
    method: 'POST',
    body: {
      version: snapshot.version,
      cleanedPercentage,
      durationMs,
    },
    meta: {
      assetId,
      snapshot,
    },
  });

  if (onRollback) {
    registerRollback(queuedItem.id, async (error, item) => {
      await onRollback({
        error,
        queuedItem: item || queuedItem,
        snapshot,
      });
    });
  }

  const flushPromise = flushQueue().then((results) => {
    const result = results.find((entry) => entry.id === queuedItem.id) || null;

    if (result?.status === 'success' && onSuccess) {
      onSuccess(
        result.response,
        buildResolvedMaintenanceState(asset, result.response, occurredAt)
      );
    }

    return result;
  });

  return {
    queued: true,
    requestId: queuedItem.id,
    queuedItem,
    snapshot,
    optimisticState,
    flushPromise,
  };
}

export default {
  buildMaintenanceSnapshot,
  buildOptimisticMaintenanceState,
  buildResolvedMaintenanceState,
  computeMaintenanceVisualLayers,
  queueAssetMaintenance,
};
