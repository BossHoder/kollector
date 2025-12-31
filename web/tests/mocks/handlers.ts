import { http, HttpResponse } from 'msw';
import type { User } from '@/types/user';
import type { Asset } from '@/types/asset';

const API_BASE = '/api';

// Mock user data
const mockUser: User = {
  id: 'user-123',
  _id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: undefined,
};

// Mock tokens
const mockAccessToken = 'mock-access-token';
const mockRefreshToken = 'mock-refresh-token';

// Mock assets data
const mockAssets: Asset[] = [
  {
    id: 'asset-1',
    _id: 'asset-1',
    userId: 'user-123',
    title: 'Vintage Card',
    category: 'cards',
    status: 'active',
    imageUrl: 'https://example.com/card.jpg',
    thumbnailUrl: 'https://example.com/card-thumb.jpg',
    originalFilename: 'card.jpg',
    mimeType: 'image/jpeg',
    fileSizeMB: 1.5,
    aiMetadata: {
      description: 'A vintage trading card',
      condition: { value: 'Excellent', confidence: 0.9 },
      tags: ['vintage', 'rare', 'collectible'],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    _id: 'asset-2',
    userId: 'user-123',
    title: 'Processing Stamp',
    category: 'stamps',
    status: 'processing',
    imageUrl: 'https://example.com/stamp.jpg',
    thumbnailUrl: 'https://example.com/stamp-thumb.jpg',
    originalFilename: 'stamp.jpg',
    mimeType: 'image/jpeg',
    fileSizeMB: 0.8,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'asset-3',
    _id: 'asset-3',
    userId: 'user-123',
    title: 'Failed Coin',
    category: 'coins',
    status: 'failed',
    imageUrl: 'https://example.com/coin.jpg',
    thumbnailUrl: 'https://example.com/coin-thumb.jpg',
    originalFilename: 'coin.jpg',
    mimeType: 'image/png',
    fileSizeMB: 2.1,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    }
    
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; username: string; password: string };
    
    // Simulate duplicate email error
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email đã được sử dụng',
          },
        },
        { status: 409 }
      );
    }
    
    // Simulate duplicate username error
    if (body.username === 'existinguser') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Tên đăng nhập đã được sử dụng',
          },
        },
        { status: 409 }
      );
    }
    
    return HttpResponse.json(
      {
        user: {
          _id: 'new-user-123',
          email: body.email,
          username: body.username,
          displayName: body.username,
          avatar: null,
          assetCount: 0,
          storageUsedMB: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  }),

  // Assets handlers
  http.get(`${API_BASE}/assets`, ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '12', 10);
    
    let filteredAssets = [...mockAssets];
    
    if (category) {
      filteredAssets = filteredAssets.filter(a => a.category === category);
    }
    if (status) {
      filteredAssets = filteredAssets.filter(a => a.status === status);
    }
    
    // Page-based pagination
    const startIndex = (page - 1) * limit;
    const assets = filteredAssets.slice(startIndex, startIndex + limit);
    
    return HttpResponse.json({
      assets,
      total: filteredAssets.length,
      page,
      limit,
    });
  }),

  http.get(`${API_BASE}/assets/:id`, ({ params }) => {
    const { id } = params;
    const asset = mockAssets.find(a => a._id === id);
    
    if (!asset) {
      return HttpResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(asset);
  }),

  http.post(`${API_BASE}/assets/analyze-queue`, async () => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          assetId: 'new-asset-id',
          jobId: 'job-123',
          status: 'processing',
          message: 'Asset queued for analysis',
        },
      },
      { status: 202 }
    );
  }),

  http.post(`${API_BASE}/assets/:id/retry`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: {
        assetId: id,
        jobId: 'retry-job-123',
        status: 'processing',
        message: 'Asset re-queued for analysis',
      },
    });
  }),
];
