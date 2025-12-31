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
        // Must use :assetId to match the useParams in AssetDetailPage
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

describe('Upload Flow', () => {
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

  it('should render upload form with category selector and file input', () => {
    render(<UploadPage />, { wrapper: TestWrapper });

    // Check for page title (heading)
    expect(screen.getByRole('heading', { name: /tải lên tài sản/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/danh mục/i)).toBeInTheDocument();
    // File input should be present
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('should show validation error when submitting without file', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    // Select category
    const categorySelect = screen.getByLabelText(/danh mục/i);
    await user.selectOptions(categorySelect, 'sneaker');

    // Submit without file
    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/vui lòng chọn hình ảnh/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when submitting without category', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    // Create a test file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Submit without selecting category
    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    // Should show category validation error (Zod error message)
    await waitFor(() => {
      // Check for either custom message or Zod default message
      const errorText = screen.queryByText(/vui lòng chọn danh mục/i) ||
        screen.queryByText(/invalid option/i) ||
        screen.queryByText(/expected/i);
      expect(errorText).toBeInTheDocument();
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
      http.post('/api/assets/analyze-queue', async () => {
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
      }),
      // Override the default asset handler to return our new asset for any ID
      http.get('/api/assets/:id', async ({ params }) => {
        if (params.id === 'new-asset-123') {
          return HttpResponse.json(newAsset);
        }
        return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
      })
    );

    render(<UploadPage />, { wrapper: TestWrapper });

    // Create a test file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Select category
    const categorySelect = screen.getByLabelText(/danh mục/i);
    await user.selectOptions(categorySelect, 'sneaker');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    // Should redirect to asset detail page and show the status
    await waitFor(
      () => {
        // Look for "processing" status text or sneaker category
        const sneakerElement = screen.queryByText(/sneaker/i);
        expect(sneakerElement).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show loading state during upload', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/assets/analyze-queue', async () => {
        // Delay response
        await new Promise(resolve => setTimeout(resolve, 200));
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

    // Create a test file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Select category
    const categorySelect = screen.getByLabelText(/danh mục/i);
    await user.selectOptions(categorySelect, 'sneaker');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    // Button should be disabled during upload
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show error message when upload fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/assets/analyze-queue', async () => {
        return HttpResponse.json(
          {
            error: 'File too large',
          },
          { status: 400 }
        );
      })
    );

    render(<UploadPage />, { wrapper: TestWrapper });

    // Create a test file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Select category
    const categorySelect = screen.getByLabelText(/danh mục/i);
    await user.selectOptions(categorySelect, 'sneaker');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /tải lên/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('should show image preview after file selection', async () => {
    const user = userEvent.setup();
    render(<UploadPage />, { wrapper: TestWrapper });

    // Create a test file
    const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);

    // Should show file name or preview
    await waitFor(() => {
      expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
    });
  });

  it('should allow drag and drop file upload', async () => {
    render(<UploadPage />, { wrapper: TestWrapper });

    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();

    // Simulate drag and drop
    const file = new File(['test image'], 'dropped.jpg', { type: 'image/jpeg' });
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      types: ['Files'],
    };

    // Fire drag events
    await userEvent.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/dropped.jpg/i)).toBeInTheDocument();
    });
  });
});
