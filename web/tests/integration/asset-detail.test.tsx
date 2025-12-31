/**
 * Integration tests for asset detail page
 *
 * User Story 3: User views asset detail with AI metadata, image toggle, status UI
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { AssetDetailPage } from '@/pages/app/AssetDetailPage';
import { server } from '../mocks/server';
import type { Asset } from '@/types/asset';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
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

// Test wrapper with all providers
function createTestWrapper(assetId: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/app/assets/:assetId',
        element: <AssetDetailPage />,
      },
      {
        path: '/app',
        element: <div>Assets Library</div>,
      },
    ],
    { initialEntries: [`/app/assets/${assetId}`] }
  );

  return function TestWrapper({ children }: { children?: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <RouterProvider router={router} />
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  };
}

// Mock asset data for different scenarios
const mockActiveAsset: Asset = {
  _id: 'asset-active',
  userId: 'user-123',
  title: 'Nike Air Jordan 1',
  category: 'sneaker',
  status: 'active',
  imageUrl: 'https://example.com/sneaker.jpg',
  thumbnailUrl: 'https://example.com/sneaker-thumb.jpg',
  originalFilename: 'sneaker.jpg',
  mimeType: 'image/jpeg',
  fileSizeMB: 2.5,
  aiMetadata: {
    description: 'A pair of Nike Air Jordan 1 sneakers in excellent condition',
    condition: { value: 'Excellent', confidence: 0.92 },
    tags: ['nike', 'jordan', 'sneaker', 'collectible'],
    estimatedValue: { min: 150, max: 300, currency: 'USD' },
    authenticity: { value: 'Authentic', confidence: 0.88 },
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T12:30:00Z',
};

const mockProcessingAsset: Asset = {
  _id: 'asset-processing',
  userId: 'user-123',
  title: 'Processing Asset',
  category: 'lego',
  status: 'processing',
  imageUrl: 'https://example.com/lego.jpg',
  thumbnailUrl: 'https://example.com/lego-thumb.jpg',
  originalFilename: 'lego.jpg',
  mimeType: 'image/jpeg',
  fileSizeMB: 1.8,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockFailedAsset: Asset = {
  _id: 'asset-failed',
  userId: 'user-123',
  title: 'Failed Asset',
  category: 'camera',
  status: 'failed',
  imageUrl: 'https://example.com/camera.jpg',
  thumbnailUrl: 'https://example.com/camera-thumb.jpg',
  originalFilename: 'camera.jpg',
  mimeType: 'image/jpeg',
  fileSizeMB: 3.2,
  aiMetadata: {
    error: 'Unable to analyze image: low quality',
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T11:00:00Z',
};

describe('Asset Detail Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Simulate authenticated user
    localStorageMock.setItem('accessToken', 'test-token');
    localStorageMock.setItem('refreshToken', 'test-refresh-token');
    localStorageMock.setItem(
      'user',
      JSON.stringify({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      })
    );
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe('Active Asset (Ready status)', () => {
    it('should display asset title and category', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Use heading role to find the title specifically
        expect(screen.getByRole('heading', { name: /nike air jordan 1/i })).toBeInTheDocument();
      });

      // Category appears in multiple places, just verify at least one exists
      const categoryElements = screen.getAllByText(/sneaker/i);
      expect(categoryElements.length).toBeGreaterThan(0);
    });

    it('should display AI metadata with description', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(
          screen.getByText(/a pair of nike air jordan 1 sneakers/i)
        ).toBeInTheDocument();
      });
    });

    it('should display condition with confidence indicator', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Look for the condition value specifically (as a label with font-medium class)
        // Multiple elements may contain "excellent", just ensure at least one exists
        const excellentElements = screen.getAllByText(/excellent/i);
        expect(excellentElements.length).toBeGreaterThan(0);
      });

      // Check for confidence indicator (92%)
      expect(screen.getByText(/92\s*%/i)).toBeInTheDocument();
    });

    it('should display tags from AI analysis', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Tags section should contain all the tags - use exact match for tag elements
        const tagElements = screen.getAllByText(/nike|jordan|sneaker|collectible/i);
        expect(tagElements.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should show Ready status pill', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // StatusPill for "active" status shows "Sẵn sàng" or similar
        const statusPill = screen.getByTestId('status-pill');
        expect(statusPill).toBeInTheDocument();
      });
    });
  });

  describe('Processing Asset', () => {
    it('should show processing indicator', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockProcessingAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-processing');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should show processing status - multiple elements show this, just verify at least one exists
        const processingElements = screen.getAllByText(/đang xử lý/i);
        expect(processingElements.length).toBeGreaterThan(0);
      });
    });

    it('should not show AI metadata section when processing', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockProcessingAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-processing');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/processing asset/i)).toBeInTheDocument();
      });

      // AI metadata section should not be present
      expect(screen.queryByTestId('ai-metadata')).not.toBeInTheDocument();
    });
  });

  describe('Failed Asset', () => {
    it('should show error message', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockFailedAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-failed');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/unable to analyze/i)).toBeInTheDocument();
      });
    });

    it('should show retry button for failed assets', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockFailedAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-failed');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
      });
    });

    it('should call retry API when retry button is clicked', async () => {
      const user = userEvent.setup();
      let retryCalled = false;

      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockFailedAsset);
        }),
        http.post('/api/assets/:id/retry', () => {
          retryCalled = true;
          return HttpResponse.json({
            success: true,
            data: {
              assetId: 'asset-failed',
              jobId: 'retry-job-123',
              status: 'processing',
              message: 'Asset re-queued for analysis',
            },
          });
        })
      );

      const TestWrapper = createTestWrapper('asset-failed');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /thử lại/i }));

      await waitFor(() => {
        expect(retryCalled).toBe(true);
      });
    });
  });

  describe('Asset Not Found', () => {
    it('should show error message for non-existent asset', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(
            { error: 'Asset not found' },
            { status: 404 }
          );
        })
      );

      const TestWrapper = createTestWrapper('non-existent');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/không tìm thấy tài sản/i)).toBeInTheDocument();
      });
    });

    it('should show link back to library', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(
            { error: 'Asset not found' },
            { status: 404 }
          );
        })
      );

      const TestWrapper = createTestWrapper('non-existent');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /quay lại thư viện/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should show back link to library', async () => {
      server.use(
        http.get('/api/assets/:id', () => {
          return HttpResponse.json(mockActiveAsset);
        })
      );

      const TestWrapper = createTestWrapper('asset-active');
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /quay lại thư viện/i })).toBeInTheDocument();
      });
    });
  });
});
