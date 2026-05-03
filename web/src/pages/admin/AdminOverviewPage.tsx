import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminOverview } from '@/lib/adminApi';

const cardLinks = [
  { key: 'pendingVipRequests', label: 'Yêu cầu VIP đang chờ', href: '/admin/subscriptions' },
  { key: 'activeVipUsers', label: 'Người dùng VIP đang hoạt động', href: '/admin/users' },
  { key: 'queue', label: 'Queue chờ / đang xử lý', href: '/admin/operations' },
  { key: 'failedJobsCount', label: 'Công việc lỗi', href: '/admin/operations' },
] as const;

export function AdminOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
  });

  const overview = overviewQuery.data?.data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-dark bg-[radial-gradient(circle_at_top_left,_rgba(37,244,209,0.18),_transparent_38%),linear-gradient(180deg,_rgba(22,40,37,0.98),_rgba(11,22,20,0.98))] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Tổng quan Admin</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Toàn cảnh vận hành</h2>
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Xem nhanh hàng chờ duyệt VIP, nhịp xử lý Queue và số công việc lỗi để điều phối
          support trong ngày.
        </p>
      </section>

      {overviewQuery.isLoading ? <p className="text-text-secondary">Đang tải tổng quan...</p> : null}
      {overviewQuery.isError ? (
        <p className="text-red-400">Không thể tải dữ liệu tổng quan Admin.</p>
      ) : null}

      {overview ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cardLinks.map((card) => {
            const value =
              card.key === 'queue'
                ? `${overview.queue.waiting} / ${overview.queue.active}`
                : overview[card.key];

            return (
              <Link
                key={card.key}
                to={card.href}
                className="rounded-2xl border border-border-dark bg-surface-dark/80 p-5 transition hover:border-primary/40 hover:bg-surface-highlight/80"
              >
                <p className="text-sm text-text-secondary">{card.label}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-primary/70">
                  Mở trang
                </p>
              </Link>
            );
          })}
        </section>
      ) : null}

      {overview?.lastRefreshedAt ? (
        <p className="text-sm text-text-muted">
          Cập nhật lần cuối {new Date(overview.lastRefreshedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

export default AdminOverviewPage;
