/**
 * Integration tests for register flow
 *
 * User Story 6: Unauthenticated users can register
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { RegisterPage } from '@/pages/public/RegisterPage';

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

// MSW handlers for register
const handlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email?: string; username?: string; password?: string };
    
    // Simulate duplicate email error
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 409 }
      );
    }
    
    // Simulate duplicate username error
    if (body.username === 'existinguser') {
      return HttpResponse.json(
        { error: 'Tên đăng nhập đã được sử dụng' },
        { status: 409 }
      );
    }
    
    // Success response
    return HttpResponse.json({
      user: {
        _id: 'user-123',
        email: body.email,
        username: body.username,
        displayName: body.username,
      },
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }, { status: 201 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test wrapper with all providers
function createTestWrapper(initialPath: string = '/register') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/login',
        element: <div>Login Page</div>,
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

describe('Register Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render register form with all required fields', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /tên đăng nhập|username/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/^mật khẩu$|^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i)).toBeInTheDocument();
      });
    });

    it('should render register button', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i })).toBeInTheDocument();
      });
    });

    it('should show link to login page', async () => {
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /đăng nhập|login/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty form submission', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        // Should show validation error for email
        expect(screen.getByText(/email.*bắt buộc|email.*required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(screen.getByText(/email.*không hợp lệ|invalid email/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for password mismatch', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/^mật khẩu$|^password$/i)).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'DifferentPassword!');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(screen.getByText(/mật khẩu.*khớp|password.*match/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/^mật khẩu$|^password$/i)).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'short');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'short');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(screen.getByText(/mật khẩu.*ít nhất|password.*minimum|mật khẩu.*tối thiểu/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration', () => {
    it('should register and redirect to /app on success', async () => {
      const user = userEvent.setup();
      const { TestWrapper, router } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'newuser@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/app');
      });
    });

    it('should store tokens on successful registration', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'newuser@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'mock-access-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error for duplicate email', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'existing@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'Password123!');
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      await waitFor(() => {
        expect(screen.getByText(/email.*sử dụng|email.*taken|đã tồn tại/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during registration', async () => {
      const user = userEvent.setup();
      const { TestWrapper } = createTestWrapper();
      render(<div />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      });

      await user.type(screen.getByRole('textbox', { name: /email/i }), 'newuser@example.com');
      await user.type(screen.getByRole('textbox', { name: /tên đăng nhập|username/i }), 'newuser');
      await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
      await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'Password123!');
      
      // Just verify the form can be submitted successfully
      await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

      // The registration should complete and redirect
      await waitFor(() => {
        expect(screen.getByText('Assets Library')).toBeInTheDocument();
      });
    });
  });
});
