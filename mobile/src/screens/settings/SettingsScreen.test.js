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
      isFallbackActive: false,
      reconnectAttempts: 0,
      isConnected: true,
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

      expect(getByText('Chưa đăng nhập')).toBeTruthy();
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

      expect(getByText('Đã kết nối')).toBeTruthy();
    });

    it('should display disconnected status', () => {
      useSocket.mockReturnValue({
        connectionState: 'disconnected',
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Mất kết nối')).toBeTruthy();
    });

    it('should display reconnecting status', () => {
      useSocket.mockReturnValue({
        connectionState: 'reconnecting',
        isFallbackActive: true,
        reconnectAttempts: 2,
        isConnected: false,
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Đang kết nối lại')).toBeTruthy();
    });

    it('should render polling fallback and reconnect attempts', () => {
      useSocket.mockReturnValue({
        connectionState: 'disconnected',
        isFallbackActive: true,
        reconnectAttempts: 4,
        isConnected: false,
      });

      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Đang bật (12s)')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
    });

    it('should display Realtime Status label', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Kết nối realtime')).toBeTruthy();
    });
  });

  describe('logout button', () => {
    it('should render logout button', () => {
      const { getByRole } = render(<SettingsScreen />);

      expect(getByRole('button', { name: /đăng xuất/i })).toBeTruthy();
    });

    it('should call logout on button press', async () => {
      mockLogout.mockResolvedValue(undefined);

      const { getByRole } = render(<SettingsScreen />);
      const logoutButton = getByRole('button', { name: /đăng xuất/i });

      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful logout', async () => {
      mockLogout.mockResolvedValue(undefined);

      const { getByRole } = render(<SettingsScreen />);
      fireEvent.press(getByRole('button', { name: /đăng xuất/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Đã đăng xuất thành công');
      });
    });

    it('should show error toast on logout failure', async () => {
      mockLogout.mockRejectedValue(new Error('Logout failed'));

      const { getByRole } = render(<SettingsScreen />);
      fireEvent.press(getByRole('button', { name: /đăng xuất/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Đăng xuất không thành công');
      });
    });
  });

  describe('sections display', () => {
    it('should show Account section', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Thông tin tài khoản')).toBeTruthy();
    });

    it('should show Connection section', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Trạng thái kết nối')).toBeTruthy();
    });

    it('should show Settings title', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Cài đặt')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessible logout button', () => {
      const { getByRole } = render(<SettingsScreen />);

      const button = getByRole('button', { name: /đăng xuất/i });
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Đăng xuất');
    });
  });
});
