/**
 * AssetsLibraryScreen Tests
 *
 * Component tests for assets library:
 * - Skeleton loading state
 * - List rendering once data loads
 * - Filter interaction
 * - Empty state
 * - Error state
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import AssetsLibraryScreen from './AssetsLibraryScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as apiClient from '../../services/apiClient';
import { useAssetCategories } from '../../hooks/useAssetCategories';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/apiClient');
jest.mock('../../hooks/useAssetCategories', () => ({
  useAssetCategories: jest.fn(),
}));
jest.mock('../../contexts/PendingUploadContext', () => ({
  usePendingUploadContext: jest.fn(() => ({
    pendingUploads: [],
    retryPendingUpload: jest.fn(),
  })),
}));
jest.mock('../../contexts/SocketContext', () => {
  const mockUseSocket = jest.fn(() => ({
    onAssetProcessed: jest.fn(() => () => {}),
  }));
  return {
    __esModule: true,
    useSocket: mockUseSocket,
    SocketProvider: ({ children }) => children,
    default: {},
  };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockAssets = [
  {
    id: 'asset-1',
    title: 'Jordan Air 1 High',
    status: 'active',
    primaryImage: { url: 'https://example.com/image1.jpg' },
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'asset-2',
    title: 'Yeezy Boost 350',
    status: 'processing',
    primaryImage: { url: 'https://example.com/image2.jpg' },
    createdAt: '2024-01-14T09:00:00Z',
  },
  {
    id: 'asset-3',
    title: 'Nike Dunk Low',
    status: 'draft',
    primaryImage: null,
    createdAt: '2024-01-13T08:00:00Z',
  },
];

describe('AssetsLibraryScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue({
      user: { id: 'user-123' },
      isAuthenticated: true,
    });
    
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });

    useAssetCategories.mockReturnValue({
      categories: [
        { value: 'sneaker', label: 'Giày Sneaker' },
        { value: 'lego', label: 'LEGO' },
        { value: 'camera', label: 'Máy Ảnh' },
        { value: 'other', label: 'Khác', allowCustomValue: true },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Default: successful API response
    apiClient.apiRequest.mockResolvedValue({
      assets: mockAssets,
      pagination: { total: 3, page: 1, limit: 20, totalPages: 1 },
    });
  });

  describe('Loading state', () => {
    it('should render skeleton placeholders while loading', () => {
      // Keep promise pending to test loading state
      apiClient.apiRequest.mockReturnValue(new Promise(() => {}));
      
      render(<AssetsLibraryScreen />);
      
      // Should show skeleton items
      expect(screen.getByTestId('skeleton-loader')).toBeTruthy();
    });

    it('should render multiple skeleton items', () => {
      apiClient.apiRequest.mockReturnValue(new Promise(() => {}));
      
      render(<AssetsLibraryScreen />);
      
      const skeletons = screen.getAllByTestId(/skeleton-item/);
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('List rendering', () => {
    it('should render assets after loading', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      expect(screen.getByText('Yeezy Boost 350')).toBeTruthy();
      expect(screen.getByText('Nike Dunk Low')).toBeTruthy();
    });

    it('should hide skeleton after data loads', async () => {
      render(<AssetsLibraryScreen />);

      // Wait for actual data to appear (proves loading completed)
      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      // Skeleton should be gone once data is rendered
      expect(screen.queryByTestId('skeleton-loader')).toBeNull();
    });

    it('should display correct status for each asset', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sẵn sàng')).toBeTruthy(); // active -> Sẵn sàng
        expect(screen.getByText('Đang xử lý')).toBeTruthy();
        expect(screen.getByText('Bản nháp')).toBeTruthy();
      });
    });

    it('should navigate to asset detail on item press', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      const assetItem = screen.getByText('Jordan Air 1 High');
      fireEvent.press(assetItem);

      expect(mockNavigate).toHaveBeenCalledWith('AssetDetail', { assetId: 'asset-1' });
    });
  });

  describe('Filtering', () => {
    it('should render status and category dropdowns', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('status-dropdown')).toBeTruthy();
        expect(screen.getByTestId('category-dropdown')).toBeTruthy();
      });
    });

    it('should have "All" selected by default', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('status-dropdown').props.accessibilityLabel).toContain('Tất cả');
        expect(screen.getByTestId('category-dropdown').props.accessibilityLabel).toContain('Tất cả danh mục');
      });
    });

    it('should refetch with status filter when dropdown option selected', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      // Clear mock to track next call
      apiClient.apiRequest.mockClear();

      fireEvent.press(screen.getByTestId('status-dropdown'));
      fireEvent.press(screen.getByTestId('filter-active'));

      await waitFor(() => {
        expect(apiClient.apiRequest).toHaveBeenCalledWith(
          expect.stringContaining('status=active')
        );
      });
    });

    it('should show "Processing" status option in dropdown', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('status-dropdown')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('status-dropdown'));

      await waitFor(() => {
        expect(screen.getByTestId('filter-processing')).toBeTruthy();
      });
    });

    it('should refetch with combined status and category filters', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      apiClient.apiRequest.mockClear();

      fireEvent.press(screen.getByTestId('status-dropdown'));
      fireEvent.press(screen.getByTestId('filter-active'));

      fireEvent.press(screen.getByTestId('category-dropdown'));
      fireEvent.press(screen.getByTestId('category-filter-sneaker'));

      await waitFor(() => {
        const calls = apiClient.apiRequest.mock.calls.map((call) => call[0]);
        expect(calls.some((url) => url.includes('status=active') && url.includes('category=sneaker'))).toBe(true);
      });
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no assets returned', async () => {
      apiClient.apiRequest.mockResolvedValue({
        assets: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeTruthy();
      });
    });

    it('should show call-to-action in empty state', async () => {
      apiClient.apiRequest.mockResolvedValue({
        assets: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getAllByText(/tải lên.*đầu tiên/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should navigate to upload on CTA press', async () => {
      apiClient.apiRequest.mockResolvedValue({
        assets: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-state-cta')).toBeTruthy();
      });

      const ctaButton = screen.getByTestId('empty-state-cta');
      fireEvent.press(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith('Upload');
    });
  });

  describe('Error state', () => {
    it('should show error message when fetch fails', async () => {
      apiClient.apiRequest.mockRejectedValue(new Error('Network error'));
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText(/lỗi|không thể/i)).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      apiClient.apiRequest.mockRejectedValue(new Error('Network error'));
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('should refetch when retry button pressed', async () => {
      apiClient.apiRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          assets: mockAssets,
          pagination: { total: 3, page: 1, limit: 20, totalPages: 1 },
        });
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeTruthy();
      });

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });
    });
  });

  describe('Pull to refresh', () => {
    it('should support pull to refresh', async () => {
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      // The RefreshControl should be present
      const list = screen.getByTestId('assets-list');
      expect(list.props.refreshControl || list.props.onRefresh).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    it('should load more when moving to the next page', async () => {
      apiClient.apiRequest
        .mockResolvedValueOnce({
          assets: mockAssets,
          pagination: { total: 6, page: 1, limit: 3, totalPages: 2, nextCursor: 'cursor-page-2', hasMore: true },
        })
        .mockResolvedValueOnce({
          assets: [
            { id: 'asset-4', title: 'Asset 4', status: 'active', primaryImage: null },
          ],
          pagination: { total: 6, page: 2, limit: 3, totalPages: 2, hasMore: false },
        });
      
      render(<AssetsLibraryScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jordan Air 1 High')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Trang sau'));

      await waitFor(() => {
        expect(apiClient.apiRequest).toHaveBeenCalledTimes(2);
      });
    });
  });
});
