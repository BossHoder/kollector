import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AssetDetailScreen from './AssetDetailScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import * as assetsApi from '../../api/assetsApi';
import { queueAssetMaintenance } from '../../api/gamification';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../contexts/ToastContext');
jest.mock('../../contexts/SocketContext');
jest.mock('../../api/assetsApi');
jest.mock('../../api/gamification', () => ({
  queueAssetMaintenance: jest.fn(),
}));
jest.mock('../../components/AssetMaintenanceRubMask', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return function MockAssetMaintenanceRubMask({ onMaintain }) {
    return (
      <TouchableOpacity
        testID="maintenance-mask"
        onPress={() => onMaintain({ cleanedPercentage: 90, durationMs: 2200 })}
      >
        <Text>Maintain Asset</Text>
      </TouchableOpacity>
    );
  };
});

describe('AssetDetailScreen maintenance flow', () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({
      goBack: jest.fn(),
      navigate: jest.fn(),
    });
    useRoute.mockReturnValue({
      params: { assetId: 'asset-maintain' },
    });
    useToast.mockReturnValue(mockToast);
    useSocket.mockReturnValue({
      isConnected: true,
      onAssetProcessed: jest.fn(() => () => {}),
    });
  });

  it('renders the maintenance mask for a dusty active asset and queues fire-and-forget sync', async () => {
    assetsApi.getAsset.mockResolvedValue({
      id: 'asset-maintain',
      title: 'Dusty Asset',
      status: 'active',
      category: 'sneaker',
      condition: {
        health: 50,
        maintenanceCount: 0,
      },
      visualLayers: ['dust_medium'],
      version: 1,
      primaryImage: { url: 'https://example.com/original.jpg' },
      processedImage: { url: 'https://example.com/processed.jpg' },
      createdAt: '2024-01-10T10:00:00Z',
    });
    queueAssetMaintenance.mockResolvedValue({
      flushPromise: Promise.resolve([]),
    });

    render(<AssetDetailScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-mask')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('maintenance-mask'));

    await waitFor(() => {
      expect(queueAssetMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: expect.objectContaining({
            id: 'asset-maintain',
          }),
          cleanedPercentage: 90,
          durationMs: 2200,
        })
      );
    });
  });

  it('shows a disabled maintenance message when the asset is not active', async () => {
    assetsApi.getAsset.mockResolvedValue({
      id: 'asset-maintain',
      title: 'Archived Asset',
      status: 'archived',
      category: 'sneaker',
      condition: {
        health: 40,
      },
      primaryImage: { url: 'https://example.com/original.jpg' },
      processedImage: { url: 'https://example.com/processed.jpg' },
      createdAt: '2024-01-10T10:00:00Z',
    });

    render(<AssetDetailScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-disabled-message')).toBeTruthy();
      expect(screen.getByText(/Maintenance is disabled/i)).toBeTruthy();
    });
  });
});
