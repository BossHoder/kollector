import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/contexts/ToastContext';
import { AdminSubscriptionsPage } from '@/pages/admin/AdminSubscriptionsPage';
import type { UpgradeRequestSummary } from '@/types/subscription';

let requestData: UpgradeRequestSummary[] = [
  {
    id: 'req-1',
    userId: 'user-1',
    type: 'upgrade',
    status: 'pending',
    transferReference: 'VIP-REF-001',
    submittedAt: '2026-05-03T10:00:00.000Z',
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    proofFileDeleteAt: null,
    metadataExpireAt: '2026-11-03T10:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'buyer@example.com',
      displayName: 'Buyer One',
      role: 'user',
    },
    payment: {
      amount: 99000,
      currency: 'VND',
      bankLabel: 'VPBANK',
      payerMask: '8938',
    },
    review: {
      reviewedAt: null,
      rejectionReason: null,
      reviewer: null,
    },
  },
];

const apiMocks = vi.hoisted(() => ({
  adminListUpgradeRequests: vi.fn(async (status?: string) => ({
    data: requestData.filter((request) => (status ? request.status === status : true)),
  })),
  adminApproveUpgradeRequest: vi.fn(async (requestId: string) => {
    requestData = requestData.map((request) =>
      request.id === requestId
        ? { ...request, status: 'approved', reviewedAt: '2026-05-03T10:05:00.000Z' }
        : request
    );
    return { data: requestData[0] };
  }),
  adminRejectUpgradeRequest: vi.fn(async (requestId: string, payload: { reason: string }) => {
    requestData = requestData.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status: 'rejected',
            rejectionReason: payload.reason,
            review: {
              reviewedAt: '2026-05-03T10:06:00.000Z',
              rejectionReason: payload.reason,
              reviewer: null,
            },
          }
        : request
    );
    return { data: requestData[0] };
  }),
}));

vi.mock('@/lib/subscriptionApi', () => ({
  adminListUpgradeRequests: apiMocks.adminListUpgradeRequests,
  adminApproveUpgradeRequest: apiMocks.adminApproveUpgradeRequest,
  adminRejectUpgradeRequest: apiMocks.adminRejectUpgradeRequest,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AdminSubscriptionsPage />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('AdminSubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestData = [
      {
        id: 'req-1',
        userId: 'user-1',
        type: 'upgrade',
        status: 'pending',
        transferReference: 'VIP-REF-001',
        submittedAt: '2026-05-03T10:00:00.000Z',
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        proofFileDeleteAt: null,
        metadataExpireAt: '2026-11-03T10:00:00.000Z',
        user: {
          id: 'user-1',
          email: 'buyer@example.com',
          displayName: 'Buyer One',
          role: 'user',
        },
        payment: {
          amount: 99000,
          currency: 'VND',
          bankLabel: 'VPBANK',
          payerMask: '8938',
        },
        review: {
          reviewedAt: null,
          rejectionReason: null,
          reviewer: null,
        },
      },
    ];
  });

  it('loads pending requests and approves one out of the pending view', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(apiMocks.adminApproveUpgradeRequest).toHaveBeenCalledWith('req-1');
      expect(screen.getByText(/No requests in this state\./i)).toBeInTheDocument();
    });
  });

  it('requires a reason before rejecting', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('button', { name: 'Reject' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(apiMocks.adminRejectUpgradeRequest).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/Explain why this transfer/i), 'Reference mismatch');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(apiMocks.adminRejectUpgradeRequest).toHaveBeenCalledWith('req-1', {
        reason: 'Reference mismatch',
      });
    });
  });
});
