import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/contexts/ToastContext';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminOperationsPage } from '@/pages/admin/AdminOperationsPage';

const apiMocks = vi.hoisted(() => ({
  listAdminUsers: vi.fn(async () => ({
    data: {
      items: [
        {
          id: 'user-1',
          email: 'vip@example.com',
          role: 'user',
          status: 'active',
          displayName: 'VIP User',
          avatarUrl: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLoginAt: '2026-05-03T08:00:00.000Z',
          subscription: {
            tier: 'vip',
            status: 'active',
            expiresAt: '2026-06-03T00:00:00.000Z',
            graceEndsAt: null,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    },
  })),
  getAdminUserSummary: vi.fn(async () => ({
    data: {
      user: {
        id: 'user-1',
        email: 'vip@example.com',
        role: 'user',
        status: 'active',
        profile: { displayName: 'VIP User' },
        gamification: {
          totalXp: 1234,
          rank: 'Gold',
          totalNetWorth: 4567,
          maintenanceStreak: 8,
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-05-03T08:00:00.000Z',
      },
      subscription: {
        tier: 'vip',
        status: 'active',
        effectiveAt: '2026-05-01T00:00:00.000Z',
        expiresAt: '2026-06-03T00:00:00.000Z',
        graceEndsAt: null,
        entitlements: {
          assetLimit: 100,
          processingMonthlyLimit: 100,
          maintenanceExpMultiplier: 2,
          priceUsdMonthly: null,
          theme: {
            selectablePresetIds: [],
            lockedPresetIds: [],
          },
        },
        usage: {
          processingUsed: 12,
          processingLimit: 100,
          processingRemaining: 88,
          nextResetAt: '2026-06-01T00:00:00.000Z',
          assetUsed: 4,
          assetLimit: 100,
        },
      },
      recentUpgradeRequests: [
        {
          id: 'req-1',
          userId: 'user-1',
          type: 'upgrade',
          status: 'approved',
          transferReference: 'VIP-REF-001',
          submittedAt: '2026-05-01T00:00:00.000Z',
          reviewedAt: '2026-05-01T01:00:00.000Z',
          reviewedBy: 'admin-1',
          rejectionReason: null,
          proofFileDeleteAt: null,
          metadataExpireAt: '2026-11-01T00:00:00.000Z',
          payment: {
            amount: 99000,
            currency: 'VND',
            bankLabel: 'VPBANK',
            payerMask: '8938',
          },
        },
      ],
    },
  })),
  getAdminQueueStatus: vi.fn(async () => ({
    data: {
      aiProcessing: { waiting: 3, active: 1, completed: 10, failed: 1, delayed: 0, paused: 0 },
      assetEnhancement: {
        waiting: 2,
        active: 1,
        completed: 5,
        failed: 1,
        delayed: 0,
        paused: 0,
      },
      enhancementAck: {
        accepted: 7,
        conflicts: 1,
        failures: 2,
        lastAckDurationMs: 220,
        lastAcceptedAt: '2026-05-03T11:00:00.000Z',
      },
      lastRefreshedAt: '2026-05-03T11:05:00.000Z',
    },
  })),
  getAdminFailedJobs: vi.fn(async () => ({
    data: [
      {
        id: 'job-1',
        queueName: 'ai-processing',
        assetId: 'asset-1',
        userId: 'user-1',
        failureReason: 'Timeout',
        attemptsMade: 3,
        maxAttempts: 3,
        createdAt: '2026-05-03T10:00:00.000Z',
        processedAt: '2026-05-03T10:01:00.000Z',
        failedAt: '2026-05-03T10:02:00.000Z',
      },
    ],
  })),
}));

vi.mock('@/lib/adminApi', () => ({
  listAdminUsers: apiMocks.listAdminUsers,
  getAdminUserSummary: apiMocks.getAdminUserSummary,
  getAdminQueueStatus: apiMocks.getAdminQueueStatus,
  getAdminFailedJobs: apiMocks.getAdminFailedJobs,
}));

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('Admin user and operations pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists users by default and shows subscription/quota snapshot', async () => {
    renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText('Danh sách người dùng')).toBeInTheDocument();
    expect(await screen.findByText('VIP User')).toBeInTheDocument();
    expect(await screen.findByText('Quota xử lý')).toBeInTheDocument();
    expect(screen.getByText('12/100')).toBeInTheDocument();
    expect(screen.getByText('VIP-REF-001')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.listAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });
  });

  it('shows queue metrics and failed jobs on operations page', async () => {
    renderWithProviders(<AdminOperationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Chờ: 3')).toBeInTheDocument();
      expect(screen.getByText('Chấp nhận: 7')).toBeInTheDocument();
      expect(screen.getByText(/Timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/asset-1/i)).toBeInTheDocument();
    });
  });
});
