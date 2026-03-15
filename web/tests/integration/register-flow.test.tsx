/**
 * Integration tests for register flow
 *
 * User Story 6: Unauthenticated users can register
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { server } from '../mocks/server';

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

function createTestWrapper(initialPath = '/register') {
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

  return {
    router,
    TestWrapper: () => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <RouterProvider router={router} />
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    ),
  };
}

async function fillValidRegisterForm(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByRole('textbox', { name: /email/i }), email);
  await user.type(screen.getByPlaceholderText('username'), 'newuser');
  await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
  await user.type(
    screen.getByLabelText(/xác nhận mật khẩu|confirm password/i),
    'Password123!'
  );
}

describe('Register Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    server.resetHandlers();
  });

  it('should render register form with all required fields', async () => {
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('username')).toBeInTheDocument();
      expect(screen.getByLabelText(/^mật khẩu$|^password$/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/xác nhận mật khẩu|confirm password/i)
      ).toBeInTheDocument();
    });
  });

  it('should render register button', async () => {
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i })
      ).toBeInTheDocument();
    });
  });

  it('should show link to login page', async () => {
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /đăng nhập|login/i })).toBeInTheDocument();
    });
  });

  it('should show validation errors for empty form submission', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/email.*bắt buộc|email.*required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/email.*không hợp lệ|invalid email/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for password mismatch', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByPlaceholderText('username'), 'newuser');
    await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'Password123!');
    await user.type(
      screen.getByLabelText(/xác nhận mật khẩu|confirm password/i),
      'DifferentPassword!'
    );
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/mật khẩu.*khớp|password.*match/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
    await user.type(screen.getByPlaceholderText('username'), 'newuser');
    await user.type(screen.getByLabelText(/^mật khẩu$|^password$/i), 'short');
    await user.type(screen.getByLabelText(/xác nhận mật khẩu|confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/mật khẩu.*ít nhất|password.*minimum|mật khẩu.*tối thiểu/i)
      ).toBeInTheDocument();
    });
  });

  it('should register and redirect to /app on success', async () => {
    const user = userEvent.setup();
    const { TestWrapper, router } = createTestWrapper();
    render(<TestWrapper />);

    await fillValidRegisterForm(user, 'newuser@example.com');
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
    });
  });

  it('should store tokens on successful registration', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();
    render(<TestWrapper />);

    await fillValidRegisterForm(user, 'newuser@example.com');
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'mock-access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token'
      );
    });
  });

  it('should show error for duplicate email', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();

    server.use(
      http.post('/api/auth/register', async () =>
        HttpResponse.json(
          {
            error: 'Email taken',
          },
          { status: 409 }
        )
      )
    );

    render(<TestWrapper />);

    await fillValidRegisterForm(user, 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /đăng ký|register|tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/email taken/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during registration', async () => {
    const user = userEvent.setup();
    const { TestWrapper } = createTestWrapper();

    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        const body = (await request.json()) as { email?: string; username?: string };
        await new Promise((resolve) => setTimeout(resolve, 200));

        return HttpResponse.json(
          {
            user: {
              _id: 'user-123',
              email: body.email,
              username: body.username,
              displayName: body.username,
            },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
          { status: 201 }
        );
      })
    );

    render(<TestWrapper />);

    await fillValidRegisterForm(user, 'newuser@example.com');

    const submitButton = screen.getByRole('button', {
      name: /đăng ký|register|tạo tài khoản/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
