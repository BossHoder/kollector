/**
 * API Client Tests
 *
 * Tests for the API client with 401 refresh queue behavior:
 * - Single refresh when multiple 401s occur simultaneously
 * - Queued retries after successful refresh
 * - Proper header injection (Authorization, X-Client-Platform)
 */

import { apiRequest, publicApiRequest, uploadFile, ApiError } from './apiClient';
import * as tokenStore from './tokenStore';

// Mock tokenStore
jest.mock('./tokenStore');

// Mock fetch
global.fetch = jest.fn();

describe('apiClient', () => {
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockNewAccessToken = 'mock-new-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
    
    tokenStore.getAccessToken.mockResolvedValue(mockAccessToken);
    tokenStore.getRefreshToken.mockResolvedValue(mockRefreshToken);
    tokenStore.setAccessToken.mockResolvedValue();
    tokenStore.clearAllTokens.mockResolvedValue();
  });

  describe('apiRequest', () => {
    it('should include Authorization header with access token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'test' }),
      });

      await apiRequest('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it('should include X-Client-Platform: mobile header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'test' }),
      });

      await apiRequest('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-Platform': 'mobile',
          }),
        })
      );
    });

    it('should throw ApiError on error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      const promise = apiRequest('/test');
      await expect(promise).rejects.toThrow(ApiError);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await expect(apiRequest('/test')).rejects.toMatchObject({
        status: 400,
      });
    });

    it('should return parsed JSON response on success', async () => {
      const mockResponse = { items: [1, 2, 3], total: 3 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiRequest('/test');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('401 refresh queue', () => {
    it('should refresh token on 401 and retry request', async () => {
      // First call: 401
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      // Refresh call: success
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ accessToken: mockNewAccessToken }),
      });

      // Retry call: success
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'after refresh' }),
      });

      // Update mock to return new token after refresh
      tokenStore.getAccessToken
        .mockResolvedValueOnce(mockAccessToken) // Initial check
        .mockResolvedValueOnce(mockAccessToken) // First request
        .mockResolvedValueOnce(mockNewAccessToken); // Retry

      const result = await apiRequest('/test');

      expect(result).toEqual({ data: 'after refresh' });
      expect(tokenStore.setAccessToken).toHaveBeenCalledWith(mockNewAccessToken);
    });

    it('should clear tokens if refresh fails', async () => {
      // First call: 401
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      // Refresh call: failure
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Invalid refresh token' }),
      });

      await expect(apiRequest('/test')).rejects.toThrow('Session expired');
      expect(tokenStore.clearAllTokens).toHaveBeenCalled();
    });

    it('should queue multiple 401 requests behind single refresh', async () => {
      // This test verifies that when multiple requests get 401,
      // only one refresh is triggered and others wait for it.
      
      // All initial requests: 401
      const make401Response = () => ({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      // Success responses for retries
      const makeSuccessResponse = (data) => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(data),
      });

      // Mock sequence: 401, 401, 401, refresh success, retry1, retry2, retry3
      global.fetch
        .mockResolvedValueOnce(make401Response())
        .mockResolvedValueOnce(make401Response())
        .mockResolvedValueOnce(make401Response())
        .mockResolvedValueOnce(makeSuccessResponse({ accessToken: mockNewAccessToken })) // refresh
        .mockResolvedValueOnce(makeSuccessResponse({ id: 1 }))
        .mockResolvedValueOnce(makeSuccessResponse({ id: 2 }))
        .mockResolvedValueOnce(makeSuccessResponse({ id: 3 }));

      // Update mock to return new token after refresh
      tokenStore.getAccessToken.mockResolvedValue(mockNewAccessToken);

      // Start 3 requests simultaneously
      const results = await Promise.all([
        apiRequest('/test/1'),
        apiRequest('/test/2'),
        apiRequest('/test/3'),
      ]);

      // All should succeed after single refresh
      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      
      // setAccessToken should be called only once (single refresh)
      expect(tokenStore.setAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should retry failed assets-list request after refresh and resolve payload', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ message: 'Unauthorized' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ accessToken: mockNewAccessToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            assets: [{ id: 'asset-1' }],
            pagination: { hasMore: false, nextCursor: null, limit: 20 },
          }),
        });

      tokenStore.getAccessToken
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockNewAccessToken);

      const result = await apiRequest('/assets?status=active');

      expect(result.assets).toHaveLength(1);
      expect(tokenStore.setAccessToken).toHaveBeenCalledWith(mockNewAccessToken);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('publicApiRequest', () => {
    it('should not include Authorization header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ success: true }),
      });

      await publicApiRequest('/auth/login', { method: 'POST', body: {} });

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });

    it('should still include X-Client-Platform header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ success: true }),
      });

      await publicApiRequest('/auth/login', { method: 'POST', body: {} });

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers['X-Client-Platform']).toBe('mobile');
    });
  });

  describe('uploadFile', () => {
    it('should send FormData without Content-Type header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'uploaded-asset-id' }),
      });

      const formData = new FormData();
      formData.append('file', 'mock-file');

      await uploadFile('/assets/analyze-queue', formData);

      const fetchCall = global.fetch.mock.calls[0];
      // Should not have Content-Type (let browser set it for FormData)
      expect(fetchCall[1].headers['Content-Type']).toBeUndefined();
    });

    it('should include Authorization header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'uploaded-asset-id' }),
      });

      const formData = new FormData();
      await uploadFile('/assets/analyze-queue', formData);

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${mockAccessToken}`);
    });
  });
});
