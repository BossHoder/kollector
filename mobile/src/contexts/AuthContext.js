/**
 * Auth Context
 *
 * Provides authentication state and methods across the app:
 * - Login/Register/Logout
 * - Silent token refresh on app startup
 * - User state management
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  setAccessToken,
  setRefreshToken,
  setUserData,
  getUserData,
  clearAllTokens,
  hasStoredTokens,
  getAccessToken,
} from '../services/tokenStore';
import { publicApiRequest, apiRequest } from '../services/apiClient';
import { clearPendingUploadsStore } from '../hooks/usePendingUploads';
import { socketService } from '../services/socketService';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 */

/**
 * @typedef {Object} AuthState
 * @property {boolean} isLoading - Initial auth check in progress
 * @property {boolean} isAuthenticated - User is logged in
 * @property {User | null} user - Current user data
 */

const AuthContext = createContext(null);

function normalizeUser(user, emailFallback = null) {
  if (!user) {
    return null;
  }

  const normalizedUser = {
    ...user,
    id: user.id || user._id || null,
    email: user.email || emailFallback,
  };

  if (user.settings !== undefined) {
    normalizedUser.settings = user.settings;
  }

  if (user.profile !== undefined) {
    normalizedUser.profile = user.profile;
  }

  return normalizedUser;
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  /**
   * Initialize auth state on app startup
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const hasTokens = await hasStoredTokens();

        if (!hasTokens) {
          setState({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
          await clearAllTokens();
          setState({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        const storedUser = await getUserData();

        try {
          const profileResponse = await apiRequest('/auth/me');
          const profile = normalizeUser(
            profileResponse,
            storedUser?.email || null
          ) || normalizeUser(storedUser, storedUser?.email || null);

          if (!profile) {
            throw new Error('Profile payload missing');
          }

          await setUserData(profile);
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: profile,
          });
        } catch (profileError) {
          const fallbackUser = normalizeUser(storedUser, storedUser?.email || null);
          const fallbackToken = await getAccessToken();

          if (fallbackUser && fallbackToken) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              user: fallbackUser,
            });
            return;
          }

          await clearAllTokens();
          setState({ isLoading: false, isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setState({ isLoading: false, isAuthenticated: false, user: null });
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const login = useCallback(async (email, password) => {
    const response = await publicApiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    // Store tokens
    await setAccessToken(response.accessToken);
    await setRefreshToken(response.refreshToken);

    const user = normalizeUser(response.user, email);
    await setUserData(user);

    setState({
      isLoading: false,
      isAuthenticated: true,
      user,
    });
  }, []);

  /**
   * Register a new account
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const register = useCallback(async (email, password) => {
    const response = await publicApiRequest('/auth/register', {
      method: 'POST',
      body: { email, password },
    });

    // Store tokens (if registration auto-logs in)
    if (response.accessToken) {
      await setAccessToken(response.accessToken);
      await setRefreshToken(response.refreshToken);

      const user = normalizeUser(response.user, email);
      await setUserData(user);

      setState({
        isLoading: false,
        isAuthenticated: true,
        user,
      });
    }
  }, []);

  /**
   * Logout - clear tokens and reset state
   */
  const logout = useCallback(async () => {
    // Optionally notify server of logout
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors - still clear local state
    }

    try {
      await clearAllTokens();
    } catch {
      // Ignore storage errors - still clear in-memory state
    }
    socketService.disconnect();
    clearPendingUploadsStore();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });
  }, []);

  /**
   * Update user data locally
   * @param {Partial<User>} updates
   */
  const updateUser = useCallback(async (updates) => {
    setState((prev) => {
      const nextUser = typeof updates === 'function'
        ? updates(prev.user)
        : { ...(prev.user || {}), ...updates };
      const newUser = normalizeUser(nextUser, prev.user?.email || null);
      setUserData(newUser); // Fire and forget
      return { ...prev, user: newUser };
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateUser,
    }),
    [state, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state and methods
 * @returns {{
 *   isLoading: boolean,
 *   isAuthenticated: boolean,
 *   user: User | null,
 *   login: (email: string, password: string) => Promise<void>,
 *   register: (email: string, password: string) => Promise<void>,
 *   logout: () => Promise<void>,
 *   updateUser: (updates: Partial<User>) => Promise<void>,
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
