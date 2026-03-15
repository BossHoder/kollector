import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import AssetDetailScreen from './AssetDetailScreen';
import { useRoute } from '@react-navigation/native';
import * as assetsApi from '../../api/assetsApi';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: jest.fn() })),
  useRoute: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(() => ({ success: jest.fn(), error: jest.fn() })),
}));

jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({ isConnected: true, onAssetProcessed: jest.fn(() => () => {}) })),
}));

jest.mock('../../api/assetsApi');

const baseAsset = {
  id: 'asset-1',
  title: 'State Asset',
  category: 'sneaker',
  primaryImage: { url: 'https://example.com/original.jpg' },
  processedImage: { url: 'https://example.com/processed.jpg' },
  createdAt: '2024-01-10T10:00:00Z',
};

describe('AssetDetailScreen status matrix', () => {
  it.each([
    ['active', 'Sẵn sàng'],
    ['processing', 'Đang xử lý'],
    ['failed', 'Thất bại'],
    ['partial', 'Một phần'],
    ['archived', 'Đã lưu trữ'],
  ])('renders expected status label for %s', async (status, expectedLabel) => {
    useRoute.mockReturnValue({ params: { assetId: 'asset-1' } });
    assetsApi.getAsset.mockResolvedValue({ ...baseAsset, status, error: 'failed reason' });

    render(<AssetDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeTruthy();
    });
  });
});
