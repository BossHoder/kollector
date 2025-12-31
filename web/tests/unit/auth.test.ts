/**
 * Unit tests for auth.ts
 * Tests token storage and refresh logic
 *
 * These tests MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isAuthenticated,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from '@/lib/auth';
import type { User } from '@/types/user';

describe('auth helpers', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('token management', () => {
    it('should get access token from localStorage', () => {
      localStorageMock.setItem('accessToken', 'test-access-token');
      expect(getAccessToken()).toBe('test-access-token');
    });

    it('should return null when no access token exists', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('should get refresh token from localStorage', () => {
      localStorageMock.setItem('refreshToken', 'test-refresh-token');
      expect(getRefreshToken()).toBe('test-refresh-token');
    });

    it('should return null when no refresh token exists', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('should set both tokens in localStorage', () => {
      setTokens('new-access', 'new-refresh');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'new-access');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
    });

    it('should clear both tokens from localStorage', () => {
      localStorageMock.setItem('accessToken', 'test-access');
      localStorageMock.setItem('refreshToken', 'test-refresh');

      clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('authentication state', () => {
    it('should return true when access token exists', () => {
      localStorageMock.setItem('accessToken', 'valid-token');
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no access token exists', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false for empty access token', () => {
      localStorageMock.setItem('accessToken', '');
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('user storage', () => {
    const mockUser: User = {
      id: 'user-123',
      _id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      avatar: undefined,
    };

    it('should store user as JSON in localStorage', () => {
      setStoredUser(mockUser);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockUser)
      );
    });

    it('should retrieve user from localStorage', () => {
      localStorageMock.setItem('user', JSON.stringify(mockUser));

      const user = getStoredUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('should return null when stored user is invalid JSON', () => {
      localStorageMock.setItem('user', 'invalid-json');
      expect(getStoredUser()).toBeNull();
    });

    it('should clear stored user from localStorage', () => {
      localStorageMock.setItem('user', JSON.stringify(mockUser));

      clearStoredUser();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });
});
