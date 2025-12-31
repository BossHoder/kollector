/**
 * API Client with token refresh interceptor
 *
 * Implements fetch wrapper with:
 * - Automatic Authorization header injection
 * - Token refresh on 401
 * - Request queue to prevent race conditions during refresh
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token refresh queue to prevent race conditions
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token available');
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error || 'Token refresh failed');
  }

  const data = await response.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

interface RequestOptions {
  method: string;
  headers: HeadersInit;
  body?: string | FormData;
}

const createRequestOptions = (
  method: string,
  body?: unknown,
  accessToken?: string | null
): RequestOptions => {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const options: RequestOptions = {
    method,
    headers,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData - browser will set it with boundary
      options.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  return options;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle different error formats from the API
    let errorMessage = 'Request failed';
    if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (data.error?.message) {
      errorMessage = data.error.message;
    } else if (data.message) {
      errorMessage = data.message;
    }
    
    throw new ApiError(
      response.status,
      errorMessage,
      data.details
    );
  }

  return data as T;
};

const executeRequest = async <T>(
  url: string,
  options: RequestOptions,
  retry = true
): Promise<T> => {
  const response = await fetch(url, options);

  // Don't attempt token refresh for auth endpoints - let the original error through
  const isAuthEndpoint = url.includes('/api/auth/login') || 
                         url.includes('/api/auth/register') ||
                         url.includes('/api/auth/refresh');

  if (response.status === 401 && retry && !isAuthEndpoint) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (isRefreshing) {
      // Wait for ongoing refresh to complete
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: async (token: string) => {
            try {
              const newOptions = createRequestOptions(
                options.method,
                options.body ? JSON.parse(options.body as string) : undefined,
                token
              );
              const result = await executeRequest<T>(url, newOptions, false);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);

      // Retry original request with new token
      const newOptions = createRequestOptions(
        options.method,
        options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.parse(options.body as string)
            : undefined,
        newToken
      );
      return executeRequest<T>(url, newOptions, false);
    } catch (error) {
      processQueue(error as Error, null);
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse<T>(response);
};

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const options = createRequestOptions('GET', undefined, getAccessToken());
    return executeRequest<T>(url, options);
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const options = createRequestOptions('POST', body, getAccessToken());
    return executeRequest<T>(url, options);
  },

  async put<T>(url: string, body?: unknown): Promise<T> {
    const options = createRequestOptions('PUT', body, getAccessToken());
    return executeRequest<T>(url, options);
  },

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const options = createRequestOptions('PATCH', body, getAccessToken());
    return executeRequest<T>(url, options);
  },

  /**
   * Upload FormData (multipart/form-data)
   * Content-Type is automatically set by the browser with boundary
   */
  async upload<T>(url: string, formData: FormData): Promise<T> {
    const options = createRequestOptions('POST', formData, getAccessToken());
    return executeRequest<T>(url, options);
  },

  async delete<T>(url: string): Promise<T> {
    const options = createRequestOptions('DELETE', undefined, getAccessToken());
    return executeRequest<T>(url, options);
  },
};
