/**
 * SettingsScreen Component Tests
 *
 * Tests for Settings screen showing email + socket state
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';

// Mock contexts
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

describe('SettingsScreen', () => {
  const mockLogout = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue({
      user: { email: 'test@example.com' },
      logout: mockLogout,
    });
    
    useSocket.mockReturnValue({
      connectionState: 'connected',
    });
    
    useToast.mockReturnValue(mockToast);
  });

  describe('user email display', () => {
    it('should display user email when logged in', () => {
      useAuth.mockReturnValue({
        user: { email: 'user@test.com' },
        logout: mockLogout,
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('user@test.com')).toBeTruthy();
    });

    it('should display fallback when no email', () => {
      useAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Not logged in')).toBeTruthy();
    });

    it('should display email label', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Email')).toBeTruthy();
    });
  });

  describe('socket connection state', () => {
    it('should display connected status', () => {
      useSocket.mockReturnValue({
        connectionState: 'connected',
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('connected')).toBeTruthy();
    });

    it('should display disconnected status', () => {
      useSocket.mockReturnValue({
        connectionState: 'disconnected',
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('disconnected')).toBeTruthy();
    });

    it('should display reconnecting status', () => {
      useSocket.mockReturnValue({
        connectionState: 'reconnecting',
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('reconnecting')).toBeTruthy();
    });

    it('should display Realtime Status label', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Realtime Status')).toBeTruthy();
    });
  });

  describe('logout button', () => {
    it('should render logout button', () => {
      const { getByRole } = render(<SettingsScreen />);

      expect(getByRole('button', { name: /log out/i })).toBeTruthy();
    });

    it('should call logout on button press', async () => {
      mockLogout.mockResolvedValue(undefined);

      const { getByRole } = render(<SettingsScreen />);
      const logoutButton = getByRole('button', { name: /log out/i });

      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful logout', async () => {
      mockLogout.mockResolvedValue(undefined);

      const { getByRole } = render(<SettingsScreen />);
      fireEvent.press(getByRole('button', { name: /log out/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
      });
    });

    it('should show error toast on logout failure', async () => {
      mockLogout.mockRejectedValue(new Error('Logout failed'));

      const { getByRole } = render(<SettingsScreen />);
      fireEvent.press(getByRole('button', { name: /log out/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Logout failed');
      });
    });
  });

  describe('sections display', () => {
    it('should show Account section', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Account')).toBeTruthy();
    });

    it('should show Connection section', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Connection')).toBeTruthy();
    });

    it('should show Settings title', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Settings')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessible logout button', () => {
      const { getByRole } = render(<SettingsScreen />);

      const button = getByRole('button', { name: /log out/i });
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Log out');
    });
  });
});
