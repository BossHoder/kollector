/**
 * Assets API Wrapper
 *
 * API functions for asset operations:
 * - listAssets: Paginated list with filtering
 * - getAsset: Single asset detail
 * - archiveAsset: Archive an asset
 * - retryAsset: Retry failed analysis
 */

import { apiRequest } from '../services/apiClient';
import { mapAsset, mapAssets } from '../utils/assetMapper';

function buildQueryString(params) {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

export async function listAssets({
  limit = 20,
  cursor,
  status,
  category,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  const queryString = buildQueryString({
    limit,
    cursor,
    status,
    category: category || undefined,
    search,
    sortBy,
    sortOrder,
  });

  const response = await apiRequest(`/assets${queryString}`);
  const rawAssets = response.items || response.assets || response.data || [];
  const assets = mapAssets(rawAssets);
  const nextCursor = response.pagination?.nextCursor ?? response.nextCursor ?? null;
  const hasMore = response.pagination?.hasMore ?? Boolean(nextCursor);
  const total = response.pagination?.total ?? response.total ?? assets.length;
  const resolvedLimit = response.pagination?.limit ?? response.limit ?? limit;

  return {
    assets,
    pagination: {
      total,
      limit: resolvedLimit,
      nextCursor,
      hasMore,
    },
  };
}

export async function getAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`);
  return mapAsset(response.asset || response);
}

export async function archiveAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    body: { status: 'archived' },
  });

  return mapAsset(response.asset || response);
}

export async function retryAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}/retry`, {
    method: 'POST',
  });

  return mapAsset(response.asset || response);
}

export async function updateAsset(assetId, updates) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    body: updates,
  });

  return mapAsset(response.asset || response);
}

export default {
  listAssets,
  getAsset,
  archiveAsset,
  retryAsset,
  updateAsset,
};
