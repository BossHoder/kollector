import type { SubscriptionStatus } from '@/types/subscription';

const STATUS_COPY: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30',
  },
  grace_pending_renewal: {
    label: 'Renewal Pending',
    className: 'bg-amber-500/15 text-amber-100 border border-amber-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-rose-500/15 text-rose-100 border border-rose-500/30',
  },
};

export function SubscriptionStateBadge({ status }: { status: SubscriptionStatus }) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.active;

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${copy.className}`}>
      {copy.label}
    </span>
  );
}

export default SubscriptionStateBadge;
