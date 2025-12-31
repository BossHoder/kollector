/**
 * API Request/Response types
 * Derived from OpenAPI contracts
 */

import type { User } from './user';
import type { Asset, AssetCategory, AssetStatus } from './asset';

// Auth API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

// Assets API types
export interface ListAssetsParams {
  cursor?: string;
  limit?: number; // 1-100, default 20
  category?: AssetCategory;
  status?: AssetStatus;
}

export interface ListAssetsResponse {
  items: Asset[];
  assets?: Asset[]; // Alternative field name used by some endpoints
  nextCursor: string | null;
  total?: number;
}

export type GetAssetResponse = Asset;

export interface AnalyzeQueueResponse {
  success: true;
  data: {
    assetId: string;
    jobId: string;
    status: 'processing';
    message: string;
  };
}

// Error response types
export type ErrorCode = 
  | 'VALIDATION_ERROR' 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'CONFLICT' 
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

// Generic API response wrapper
export type ApiResponse<T> = T | ErrorResponse;
