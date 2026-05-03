import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/AuthContext';
import { AdminRoute } from '@/components/layout/AdminRoute';
import type { AuthContextValue } from '@/types/user';

function renderWithAuth(authValue: AuthContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>Admin Home</div>
                </AdminRoute>
              }
            />
            <Route path="/app" element={<div>App Home</div>} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

const baseAuth: AuthContextValue = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshAccessToken: async () => null,
};

describe('Admin routes', () => {
  it('redirects non-admin users to /app', async () => {
    renderWithAuth({
      ...baseAuth,
      isAuthenticated: true,
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      },
    });

    expect(await screen.findByText('App Home')).toBeInTheDocument();
  });

  it('allows admin users into /admin', async () => {
    renderWithAuth({
      ...baseAuth,
      isAuthenticated: true,
      accessToken: 'token',
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    expect(await screen.findByText('Admin Home')).toBeInTheDocument();
  });
});
