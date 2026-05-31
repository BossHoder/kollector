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
  { value: 'pending', label: 'Chờ duyệt', hint: 'Cần quản trị viên xem & xử lý' },
  { value: 'approved', label: 'Đã duyệt', hint: 'Đã cấp quyền VIP' },
  { value: 'rejected', label: 'Đã từ chối', hint: 'Đã từ chối kèm lý do' },
  { value: 'expired', label: 'Hết hạn', hint: 'Không còn xử lý được' },
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
      setLoadError('Không tải được danh sách yêu cầu VIP.');
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
      showSuccess('Đã duyệt yêu cầu và làm mới danh sách.');
      await loadRequests();
    },
    onError: () => {
      showError('Không thể duyệt yêu cầu VIP.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      adminRejectUpgradeRequest(requestId, { reason }),
    onSuccess: async (_, variables) => {
      setRejectReasons((current) => ({ ...current, [variables.requestId]: '' }));
      showSuccess('Đã lưu lý do từ chối.');
      await loadRequests();
    },
    onError: () => {
      showError('Không thể từ chối yêu cầu VIP.');
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
      showWarning('Hãy nhập lý do trước khi từ chối yêu cầu này.');
      return;
    }

    rejectMutation.mutate({ requestId, reason });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-dark bg-[radial-gradient(circle_at_top_left,_rgba(37,244,209,0.14),_transparent_38%),linear-gradient(180deg,_rgba(22,40,37,0.98),_rgba(11,22,20,0.98))] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Quản trị • Subscriptions</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Bảng duyệt yêu cầu VIP</h2>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          Đối soát nội dung chuyển khoản, nhìn nhanh chứng từ chưa thuyết phục, và duyệt/từ chối
          ngay trong khu vực quản trị.
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
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Tổng quan</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 md:grid-cols-1">
            <MetricCard label="Yêu cầu" value={String(summary.total)} />
            <MetricCard label="Nâng cấp" value={String(summary.upgrades)} />
            <MetricCard label="Gia hạn" value={String(summary.renewals)} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border-dark bg-surface-dark/80">
        <div className="flex items-center justify-between gap-4 border-b border-border-dark px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Yêu cầu: {labelForStatus(filter)}</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Giữ danh sách gọn và tập trung vào thao tác xử lý.
            </p>
          </div>
          <span className="rounded-full border border-border-dark px-3 py-1 text-sm text-text-secondary">
            {summary.total} mục
          </span>
        </div>

        <div className="space-y-4 p-6">
          {loading ? (
            <p className="text-text-secondary">Đang tải yêu cầu VIP...</p>
          ) : null}
          {loadError ? (
            <p className="text-red-400">{loadError}</p>
          ) : null}
          {!loading && !loadError && requests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-dark bg-[#0d1b19] px-5 py-6 text-sm text-text-secondary">
              Không có yêu cầu ở trạng thái này.
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
                        {labelForRequestType(request.type)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {request.user?.displayName || request.user?.email || request.userId}
                      </h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        {request.user?.email || 'Chưa có email'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoPill label="Nội dung chuyển khoản" value={request.transferReference} mono />
                      <InfoPill
                        label="Gửi lúc"
                        value={formatDateTime(request.submittedAt)}
                      />
                      <InfoPill
                        label="Số tiền"
                        value={formatMoney(request.payment?.amount, request.payment?.currency)}
                      />
                      <InfoPill label="Ngân hàng" value={request.payment?.bankLabel || '—'} />
                      <InfoPill label="Người chuyển (ẩn)" value={request.payment?.payerMask || '—'} />
                      <InfoPill
                        label="Metadata hết hạn"
                        value={formatDateTime(request.metadataExpireAt)}
                      />
                    </div>

                    {request.review?.reviewedAt || request.review?.rejectionReason ? (
                      <div className="rounded-2xl border border-border-dark bg-surface-dark/60 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                          Ghi chú xử lý
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {request.review?.rejectionReason || request.rejectionReason || 'Đã duyệt'}
                        </p>
                        {request.review?.reviewedAt ? (
                          <p className="mt-1 text-xs text-text-secondary">
                            Xử lý lúc {formatDateTime(request.review.reviewedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xl space-y-3 lg:min-w-[320px]">
                    <label className="block text-sm font-medium text-white" htmlFor={`reject-${request.id}`}>
                      Lý do từ chối
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
                      placeholder="Nhập lý do vì sao cần từ chối yêu cầu này"
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
                        Duyệt
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleReject(request.id)}
                        isLoading={busy === 'reject'}
                        disabled={request.status !== 'pending' || Boolean(busy)}
                      >
                        Từ chối
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
      return 'Chờ duyệt';
    case 'approved':
      return 'Đã duyệt';
    case 'rejected':
      return 'Đã từ chối';
    case 'expired':
      return 'Hết hạn';
    default:
      return status;
  }
}

function labelForRequestType(type: UpgradeRequestSummary['type']) {
  switch (type) {
    case 'upgrade':
      return 'nâng cấp';
    case 'renewal':
      return 'gia hạn';
    default:
      return type;
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
    return '—';
  }

  return new Date(value).toLocaleString();
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) {
    return '—';
  }

  return `${amount.toLocaleString()} ${currency || ''}`.trim();
}

export default AdminSubscriptionsPage;
