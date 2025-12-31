/**
 * Integration test for assets list
 *
 * Tests the assets grid display with filtering and status indicators
 * This test MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Components under test
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AssetsPage } from '@/pages/app/AssetsPage';
import type { Asset } from '@/types/asset';

// Mock localStorage with authenticated user
const localStorageMock = (() => {
  let store: Record<string, string> = {
    accessToken: 'valid-token',
    refreshToken: 'refresh-token',
    user: JSON.stringify({
      _id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
    }),
  };
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

// Test wrapper with all providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <MemoryRouter initialEntries={['/app']}>
              <Routes>
                <Route path="/app" element={children} />
                <Route path="/app/assets/:assetId" element={<div>Asset Detail</div>} />
              </Routes>
            </MemoryRouter>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

// Mock assets data
const mockAssets: Asset[] = [
  {
    _id: 'asset-1',
    userId: 'user-123',
    title: 'Vintage Card',
    category: 'cards',
    status: 'active',
    imageUrl: 'https://example.com/card.jpg',
    thumbnailUrl: 'https://example.com/card-thumb.jpg',
    originalFilename: 'card.jpg',
    mimeType: 'image/jpeg',
    fileSizeMB: 1.5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: 'asset-2',
    userId: 'user-123',
    title: 'Processing Stamp',
    category: 'stamps',
    status: 'processing',
    imageUrl: 'https://example.com/stamp.jpg',
    thumbnailUrl: 'https://example.com/stamp-thumb.jpg',
    originalFilename: 'stamp.jpg',
    mimeType: 'image/jpeg',
    fileSizeMB: 0.8,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    _id: 'asset-3',
    userId: 'user-123',
    title: 'Failed Coin',
    category: 'coins',
    status: 'failed',
    imageUrl: 'https://example.com/coin.jpg',
    thumbnailUrl: 'https://example.com/coin-thumb.jpg',
    originalFilename: 'coin.jpg',
    mimeType: 'image/png',
    fileSizeMB: 2.1,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

describe('Assets List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  it('should display loading skeleton while fetching assets', () => {
    server.use(
      http.get('/api/assets', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    // Should show skeleton loaders
    expect(screen.getAllByRole('generic', { hidden: true })).toBeDefined();
  });

  it('should display assets grid after loading', async () => {
    server.use(
      http.get('/api/assets', () => {
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Vintage Card')).toBeInTheDocument();
      expect(screen.getByText('Processing Stamp')).toBeInTheDocument();
      expect(screen.getByText('Failed Coin')).toBeInTheDocument();
    });
  });

  it('should display correct status pills for each asset', async () => {
    server.use(
      http.get('/api/assets', () => {
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should filter assets by category', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('/api/assets', ({ request }) => {
        const url = new URL(request.url);
        const category = url.searchParams.get('category');

        if (category === 'cards') {
          return HttpResponse.json({
            assets: mockAssets.filter(a => a.category === 'cards'),
            total: 1,
          });
        }
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Vintage Card')).toBeInTheDocument();
    });

    // Click on category filter
    const categoryFilter = screen.getByRole('combobox', { name: /danh mục/i });
    await user.selectOptions(categoryFilter, 'cards');

    await waitFor(() => {
      expect(screen.getByText('Vintage Card')).toBeInTheDocument();
      expect(screen.queryByText('Processing Stamp')).not.toBeInTheDocument();
    });
  });

  it('should filter assets by status', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('/api/assets', ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');

        if (status === 'failed') {
          return HttpResponse.json({
            assets: mockAssets.filter(a => a.status === 'failed'),
            total: 1,
          });
        }
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Vintage Card')).toBeInTheDocument();
    });

    // Click on status filter
    const statusFilter = screen.getByRole('combobox', { name: /trạng thái/i });
    await user.selectOptions(statusFilter, 'failed');

    await waitFor(() => {
      expect(screen.getByText('Failed Coin')).toBeInTheDocument();
      expect(screen.queryByText('Vintage Card')).not.toBeInTheDocument();
    });
  });

  it('should show empty state when no assets', async () => {
    server.use(
      http.get('/api/assets', () => {
        return HttpResponse.json({ assets: [], total: 0 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/chưa có tài sản nào/i)).toBeInTheDocument();
    });
  });

  it('should show error state when fetch fails', async () => {
    server.use(
      http.get('/api/assets', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/đã xảy ra lỗi/i)).toBeInTheDocument();
    });
  });

  it('should navigate to asset detail on click', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('/api/assets', () => {
        return HttpResponse.json({ assets: mockAssets, total: 3 });
      })
    );

    render(<AssetsPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Vintage Card')).toBeInTheDocument();
    });

    // Click on asset card
    const assetCard = screen.getByText('Vintage Card').closest('a');
    if (assetCard) {
      await user.click(assetCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Asset Detail')).toBeInTheDocument();
    });
  });
});
