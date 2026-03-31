import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import * as authApi from '../../api/authApi';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../api/authApi');

describe('SettingsScreen', () => {
  const mockLogout = jest.fn();
  const mockUpdateUser = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: {
        email: 'test@example.com',
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: null,
            },
          },
        },
      },
      logout: mockLogout,
      updateUser: mockUpdateUser,
    });

    useSocket.mockReturnValue({
      connectionState: 'connected',
      isFallbackActive: false,
      reconnectAttempts: 0,
    });

    useToast.mockReturnValue(mockToast);
    authApi.updateDefaultAssetTheme.mockResolvedValue({
      email: 'test@example.com',
      settings: {
        preferences: {
          assetTheme: {
            defaultThemeId: 'vault-graphite',
          },
        },
      },
    });
  });

  it('renders account, theme, and connection sections', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Thông tin tài khoản')).toBeTruthy();
    expect(getByText('Theme tài sản')).toBeTruthy();
    expect(getByText('Trạng thái kết nối')).toBeTruthy();
  });

  it('shows the current user email', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('updates the default asset theme when a preset is pressed', async () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('theme-option-vault-graphite'));

    await waitFor(() => {
      expect(authApi.updateDefaultAssetTheme).toHaveBeenCalledWith('vault-graphite');
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  it('clears the default asset theme', async () => {
    const { getByRole } = render(<SettingsScreen />);

    fireEvent.press(getByRole('button', { name: /xóa theme mặc định/i }));

    await waitFor(() => {
      expect(authApi.updateDefaultAssetTheme).toHaveBeenCalledWith(null);
    });
  });

  it('logs out when the logout button is pressed', async () => {
    mockLogout.mockResolvedValue(undefined);
    const { getByRole } = render(<SettingsScreen />);

    fireEvent.press(getByRole('button', { name: /đăng xuất/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Đã đăng xuất thành công');
    });
  });
});
