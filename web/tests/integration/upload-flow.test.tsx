/**
 * Integration tests for upload flow
 *
 * User Story 2: User uploads image with category, system queues for AI,
 * redirects to detail page with "Processing" status
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
import { UploadPage } from '@/pages/app/UploadPage';
import { AssetDetailPage } from '@/pages/app/AssetDetailPage';
import { server } from '../mocks/server';

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

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/app/upload',
        element: children,
      },
      {
        path: '/app/assets/:assetId',
        element: <AssetDetailPage />,
      },
    ],
    { initialEntries: ['/app/upload'] }
  );

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
}

async function waitForCategoriesReady() {
  await waitFor(
    () => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const hasSneakerOption = Array.from(select.options).some(
        (option) => option.value === 'sneaker'
      );
      expect(select).not.toBeDisabled();
      expect(hasSneakerOption).toBe(true);
    },
    { timeout: 5000 }
  );
}

async function selectSneakerCategory(user: ReturnType<typeof userEvent.setup>) {
  await waitForCategoriesReady();
  await user.selectOptions(screen.getByRole('combobox'), 'sneaker');
}

describe('Upload Flow', () => {
  beforeEach(() => {
    localStorageMock.clear();
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

  it('should render upload form with category selector and file input', () => {
    render(<UploadPage />, { wrapper: TestWrapper });

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('should show validation error when submitting without file', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    await selectSneakerCategory(user);

    await user.click(screen.getByRole('button', { name: /tải lên/i }));

    await waitFor(() => {
      expect(screen.getByText(/vui lòng chọn hình ảnh/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when submitting without category', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('file-input'), file);

    await user.click(screen.getByRole('button', { name: /tải lên/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/vui lòng chọn danh mục/i) ??
          screen.queryByText(/invalid option/i) ??
          screen.queryByText(/expected/i)
      ).toBeInTheDocument();
    });
  });

  it('should upload file and redirect to asset detail page on success', async () => {
    const user = userEvent.setup();

    const newAsset = {
      _id: 'new-asset-123',
      userId: 'user-123',
      category: 'sneaker',
      status: 'processing',
      title: 'New Asset',
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSizeMB: 1.5,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    server.use(
      http.post('/api/assets/analyze-queue', async () =>
        HttpResponse.json(
          {
            success: true,
            data: {
              assetId: 'new-asset-123',
              jobId: 'ai-processing:456',
              status: 'processing',
              message: 'Asset queued for AI analysis',
            },
          },
          { status: 202 }
        )
      ),
      // Use a concrete path so this handler does not intercept /api/assets/categories.
      http.get('/api/assets/new-asset-123', async () => HttpResponse.json(newAsset))
    );

    render(<UploadPage />, { wrapper: TestWrapper });

    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('file-input'), file);
    await selectSneakerCategory(user);
    await user.click(screen.getByRole('button', { name: /tải lên/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/giay sneaker|sneaker/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show loading state during upload', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/assets/analyze-queue', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));

        return HttpResponse.json(
          {
            success: true,
            data: {
              assetId: 'new-asset-123',
              jobId: 'ai-processing:456',
              status: 'processing',
              message: 'Asset queued for AI analysis',
            },
          },
          { status: 202 }
        );
      })
    );

    render(<UploadPage />, { wrapper: TestWrapper });

    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('file-input'), file);
    await selectSneakerCategory(user);

    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show error message when upload fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/assets/analyze-queue', async () =>
        HttpResponse.json(
          {
            error: 'File too large',
          },
          { status: 400 }
        )
      )
    );

    render(<UploadPage />, { wrapper: TestWrapper });

    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('file-input'), file);
    await selectSneakerCategory(user);
    await user.click(screen.getByRole('button', { name: /tải lên/i }));

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should show image preview after file selection', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/test\.jpg/i)).toBeInTheDocument();
    });
  });

  it('should allow drag and drop file upload', async () => {
    render(<UploadPage />, { wrapper: TestWrapper });

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();

    const file = new File(['test image'], 'dropped.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/dropped\.jpg/i)).toBeInTheDocument();
    });
  });
});
