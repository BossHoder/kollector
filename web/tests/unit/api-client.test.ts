/**
 * Unit tests for api-client.ts
 * Tests fetch wrapper with token refresh interceptor
 *
 * These tests MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import will fail until implementation exists
import { apiClient, ApiError } from '@/lib/api-client';

describe('api-client', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('basic requests', () => {
    it('should make GET request with JSON response', async () => {
      server.use(
        http.get('/api/test', () => {
          return HttpResponse.json({ message: 'success' });
        })
      );

      const response = await apiClient.get<{ message: string }>('/api/test');
      expect(response).toEqual({ message: 'success' });
    });

    it('should make POST request with JSON body', async () => {
      server.use(
        http.post('/api/test', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body });
        })
      );

      const response = await apiClient.post<{ received: unknown }>('/api/test', {
        data: 'test',
      });
      expect(response).toEqual({ received: { data: 'test' } });
    });

    it('should make PUT request with JSON body', async () => {
      server.use(
        http.put('/api/test/:id', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ updated: body });
        })
      );

      const response = await apiClient.put<{ updated: unknown }>('/api/test/123', {
        name: 'updated',
      });
      expect(response).toEqual({ updated: { name: 'updated' } });
    });

    it('should make DELETE request', async () => {
      server.use(
        http.delete('/api/test/:id', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const response = await apiClient.delete('/api/test/123');
      expect(response).toBeUndefined();
    });
  });

  describe('authorization header', () => {
    it('should include Authorization header when access token exists', async () => {
      localStorageMock.setItem('accessToken', 'test-token');

      server.use(
        http.get('/api/protected', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ auth: authHeader });
        })
      );

      const response = await apiClient.get<{ auth: string }>('/api/protected');
      expect(response.auth).toBe('Bearer test-token');
    });

    it('should not include Authorization header when no token', async () => {
      server.use(
        http.get('/api/public', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ auth: authHeader });
        })
      );

      const response = await apiClient.get<{ auth: string | null }>('/api/public');
      expect(response.auth).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw ApiError for 400 Bad Request', async () => {
      server.use(
        http.post('/api/validate', () => {
          return HttpResponse.json(
            { error: 'Validation failed', details: { field: 'email' } },
            { status: 400 }
          );
        })
      );

      await expect(apiClient.post('/api/validate', {})).rejects.toThrow(ApiError);

      try {
        await apiClient.post('/api/validate', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toBe('Validation failed');
      }
    });

    it('should throw ApiError for 404 Not Found', async () => {
      server.use(
        http.get('/api/notfound', () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(apiClient.get('/api/notfound')).rejects.toThrow(ApiError);
    });

    it('should throw ApiError for 500 Server Error', async () => {
      server.use(
        http.get('/api/error', () => {
          return HttpResponse.json({ error: 'Internal error' }, { status: 500 });
        })
      );

      await expect(apiClient.get('/api/error')).rejects.toThrow(ApiError);
    });
  });

  describe('token refresh flow', () => {
    it('should refresh token on 401 and retry original request', async () => {
      localStorageMock.setItem('accessToken', 'expired-token');
      localStorageMock.setItem('refreshToken', 'valid-refresh');

      let requestCount = 0;

      server.use(
        http.get('/api/protected', ({ request }) => {
          requestCount++;
          const authHeader = request.headers.get('Authorization');

          if (authHeader === 'Bearer expired-token') {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          if (authHeader === 'Bearer new-access-token') {
            return HttpResponse.json({ data: 'secret' });
          }
          return HttpResponse.json({ error: 'Unexpected' }, { status: 500 });
        }),
        http.post('/api/auth/refresh', async ({ request }) => {
          const body = (await request.json()) as { refreshToken: string };
          if (body.refreshToken === 'valid-refresh') {
            return HttpResponse.json({
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
            });
          }
          return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        })
      );

      const response = await apiClient.get<{ data: string }>('/api/protected');

      expect(response).toEqual({ data: 'secret' });
      expect(requestCount).toBe(2); // First failed, second succeeded
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
    });

    it('should not attempt refresh when no refresh token exists', async () => {
      localStorageMock.setItem('accessToken', 'expired-token');
      // No refresh token

      server.use(
        http.get('/api/protected', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        })
      );

      await expect(apiClient.get('/api/protected')).rejects.toThrow(ApiError);
    });

    it('should throw and clear tokens when refresh fails', async () => {
      localStorageMock.setItem('accessToken', 'expired-token');
      localStorageMock.setItem('refreshToken', 'invalid-refresh');

      server.use(
        http.get('/api/protected', () => {
          return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }),
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        })
      );

      await expect(apiClient.get('/api/protected')).rejects.toThrow(ApiError);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should queue requests during refresh and retry all after', async () => {
      localStorageMock.setItem('accessToken', 'expired-token');
      localStorageMock.setItem('refreshToken', 'valid-refresh');

      let refreshCallCount = 0;

      server.use(
        http.get('/api/resource1', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader === 'Bearer expired-token') {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return HttpResponse.json({ resource: 1 });
        }),
        http.get('/api/resource2', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader === 'Bearer expired-token') {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return HttpResponse.json({ resource: 2 });
        }),
        http.post('/api/auth/refresh', async () => {
          refreshCallCount++;
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 50));
          return HttpResponse.json({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          });
        })
      );

      // Fire both requests simultaneously
      const [res1, res2] = await Promise.all([
        apiClient.get<{ resource: number }>('/api/resource1'),
        apiClient.get<{ resource: number }>('/api/resource2'),
      ]);

      expect(res1).toEqual({ resource: 1 });
      expect(res2).toEqual({ resource: 2 });
      // Should only refresh once despite both requests failing
      expect(refreshCallCount).toBe(1);
    });
  });

  describe('FormData support', () => {
    it('should send FormData without Content-Type header', async () => {
      server.use(
        http.post('/api/upload', async ({ request }) => {
          const contentType = request.headers.get('Content-Type');
          // Content-Type should be set automatically by browser for FormData
          expect(contentType).toContain('multipart/form-data');
          return HttpResponse.json({ uploaded: true });
        })
      );

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.jpg');

      const response = await apiClient.post<{ uploaded: boolean }>(
        '/api/upload',
        formData
      );
      expect(response.uploaded).toBe(true);
    });
  });
});
