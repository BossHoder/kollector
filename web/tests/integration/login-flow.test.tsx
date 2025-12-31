/**
 * Integration test for login flow
 *
 * Tests the complete login flow from form submission to redirect
 * This test MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Components under test
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoginPage } from '@/pages/public/LoginPage';

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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={children} />
              <Route path="/app" element={<div>Assets Page</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Login Flow', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    server.resetHandlers();
  });

  it('should render login form with email and password fields', () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty form submission', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: TestWrapper });

    const submitButton = screen.getByRole('button', { name: /đăng nhập/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email không được để trống/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText(/email không hợp lệ/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid credentials and redirect to /app', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/login', async () => {
        return HttpResponse.json({
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            displayName: 'Test User',
            avatar: null,
            assetCount: 5,
            storageUsedMB: 10.5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
        });
      })
    );

    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText('Assets Page')).toBeInTheDocument();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'accessToken',
      'access-token-123'
    );
  });

  it('should show error message for invalid credentials', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/login', async () => {
        return HttpResponse.json(
          { error: 'Email hoặc mật khẩu không chính xác' },
          { status: 401 }
        );
      })
    );

    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email hoặc mật khẩu không chính xác/i)
      ).toBeInTheDocument();
    });
  });

  it('should show loading state during form submission', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/auth/login', async () => {
        // Delay response to show loading state
        await new Promise(resolve => setTimeout(resolve, 200));
        return HttpResponse.json({
          user: { _id: 'user-123', email: 'test@example.com', username: 'test' },
          accessToken: 'token',
          refreshToken: 'refresh',
        });
      })
    );

    render(<LoginPage />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /đăng nhập/i });
    await user.click(submitButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should have link to registration page', () => {
    render(<LoginPage />, { wrapper: TestWrapper });

    const registerLink = screen.getByRole('link', { name: /tạo tài khoản/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
