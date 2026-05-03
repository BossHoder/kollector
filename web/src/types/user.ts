/**
 * User and Auth types
 * Source: auth.openapi.json
 */

export interface User {
  id: string;
  _id?: string; // MongoDB ObjectId alias
  email: string;
  role: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'deleted';
  username?: string;
  displayName?: string;
  avatar?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string | null;
    bio?: string;
  };
  settings?: {
    preferences?: {
      assetTheme?: {
        defaultThemeId?: string | null;
      };
    };
  };
  gamification?: {
    totalXp: number;
    rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    totalNetWorth: number;
    maintenanceStreak: number;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; username?: string }) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string | null>;
}
