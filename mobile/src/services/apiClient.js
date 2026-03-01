/**
 * API Client
 *
 * Centralized HTTP client for API requests with:
 * - Automatic Authorization header injection
 * - 401 handling with refresh queue (only one refresh at a time)
 * - X-Client-Platform: mobile header for mobile-specific auth behavior
 * - Request/response error handling
 */

import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  clearAllTokens,
} from './tokenStore';

// API base URL - should be configured from environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Refresh state management
 * Ensures only one refresh happens at a time; other 401s queue behind it
 */
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to refresh completion
 * @param {function} callback - Called with new access token on success, or null on failure
 */
function subscribeToRefresh(callback) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers of refresh result
 * @param {string | null} newAccessToken
 */
function onRefreshComplete(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

/**
 * Refresh the access token
 * @returns {Promise<string | null>} New access token or null on failure
 */
async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed - clear tokens
      await clearAllTokens();
      return null;
    }

    const data = await response.json();
    
    // Mobile response only contains accessToken (per research.md)
    if (data.accessToken) {
      await setAccessToken(data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearAllTokens();
    return null;
  }
}

/**
 * Handle 401 response with refresh queue
 * @param {function} retryRequest - Function to retry the original request
 * @returns {Promise<Response>}
 */
async function handle401(retryRequest) {
  if (isRefreshing) {
    // Wait for the in-progress refresh to complete
    return new Promise((resolve, reject) => {
      subscribeToRefresh((newToken) => {
        if (newToken) {
          retryRequest().then(resolve).catch(reject);
        } else {
          reject(new Error('Session expired. Please log in again.'));
        }
      });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Start the initiating request's retry first to preserve ordering
      const retryPromise = retryRequest();
      // Then notify all queued requests so they retry after
      onRefreshComplete(newToken);
      return await retryPromise;
    } else {
      throw new Error('Session expired. Please log in again.');
    }
  } finally {
    // Notify any remaining subscribers on failure
    if (refreshSubscribers.length > 0) {
      onRefreshComplete(null);
    }
    isRefreshing = false;
  }
}

/**
 * API Error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an authenticated API request
 *
 * @param {string} endpoint - API endpoint (e.g., '/assets')
 * @param {Object} [options] - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.headers] - Additional headers
 * @param {boolean} [options.authenticated=true] - Whether to include auth header
 * @returns {Promise<any>} Parsed JSON response
 * @throws {ApiError} On error responses
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    authenticated = true,
  } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
    ...headers,
  };

  // Add Authorization header if authenticated
  if (authenticated) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const makeRequest = async () => {
    // Get fresh token for retries
    if (authenticated) {
      const freshToken = await getAccessToken();
      if (freshToken) {
        fetchOptions.headers.Authorization = `Bearer ${freshToken}`;
      }
    }

    const response = await fetch(url, fetchOptions);
    return response;
  };

  let response = await makeRequest();

  // Handle 401 with refresh queue
  if (response.status === 401 && authenticated) {
    response = await handle401(makeRequest);
  }

  // Parse response
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle error responses
  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

/**
 * Make an unauthenticated API request (for login/register)
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<any>}
 */
export async function publicApiRequest(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, authenticated: false });
}

/**
 * Upload a file with multipart form data
 *
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with file
 * @returns {Promise<any>}
 */
export async function uploadFile(endpoint, formData) {
  const accessToken = await getAccessToken();

  const headers = {
    'X-Client-Platform': 'mobile',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  // Handle 401 with refresh
  if (response.status === 401) {
    return handle401(async () => {
      const freshToken = await getAccessToken();
      headers.Authorization = `Bearer ${freshToken}`;
      return fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
    });
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data?.message || data?.error || 'Upload failed';
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export default {
  apiRequest,
  publicApiRequest,
  uploadFile,
  ApiError,
};
