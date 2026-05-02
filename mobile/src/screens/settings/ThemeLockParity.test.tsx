import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import * as authApi from '../../api/authApi';
import * as subscriptionApi from '../../api/subscriptionApi';

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
jest.mock('../../api/subscriptionApi');

describe('Theme lock parity', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: {
        email: 'vip-locks@example.com',
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: 'vault-graphite',
            },
          },
        },
      },
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    useSocket.mockReturnValue({
      connectionState: 'connected',
      isFallbackActive: false,
      reconnectAttempts: 0,
    });

    useToast.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
    });

    authApi.updateDefaultAssetTheme.mockResolvedValue({
      settings: {
        preferences: {
          assetTheme: {
            defaultThemeId: 'vault-graphite',
          },
        },
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
            lockedPresetIds: ['museum-forest', 'archive-cobalt'],
          },
        },
        usage: {
          assetUsed: 2,
          assetLimit: 20,
          processingUsed: 3,
          processingLimit: 20,
        },
      },
    });

    subscriptionApi.listUpgradeRequests.mockResolvedValue({
      data: [],
    });
  });

  it('shows VIP labels on locked theme presets in settings', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Museum Forest (VIP)')).toBeTruthy();
      expect(getByText('Archive Cobalt (VIP)')).toBeTruthy();
    });
  });
});
