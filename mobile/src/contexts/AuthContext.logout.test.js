/**
 * AuthContext Logout Tests
 *
 * Tests that logout clears tokens and resets navigation
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { View, Text, Button } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext';
import * as tokenStore from '../services/tokenStore';
import { socketService } from '../services/socketService';
import * as pendingUploads from '../hooks/usePendingUploads';

// Mock tokenStore
jest.mock('../services/tokenStore', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  setUserData: jest.fn(),
  getUserData: jest.fn(),
  hasStoredTokens: jest.fn(),
  clearAllTokens: jest.fn(),
}));

// Mock apiClient
jest.mock('../services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../services/socketService', () => ({
  socketService: {
    disconnect: jest.fn(),
  },
}));

// Mock navigation reset
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
    navigate: jest.fn(),
  }),
  NavigationContainer: ({ children }) => children,
}));

// Test component that uses AuthContext
function TestLogoutComponent() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <View>
      <Text testID="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</Text>
      <Text testID="user-email">{user?.email || 'no-user'}</Text>
      <Button testID="logout-button" title="Logout" onPress={logout} />
    </View>
  );
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenStore.getAccessToken.mockResolvedValue(null);
    tokenStore.getRefreshToken.mockResolvedValue(null);
    tokenStore.hasStoredTokens.mockResolvedValue(false);
    tokenStore.getUserData.mockResolvedValue(null);
    tokenStore.clearAllTokens.mockResolvedValue(undefined);
    jest.spyOn(pendingUploads, 'clearPendingUploadsStore').mockImplementation(() => {});
  });

  describe('clearAllTokens on logout', () => {
    it('should call clearAllTokens when logout is invoked', async () => {
      // Setup as authenticated initially
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.getRefreshToken.mockResolvedValue('test-refresh');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      // Wait for initial auth check
      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      // Press logout
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      await waitFor(() => {
        expect(tokenStore.clearAllTokens).toHaveBeenCalled();
      });
    });

    it('should set isAuthenticated to false after logout', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
      });
    });

    it('should clear user data after logout', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      await waitFor(() => {
        expect(getByTestId('user-email').props.children).toBe('no-user');
      });
    });

    it('should clear socket and pending upload state during logout', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      await waitFor(() => {
        expect(socketService.disconnect).toHaveBeenCalled();
        expect(pendingUploads.clearPendingUploadsStore).toHaveBeenCalled();
      });
    });
  });

  describe('navigation reset on logout', () => {
    it('should not throw when logout is called', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      // Logout should not throw
      await expect(
        act(async () => {
          fireEvent.press(getByTestId('logout-button'));
        })
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle clearAllTokens failure gracefully', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.clearAllTokens.mockRejectedValue(new Error('Storage error'));

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      // Should not throw even if clearAllTokens fails
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
      });

      // Should still be logged out in state
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
      });
    });
  });

  describe('multiple logout calls', () => {
    it('should handle multiple logout calls gracefully', async () => {
      tokenStore.getAccessToken.mockResolvedValue('test-token');
      tokenStore.hasStoredTokens.mockResolvedValue(true);
      tokenStore.getUserData.mockResolvedValue({ email: 'test@example.com' });

      const { getByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('auth-status')).toBeTruthy();
      });

      // Call logout multiple times
      await act(async () => {
        fireEvent.press(getByTestId('logout-button'));
        fireEvent.press(getByTestId('logout-button'));
      });

      // Should still work correctly
      await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('not-authenticated');
      });
    });
  });
});
