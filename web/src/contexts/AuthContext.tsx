/**
 * AuthContext Provider
 *
 * Manages authentication state and provides login/logout functionality
 * Uses localStorage for persistence and React Query for server state
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setTokens,
  setStoredUser,
  clearAuthData,
} from '@/lib/auth';
import type { User, AuthContextValue } from '@/types/user';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types/api';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  // State to track current user - initialized from localStorage
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
      return response;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setStoredUser(data.user);
      setUser(data.user);
      queryClient.invalidateQueries();
    },
    onError: () => {
      clearAuthData();
      setUser(null);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await apiClient.post<RegisterResponse>('/api/auth/register', data);
      return response;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setStoredUser(data.user);
      setUser(data.user);
      queryClient.invalidateQueries();
    },
    onError: () => {
      clearAuthData();
      setUser(null);
    },
  });

  // Login handler
  const login = useCallback(
    async (credentials: LoginRequest) => {
      await loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  // Register handler
  const register = useCallback(
    async (data: RegisterRequest) => {
      await registerMutation.mutateAsync(data);
    },
    [registerMutation]
  );

  // Logout handler - clears state and triggers re-render
  const logout = useCallback(() => {
    clearAuthData();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Computed authentication state
  const isAuthenticated = !!getAccessToken() && !!user;
  const isLoading = loginMutation.isPending || registerMutation.isPending;
  const error =
    (loginMutation.error as ApiError | null) ??
    (registerMutation.error as ApiError | null) ??
    null;

  // Reset state if token is missing but user exists (corrupted state)
  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (storedUser && !token) {
      clearAuthData();
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error: error?.message ?? null,
      login,
      register,
      logout,
      accessToken: getAccessToken(),
      refreshToken: getRefreshToken(),
      refreshAccessToken: async () => {
        // Could implement token refresh here
        return getAccessToken();
      },
    }),
    [user, isAuthenticated, isLoading, error, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 *
 * @throws If used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export { AuthContext };
