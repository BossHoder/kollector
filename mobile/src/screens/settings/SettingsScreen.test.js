import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as authApi from '../../api/authApi';
import * as subscriptionApi from '../../api/subscriptionApi';
import * as clipboard from '../../services/clipboard';
import * as vipUpgradeSession from '../../services/vipUpgradeSession';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({ isConnected: true })),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../hooks/useRealtimeFallback', () => ({
  useRealtimeFallback: jest.fn(),
}));

jest.mock('../../api/authApi');
jest.mock('../../api/subscriptionApi');
jest.mock('../../services/clipboard');
jest.mock('../../services/vipUpgradeSession');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}), { virtual: true });
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}), { virtual: true });

describe('SettingsScreen', () => {
  const mockLogout = jest.fn();
  const mockUpdateUser = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

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
        gamification: {
          totalXp: 620,
          rank: 'Silver',
          maintenanceStreak: 3,
          badges: ['FIRST_CLEAN'],
        },
      },
      logout: mockLogout,
      updateUser: mockUpdateUser,
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
    authApi.getMe.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      settings: {
        preferences: {
          assetTheme: {
            defaultThemeId: null,
          },
        },
      },
      gamification: {
        totalXp: 620,
        rank: 'Silver',
        maintenanceStreak: 3,
        badges: ['FIRST_CLEAN'],
      },
    });

    subscriptionApi.getSubscriptionStatus.mockResolvedValue({
      data: {
        tier: 'free',
        status: 'active',
        entitlements: {
          assetLimit: 20,
          processingMonthlyLimit: 20,
          maintenanceExpMultiplier: 1,
          priceUsdMonthly: null,
          theme: {
            selectablePresetIds: ['vault-graphite', 'ledger-ivory'],
            lockedPresetIds: [],
          },
        },
        usage: {
          assetUsed: 1,
          assetLimit: 20,
          processingUsed: 2,
          processingLimit: 20,
          processingRemaining: 18,
          nextResetAt: '2026-05-10T00:00:00.000Z',
        },
      },
    });
    subscriptionApi.listUpgradeRequests.mockResolvedValue({ data: [] });
    subscriptionApi.createUpgradeRequest.mockResolvedValue({
      data: {
        id: 'req-1',
        userId: 'user-1',
        type: 'upgrade',
        status: 'pending',
        transferReference: 'VIP-REF',
        submittedAt: '2026-05-03T00:00:00.000Z',
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        proofFileDeleteAt: null,
        metadataExpireAt: '2026-11-03T00:00:00.000Z',
      },
    });
    vipUpgradeSession.getOrCreateVipUpgradeSession.mockResolvedValue({
      reference: 'VIP-1700000000000',
      createdAt: 1_700_000_000_000,
      expiresAt: 1_700_000_900_000,
      lastRefreshedAt: 1_700_000_000_000,
    });
    vipUpgradeSession.refreshVipUpgradeSession.mockResolvedValue({
      refreshed: true,
      retryAfterMs: 0,
      session: {
        reference: 'VIP-1700000030000',
        createdAt: 1_700_000_030_000,
        expiresAt: 1_700_000_930_000,
        lastRefreshedAt: 1_700_000_030_000,
      },
    });
    vipUpgradeSession.clearVipUpgradeSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Date.now.mockRestore();
  });

  async function renderScreen() {
    const view = render(<SettingsScreen />);
    await waitFor(() => {
      expect(subscriptionApi.getSubscriptionStatus).toHaveBeenCalled();
      expect(subscriptionApi.listUpgradeRequests).toHaveBeenCalled();
    });
    return view;
  }

  async function openVipModal(view) {
    fireEvent.press(view.getByTestId('open-vip-upgrade-button'));
    await waitFor(() => {
      expect(view.getByTestId('vip-upgrade-reference-value')).toBeTruthy();
    });
  }

  it('renders account, theme, and vip upgrade sections', async () => {
    const { getByText } = await renderScreen();

    expect(getByText('Thông tin tài khoản')).toBeTruthy();
    expect(getByText('Theme tài sản')).toBeTruthy();
    expect(getByText('Nâng gói VIP')).toBeTruthy();
  });

  it('shows the current user email', async () => {
    const { getByText } = await renderScreen();

    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('shows rank progress, badges, and maintenance streak', async () => {
    const { getByText, getByTestId } = await renderScreen();

    expect(getByText('Rank Silver')).toBeTruthy();
    expect(getByText('620 XP')).toBeTruthy();
    expect(getByTestId('rank-progress-text').props.children).toBe('120/1500 XP để lên Gold');
    expect(getByText('Streak bảo dưỡng: 3 ngày')).toBeTruthy();
    expect(getByText('Lần bảo dưỡng đầu')).toBeTruthy();
  });

  it('refreshes account and subscription state from pull refresh', async () => {
    const { getByTestId } = await renderScreen();
    const scrollView = getByTestId('settings-scroll');

    await act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(authApi.getMe).toHaveBeenCalledTimes(2);
      expect(subscriptionApi.getSubscriptionStatus).toHaveBeenCalledTimes(2);
      expect(subscriptionApi.listUpgradeRequests).toHaveBeenCalledTimes(2);
      expect(mockUpdateUser).toHaveBeenCalled();
    });
  });

  it('updates the default asset theme when a preset is pressed', async () => {
    const { getByTestId } = await renderScreen();

    fireEvent.press(getByTestId('theme-option-vault-graphite'));

    await waitFor(() => {
      expect(authApi.updateDefaultAssetTheme).toHaveBeenCalledWith('vault-graphite');
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  it('clears the default asset theme', async () => {
    const { getByRole } = await renderScreen();

    fireEvent.press(getByRole('button', { name: /xóa giao diện mặc định/i }));

    await waitFor(() => {
      expect(authApi.updateDefaultAssetTheme).toHaveBeenCalledWith(null);
    });
  });

  it('logs out when the logout button is pressed', async () => {
    mockLogout.mockResolvedValue(undefined);
    const { getByRole } = await renderScreen();

    fireEvent.press(getByRole('button', { name: /đăng xuất/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Đã đăng xuất thành công');
    });
  });

  it('opens the vip modal and copies bank transfer details', async () => {
    const { getByTestId, getByText } = await renderScreen();

    await openVipModal({ getByTestId });

    expect(getByText('Nạp tiền qua chuyển khoản')).toBeTruthy();
    expect(getByTestId('vip-upgrade-account-name-value').props.children).toBe('TRUONG THE ANH');
    expect(getByTestId('vip-upgrade-reference-value').props.children).toBe('VIP-1700000000000');

    fireEvent.press(getByTestId('vip-upgrade-reference-copy-button'));

    await waitFor(() => {
      expect(clipboard.copyToClipboard).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Đã sao chép nội dung chuyển khoản');
    });
  });

  it('submits a vip upgrade request from the modal', async () => {
    const { getByTestId } = await renderScreen();

    await openVipModal({ getByTestId });
    fireEvent.press(getByTestId('vip-upgrade-confirm-button'));

    await waitFor(() => {
      expect(subscriptionApi.createUpgradeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upgrade',
          transferReference: 'VIP-1700000000000',
          amount: 99000,
          currency: 'VND',
          bankLabel: 'VPBANK',
          payerMask: '8938',
        })
      );
      expect(vipUpgradeSession.clearVipUpgradeSession).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Chuyển khoản đã được ghi nhận, vui lòng chờ duyệt.'
      );
    });
  });

  it('closes the vip modal without creating a request when cancelled', async () => {
    const { getByTestId, queryByText } = await renderScreen();

    await openVipModal({ getByTestId });
    fireEvent.press(getByTestId('vip-upgrade-cancel-button'));

    expect(subscriptionApi.createUpgradeRequest).not.toHaveBeenCalled();
    expect(queryByText('Nạp tiền qua chuyển khoản')).toBeNull();
  });

  it('reuses the persisted reference when reopening the modal', async () => {
    const { getByTestId } = await renderScreen();

    await openVipModal({ getByTestId });
    fireEvent.press(getByTestId('vip-upgrade-cancel-button'));
    await openVipModal({ getByTestId });

    expect(vipUpgradeSession.getOrCreateVipUpgradeSession).toHaveBeenCalledTimes(2);
    expect(getByTestId('vip-upgrade-reference-value').props.children).toBe('VIP-1700000000000');
  });

  it('refreshes the reference when the cooldown has passed', async () => {
    vipUpgradeSession.getOrCreateVipUpgradeSession.mockResolvedValueOnce({
      reference: 'VIP-1700000000000',
      createdAt: 1_700_000_000_000,
      expiresAt: 1_700_000_900_000,
      lastRefreshedAt: 1_699_999_960_000,
    });
    const { getByTestId } = await renderScreen();

    await openVipModal({ getByTestId });
    fireEvent.press(getByTestId('vip-upgrade-refresh-button'));

    await waitFor(() => {
      expect(vipUpgradeSession.refreshVipUpgradeSession).toHaveBeenCalled();
      expect(getByTestId('vip-upgrade-reference-value').props.children).toBe('VIP-1700000030000');
      expect(mockToast.success).toHaveBeenCalledWith('Đã làm mới mã chuyển khoản');
    });
  });

  it('blocks refreshing the reference during cooldown', async () => {
    vipUpgradeSession.refreshVipUpgradeSession.mockResolvedValueOnce({
      refreshed: false,
      retryAfterMs: 5000,
      session: {
        reference: 'VIP-1700000000000',
        createdAt: 1_700_000_000_000,
        expiresAt: 1_700_000_900_000,
        lastRefreshedAt: 1_700_000_000_000,
      },
    });
    vipUpgradeSession.getOrCreateVipUpgradeSession.mockResolvedValueOnce({
      reference: 'VIP-1700000000000',
      createdAt: 1_700_000_000_000,
      expiresAt: 1_700_000_900_000,
      lastRefreshedAt: 1_699_999_960_000,
    });
    const { getByTestId } = await renderScreen();

    await openVipModal({ getByTestId });
    fireEvent.press(getByTestId('vip-upgrade-refresh-button'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bạn chỉ có thể làm mới mã sau 5 giây nữa');
    });
  });
});
