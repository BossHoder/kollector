import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AssetDetailScreen from './AssetDetailScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import * as assetsApi from '../../api/assetsApi';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/ToastContext');
jest.mock('../../contexts/SocketContext');
jest.mock('../../api/assetsApi');
jest.mock('../../api/gamification', () => ({
  queueAssetMaintenance: jest.fn(),
}));
jest.mock('../../components/AssetMaintenanceRubMask', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockAssetMaintenanceRubMask() {
    return <View testID="mock-maintenance-mask" />;
  };
});

const serverShapeAsset = {
  id: 'asset-server-shape',
  title: 'Server Shape Asset',
  status: 'active',
  category: 'sneakers',
  primaryImage: { url: 'https://example.com/original.jpg' },
  processedImage: { url: 'https://example.com/processed.jpg' },
  aiMetadata: {
    brand: { value: 'Nike', confidence: 0.95 },
    model: { value: 'Air Jordan 1', confidence: 0.92 },
    colorway: { value: 'Chicago', confidence: 0.88 },
    rarity: {},
    authenticity: { value: 'Verified', confidence: 0.99 },
  },
  createdAt: '2024-01-10T05:00:00Z',
};

describe('AssetDetailScreen metadata rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({
      goBack: jest.fn(),
      navigate: jest.fn(),
    });

    useRoute.mockReturnValue({
      params: { assetId: 'asset-server-shape' },
    });

    useToast.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    });
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
    });

    useSocket.mockReturnValue({
      onAssetProcessed: jest.fn(() => () => {}),
      onAssetImageEnhanced: jest.fn(() => () => {}),
      isConnected: true,
    });

    assetsApi.getAsset.mockResolvedValue(serverShapeAsset);
  });

  it('renders AI metadata objects as readable text', async () => {
    render(<AssetDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Nike')).toBeTruthy();
      expect(screen.getByText('Air Jordan 1')).toBeTruthy();
      expect(screen.getByText('Chicago')).toBeTruthy();
      expect(screen.getByText('Verified')).toBeTruthy();
    });

    expect(screen.queryByText('[object Object]')).toBeNull();
  });
});
