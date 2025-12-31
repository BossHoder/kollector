/**
 * Integration tests for settings and logout
 *
 * User Story 5: User can view settings and logout
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { LoginPage } from '@/pages/public/LoginPage';

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
    getStore: () => store,
    setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test wrapper with all providers
function createTestWrapper(initialPath: string = '/app/settings') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/app/settings',
        element: <SettingsPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/app',
        element: <div>Assets Library</div>,
      },
    ],
    { initialEntries: [initialPath] }
  );

  return { queryClient, router, TestWrapper: ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <RouterProvider router={router} />
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )};
}

describe('Settings Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Simulate authenticated user
    localStorageMock.setStore({
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      user: JSON.stringify({
        _id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      }),
    });
    vi.clearAllMocks();
  });

  describe('User Profile Display', () => {
    it('should display user email on settings page', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/test@example\.com/i)).toBeInTheDocument();
      });
    });

    it('should display username or display name', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should show either username or display name
        const nameElements = screen.getAllByText(/testuser|Test User/i);
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it('should display socket connection status', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Look for connection status indicator (status text like "Đang kết nối...")
        const statusElements = screen.getAllByText(/kết nối/i);
        // Should have at least one element showing connection status
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Logout Flow', () => {
    it('should display logout button', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /đăng xuất|logout/i })).toBeInTheDocument();
      });
    });

    it('should clear tokens on logout', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /đăng xuất|logout/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /đăng xuất|logout/i }));

      await waitFor(() => {
        // Verify tokens are cleared
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      });
    });

    it('should redirect to login page after logout', async () => {
      const user = userEvent.setup();
      const { TestWrapper, router } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /đăng xuất|logout/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /đăng xuất|logout/i }));

      await waitFor(() => {
        // Should redirect to login page
        expect(router.state.location.pathname).toBe('/login');
      });
    });
  });

  describe('Settings Navigation', () => {
    it('should show link back to library', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /thư viện|library|quay lại/i })).toBeInTheDocument();
      });
    });
  });
});
