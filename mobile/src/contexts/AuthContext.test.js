/**
 * Auth Context Tests
 *
 * Tests for authentication context flows:
 * - Login/logout state changes
 * - Token persistence
 * - Initial auth state restoration
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import * as tokenStore from '../services/tokenStore';
import * as apiClient from '../services/apiClient';

// Mock dependencies
jest.mock('../services/tokenStore');
jest.mock('../services/apiClient');

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: no stored tokens
    tokenStore.hasStoredTokens.mockResolvedValue(false);
    tokenStore.getAccessToken.mockResolvedValue(null);
    tokenStore.getUserData.mockResolvedValue(null);
  });

  describe('Initial state', () => {
    it('should start in loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should resolve to unauthenticated when no tokens stored', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should restore session when tokens exist', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getAccessToken.mockResolvedValue('mock-token');
      tokenStore.getUserData.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('login', () => {
    const mockLoginResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: { id: 'user-456', email: 'login@example.com' },
    };

    beforeEach(() => {
      apiClient.publicApiRequest.mockResolvedValue(mockLoginResponse);
    });

    it('should call API with email and password', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(apiClient.publicApiRequest).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123' },
      });
    });

    it('should store tokens after successful login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(tokenStore.setAccessToken).toHaveBeenCalledWith('new-access-token');
      expect(tokenStore.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
      expect(tokenStore.setUserData).toHaveBeenCalled();
    });

    it('should update state to authenticated after login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.email).toBe('login@example.com');
    });

    it('should throw on login failure', async () => {
      const loginError = new Error('Invalid credentials');
      apiClient.publicApiRequest.mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear all tokens', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getAccessToken.mockResolvedValue('mock-token');
      tokenStore.getUserData.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(tokenStore.clearAllTokens).toHaveBeenCalled();
    });

    it('should update state to unauthenticated after logout', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getAccessToken.mockResolvedValue('mock-token');
      tokenStore.getUserData.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should clear local state even if server logout fails', async () => {
      apiClient.apiRequest.mockRejectedValue(new Error('Network error'));

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getAccessToken.mockResolvedValue('mock-token');
      tokenStore.getUserData.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state
      expect(tokenStore.clearAllTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('register', () => {
    const mockRegisterResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: { id: 'user-789', email: 'new@example.com' },
    };

    beforeEach(() => {
      apiClient.publicApiRequest.mockResolvedValue(mockRegisterResponse);
    });

    it('should call register API endpoint', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'NewPass123');
      });

      expect(apiClient.publicApiRequest).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: { email: 'new@example.com', password: 'NewPass123' },
      });
    });

    it('should auto-login after registration if tokens returned', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'NewPass123');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.email).toBe('new@example.com');
    });
  });
});
