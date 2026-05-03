import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  adminApproveUpgradeRequest,
  adminListUpgradeRequests,
  adminRejectUpgradeRequest,
} from '@/lib/subscriptionApi';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import type { UpgradeRequestStatus, UpgradeRequestSummary } from '@/types/subscription';

type RequestFilter = 'pending' | 'approved' | 'rejected' | 'expired';

const FILTERS: Array<{ value: RequestFilter; label: string; hint: string }> = [
  { value: 'pending', label: 'Pending', hint: 'Needs admin review' },
  { value: 'approved', label: 'Approved', hint: 'Granted VIP access' },
  { value: 'rejected', label: 'Rejected', hint: 'Rejected with reason' },
  { value: 'expired', label: 'Expired', hint: 'No longer actionable' },
];

export function AdminSubscriptionsPage() {
  const [filter, setFilter] = useState<RequestFilter>('pending');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<UpgradeRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showError, showSuccess, showWarning } = useToast();

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminListUpgradeRequests(filter);
      setRequests(response.data || []);
    } catch (error) {
      setLoadError('Could not load VIP requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => adminApproveUpgradeRequest(requestId),
    onSuccess: async () => {
      showSuccess('The request was approved and the list has been refreshed.');
      await loadRequests();
    },
    onError: () => {
      showError('The VIP request could not be approved.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      adminRejectUpgradeRequest(requestId, { reason }),
    onSuccess: async (_, variables) => {
      setRejectReasons((current) => ({ ...current, [variables.requestId]: '' }));
      showSuccess('The rejection reason has been saved.');
      await loadRequests();
    },
    onError: () => {
      showError('The VIP request could not be rejected.');
    },
  });

  const summary = useMemo(
    () => ({
      total: requests.length,
      upgrades: requests.filter((item) => item.type === 'upgrade').length,
      renewals: requests.filter((item) => item.type === 'renewal').length,
    }),
    [requests]
  );

  const handleReject = (requestId: string) => {
    const reason = (rejectReasons[requestId] || '').trim();
    if (!reason) {
      showWarning('Enter a rejection note before rejecting this transfer.');
      return;
    }

    rejectMutation.mutate({ requestId, reason });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-dark bg-[radial-gradient(circle_at_top_left,_rgba(37,244,209,0.14),_transparent_38%),linear-gradient(180deg,_rgba(22,40,37,0.98),_rgba(11,22,20,0.98))] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Admin subscriptions</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">VIP request review board</h2>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          Review bank transfer references, spot weak proofs quickly, and push clean approve or
          reject decisions without leaving the admin area.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FILTERS.map((item) => {
            const active = item.value === filter;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  'rounded-2xl border p-4 text-left transition',
                  active
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border-dark bg-surface-dark/80 hover:border-primary/30 hover:bg-surface-highlight/50',
                ].join(' ')}
              >
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-text-muted">
                  {item.hint}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border-dark bg-surface-dark/80 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Current view</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 md:grid-cols-1">
            <MetricCard label="Requests" value={String(summary.total)} />
            <MetricCard label="Upgrade" value={String(summary.upgrades)} />
            <MetricCard label="Renewal" value={String(summary.renewals)} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border-dark bg-surface-dark/80">
        <div className="flex items-center justify-between gap-4 border-b border-border-dark px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Requests in {labelForStatus(filter)}</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Keep the admin list tight and action-focused.
            </p>
          </div>
          <span className="rounded-full border border-border-dark px-3 py-1 text-sm text-text-secondary">
            {summary.total} items
          </span>
        </div>

        <div className="space-y-4 p-6">
          {loading ? (
            <p className="text-text-secondary">Loading VIP requests...</p>
          ) : null}
          {loadError ? (
            <p className="text-red-400">{loadError}</p>
          ) : null}
          {!loading && !loadError && requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-dark bg-[#0d1b19] px-5 py-6 text-sm text-text-secondary">
              No requests in this state.
            </p>
          ) : null}

          {requests.map((request) => {
            const rejectReason = rejectReasons[request.id] || '';
            const busy =
              approveMutation.isPending && approveMutation.variables === request.id
                ? 'approve'
                : rejectMutation.isPending && rejectMutation.variables?.requestId === request.id
                  ? 'reject'
                  : null;

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-border-dark bg-[#0d1b19] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeClassForStatus(request.status)}>
                        {labelForStatus(request.status)}
                      </span>
                      <span className="rounded-full border border-border-dark px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary">
                        {request.type}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {request.user?.displayName || request.user?.email || request.userId}
                      </h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        {request.user?.email || 'Unknown email'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoPill label="Transfer Ref" value={request.transferReference} mono />
                      <InfoPill
                        label="Submitted"
                        value={formatDateTime(request.submittedAt)}
                      />
                      <InfoPill
                        label="Payment"
                        value={formatMoney(request.payment?.amount, request.payment?.currency)}
                      />
                      <InfoPill label="Bank" value={request.payment?.bankLabel || 'n/a'} />
                      <InfoPill label="Payer Mask" value={request.payment?.payerMask || 'n/a'} />
                      <InfoPill
                        label="Metadata Expires"
                        value={formatDateTime(request.metadataExpireAt)}
                      />
                    </div>

                    {request.review?.reviewedAt || request.review?.rejectionReason ? (
                      <div className="rounded-2xl border border-border-dark bg-surface-dark/60 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                          Review note
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {request.review?.rejectionReason || request.rejectionReason || 'Approved'}
                        </p>
                        {request.review?.reviewedAt ? (
                          <p className="mt-1 text-xs text-text-secondary">
                            Reviewed {formatDateTime(request.review.reviewedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xl space-y-3 lg:min-w-[320px]">
                    <label className="block text-sm font-medium text-white" htmlFor={`reject-${request.id}`}>
                      Reject reason
                    </label>
                    <textarea
                      id={`reject-${request.id}`}
                      value={rejectReason}
                      onChange={(event) =>
                        setRejectReasons((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Explain why this transfer should be rejected"
                      rows={4}
                      className="w-full rounded-2xl border border-border-dark bg-surface-dark px-4 py-3 text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => approveMutation.mutate(request.id)}
                        isLoading={busy === 'approve'}
                        disabled={request.status !== 'pending' || Boolean(busy)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleReject(request.id)}
                        isLoading={busy === 'reject'}
                        disabled={request.status !== 'pending' || Boolean(busy)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-dark bg-[#0d1b19] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoPill({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-dark bg-surface-dark/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className={['mt-2 text-sm text-white', mono ? 'font-mono' : ''].join(' ').trim()}>{value}</p>
    </div>
  );
}

function labelForStatus(status: UpgradeRequestStatus) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

function badgeClassForStatus(status: UpgradeRequestStatus) {
  switch (status) {
    case 'pending':
      return 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-300';
    case 'approved':
      return 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-emerald-300';
    case 'rejected':
      return 'rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-red-300';
    case 'expired':
      return 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary';
    default:
      return 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary';
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'n/a';
  }

  return new Date(value).toLocaleString();
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) {
    return 'n/a';
  }

  return `${amount.toLocaleString()} ${currency || ''}`.trim();
}

export default AdminSubscriptionsPage;
