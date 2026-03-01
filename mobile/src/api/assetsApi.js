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

/**
 * Build query string from params object, filtering out undefined/null values
 */
function buildQueryString(params) {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

/**
 * List assets with pagination and filtering
 *
 * @param {Object} options
 * @param {number} [options.limit=20] - Results per page
 * @param {string} [options.cursor] - Cursor for pagination (nextCursor from previous response)
 * @param {string} [options.status] - Filter by status (draft|processing|partial|active|archived|failed)
 * @param {string} [options.category] - Filter by category
 * @param {string} [options.search] - Search query
 * @param {string} [options.sortBy='createdAt'] - Sort field
 * @param {string} [options.sortOrder='desc'] - Sort order (asc|desc)
 * @returns {Promise<{assets: Array, pagination: Object}>}
 */
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
    category,
    search,
    sortBy,
    sortOrder,
  });

  const response = await apiRequest(`/assets${queryString}`);
  console.log('[listAssets] apiRequest returned:', typeof response, response ? Object.keys(response) : 'null');
  
  return {
    assets: response.assets || response.data || [],
    pagination: {
      total: response.pagination?.total || response.total || 0,
      limit: response.pagination?.limit || limit,
      nextCursor: response.pagination?.nextCursor || response.nextCursor || null,
      hasMore: response.pagination?.hasMore ?? (response.nextCursor != null),
    },
  };
}

/**
 * Get a single asset by ID
 *
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Asset object
 */
export async function getAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`);
  return response.asset || response;
}

/**
 * Archive an asset
 *
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Updated asset
 */
export async function archiveAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    body: { status: 'archived' },
  });

  return response.asset || response;
}

/**
 * Retry failed asset analysis
 *
 * @param {string} assetId - Asset ID
 * @returns {Promise<Object>} Updated asset with status=processing
 */
export async function retryAsset(assetId) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}/retry`, {
    method: 'POST',
  });

  return response.asset || response;
}

/**
 * Update asset metadata
 *
 * @param {string} assetId - Asset ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated asset
 */
export async function updateAsset(assetId, updates) {
  if (!assetId) {
    throw new Error('Asset ID is required');
  }

  const response = await apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    body: updates,
  });

  return response.asset || response;
}

export default {
  listAssets,
  getAsset,
  archiveAsset,
  retryAsset,
  updateAsset,
};
