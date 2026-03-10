/**
 * AssetDetailScreen Tests
 *
 * Component tests for asset detail screen:
 * - Status-based rendering (Ready/Processing/Failed/Partial/Archived)
 * - Image toggle (Processed/Original)
 * - Archive action
 * - Retry action
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AssetDetailScreen from './AssetDetailScreen';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import * as assetsApi from '../../api/assetsApi';
import { useSocket } from '../../contexts/SocketContext';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
jest.mock('../../contexts/ToastContext');
jest.mock('../../contexts/SocketContext');
jest.mock('../../api/assetsApi');

const mockAssets = {
  ready: {
    id: 'asset-ready',
    title: 'Jordan Air 1 High',
    status: 'active',
    category: 'sneakers',
    primaryImage: { url: 'https://example.com/original.jpg' },
    processedImage: { url: 'https://example.com/processed.jpg' },
    aiAnalysis: {
      condition: 'Excellent',
      estimatedValue: '$450',
      authenticity: 'Verified',
      details: { brand: 'Nike', model: 'Air Jordan 1', colorway: 'Chicago' },
    },
    createdAt: '2024-01-15T10:00:00Z',
  },
  processing: {
    id: 'asset-processing',
    title: 'Yeezy Boost 350',
    status: 'processing',
    category: 'sneakers',
    primaryImage: { url: 'https://example.com/original.jpg' },
    processedImage: null,
    aiAnalysis: null,
    createdAt: '2024-01-14T09:00:00Z',
  },
  failed: {
    id: 'asset-failed',
    title: 'Failed Asset',
    status: 'failed',
    category: 'sneakers',
    primaryImage: { url: 'https://example.com/original.jpg' },
    processedImage: null,
    aiAnalysis: null,
    error: 'Image quality too low for analysis',
    createdAt: '2024-01-13T08:00:00Z',
  },
  partial: {
    id: 'asset-partial',
    title: 'Partial Asset',
    status: 'partial',
    category: 'sneakers',
    primaryImage: { url: 'https://example.com/original.jpg' },
    processedImage: { url: 'https://example.com/processed.jpg' },
    aiAnalysis: {
      condition: 'Good',
      estimatedValue: null, // Some fields missing
      authenticity: 'Unknown',
    },
    createdAt: '2024-01-12T07:00:00Z',
  },
  archived: {
    id: 'asset-archived',
    title: 'Archived Asset',
    status: 'archived',
    category: 'sneakers',
    primaryImage: { url: 'https://example.com/original.jpg' },
    processedImage: { url: 'https://example.com/processed.jpg' },
    aiAnalysis: { condition: 'Fair' },
    createdAt: '2024-01-11T06:00:00Z',
  },
};

describe('AssetDetailScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });
    
    useToast.mockReturnValue(mockToast);
    useSocket.mockReturnValue({ onAssetProcessed: jest.fn(() => () => {}) });
  });

  describe('Status: Ready (active)', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-ready' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.ready);
    });

    it('should render asset title', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });
    });

    it('should show Ready status pill', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sẵn sàng')).toBeTruthy();
      });
    });

    it('should show AI analysis details', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Xuất sắc/i)).toBeTruthy();
        expect(screen.getByText(/\$450/)).toBeTruthy();
      });
    });

    it('should show image toggle when processed image available', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('image-toggle')).toBeTruthy();
      });
    });

    it('should show Archive button', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('archive-button')).toBeTruthy();
      });
    });
  });

  describe('Status: Processing', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-processing' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.processing);
    });

    it('should show Processing status pill', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Đang xử lý')).toBeTruthy();
      });
    });

    it('should show processing overlay/indicator', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('processing-overlay')).toBeTruthy();
      });
    });

    it('should show processing message', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getAllByText(/đang xử lý|đang phân tích/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should NOT show image toggle', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Đang xử lý')).toBeTruthy();
      });

      expect(screen.queryByTestId('image-toggle')).toBeNull();
    });
  });

  describe('Status: Failed', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-failed' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.failed);
    });

    it('should show Failed status pill', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Thất bại')).toBeTruthy();
      });
    });

    it('should show error message', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText(/quality.*low|too.*low/i)).toBeTruthy();
      });
    });

    it('should show Retry button', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('should call retry API when Retry pressed', async () => {
      assetsApi.retryAsset.mockResolvedValue({ ...mockAssets.failed, status: 'processing' });
      
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(assetsApi.retryAsset).toHaveBeenCalledWith('asset-failed');
      });
    });
  });

  describe('Status: Partial', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-partial' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.partial);
    });

    it('should show Partial status pill', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Một phần')).toBeTruthy();
      });
    });

    it('should show partial analysis warning', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getAllByText(/một phần|không đầy đủ/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should show available analysis data', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Tốt/)).toBeTruthy();
      });
    });
  });

  describe('Status: Archived', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-archived' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.archived);
    });

    it('should show Archived status pill', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Đã lưu trữ')).toBeTruthy();
      });
    });

    it('should show archived indicator', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getAllByText(/đã lưu trữ/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Archive Action', () => {
    beforeEach(() => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-ready' } });
      assetsApi.getAsset.mockResolvedValue(mockAssets.ready);
      assetsApi.archiveAsset.mockResolvedValue({ ...mockAssets.ready, status: 'archived' });
    });

    it('should call archive API when Archive pressed', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('archive-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('archive-button'));

      // Should show confirmation or directly archive
      await waitFor(() => {
        expect(assetsApi.archiveAsset).toHaveBeenCalledWith('asset-ready');
      });
    });

    it('should show success toast after archive', async () => {
      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('archive-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('archive-button'));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching', () => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-ready' } });
      assetsApi.getAsset.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<AssetDetailScreen />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error state when fetch fails', async () => {
      useRoute.mockReturnValue({ params: { assetId: 'asset-invalid' } });
      assetsApi.getAsset.mockRejectedValue(new Error('Asset not found'));

      render(<AssetDetailScreen />);

      await waitFor(() => {
        expect(screen.getAllByText(/lỗi|không thể tải/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
