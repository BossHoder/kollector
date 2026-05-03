import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAdminUserSummary, listAdminUsers } from '@/lib/adminApi';
import type { AdminUserSummaryResponse } from '@/types/admin';
import type { UpgradeRequestSummary } from '@/types/subscription';
import type { User } from '@/types/user';

const PAGE_SIZE = 20;

type RoleFilter = 'all' | 'user' | 'admin';
type AccountStatusFilter = 'all' | 'active' | 'suspended' | 'deleted';
type TierFilter = 'all' | 'vip' | 'free' | 'none';
type SubscriptionStatusFilter = 'all' | 'active' | 'grace_pending_renewal' | 'expired' | 'none';

export function AdminUsersPage() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<AccountStatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] =
    useState<SubscriptionStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [keyword]);

  const usersQuery = useQuery({
    queryKey: [
      'admin-users',
      debouncedKeyword,
      roleFilter,
      accountStatusFilter,
      tierFilter,
      subscriptionStatusFilter,
      page,
    ],
    queryFn: () =>
      listAdminUsers({
        email: debouncedKeyword || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        accountStatus: accountStatusFilter === 'all' ? undefined : accountStatusFilter,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        subscriptionStatus:
          subscriptionStatusFilter === 'all' ? undefined : subscriptionStatusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const items = usersQuery.data?.data.items ?? [];
  const pagination = usersQuery.data?.data.pagination;

  useEffect(() => {
    if (!items.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((current) => (items.some((item) => item.id === current) ? current : items[0].id));
  }, [items]);

  const userSummaryQuery = useQuery({
    queryKey: ['admin-user-summary', selectedUserId],
    queryFn: () => getAdminUserSummary(selectedUserId as string),
    enabled: Boolean(selectedUserId),
  });

  const resetFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setRoleFilter('all');
    setAccountStatusFilter('all');
    setTierFilter('all');
    setSubscriptionStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-dark bg-surface-dark/80 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Người dùng</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Quản lý người dùng</h2>
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          Trang này ưu tiên kiểu quản trị hiện đại: danh sách toàn bộ người dùng, bộ lọc hoạt động
          trực tiếp trên dữ liệu phân trang, và khung chi tiết cố định để hỗ trợ xử lý nhanh.
        </p>

        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_180px_180px_180px_220px_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-2xl border border-border-dark bg-[#0d1b19] px-4 py-3 text-white"
            placeholder="Tìm theo Email"
          />
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as RoleFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-border-dark bg-[#0d1b19] px-4 py-3 text-white"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={accountStatusFilter}
            onChange={(event) => {
              setAccountStatusFilter(event.target.value as AccountStatusFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-border-dark bg-[#0d1b19] px-4 py-3 text-white"
          >
            <option value="all">Mọi trạng thái TK</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Tạm khóa</option>
            <option value="deleted">Đã xóa</option>
          </select>
          <select
            value={tierFilter}
            onChange={(event) => {
              setTierFilter(event.target.value as TierFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-border-dark bg-[#0d1b19] px-4 py-3 text-white"
          >
            <option value="all">Mọi gói</option>
            <option value="vip">VIP</option>
            <option value="free">Free</option>
            <option value="none">Chưa có</option>
          </select>
          <select
            value={subscriptionStatusFilter}
            onChange={(event) => {
              setSubscriptionStatusFilter(event.target.value as SubscriptionStatusFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-border-dark bg-[#0d1b19] px-4 py-3 text-white"
          >
            <option value="all">Mọi trạng thái gói</option>
            <option value="active">Đang hoạt động</option>
            <option value="grace_pending_renewal">Grace period</option>
            <option value="expired">Hết hạn</option>
            <option value="none">Chưa có</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-border-dark px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary/40 hover:text-white"
          >
            Xóa lọc
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <section className="overflow-hidden rounded-3xl border border-border-dark bg-surface-dark/80">
          <div className="flex items-center justify-between border-b border-border-dark px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Danh sách người dùng</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Giữ nguyên các thuật ngữ quản trị cần thiết như Admin, VIP, Email.
              </p>
            </div>
            {pagination ? (
              <span className="rounded-full border border-border-dark px-3 py-1 text-sm text-text-secondary">
                {pagination.total.toLocaleString()} người dùng
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#0d1b19] text-text-secondary">
                <tr>
                  <th className="px-5 py-4 font-medium">Người dùng</th>
                  <th className="px-5 py-4 font-medium">Vai trò</th>
                  <th className="px-5 py-4 font-medium">Gói</th>
                  <th className="px-5 py-4 font-medium">Trạng thái gói</th>
                  <th className="px-5 py-4 font-medium">Trạng thái TK</th>
                  <th className="px-5 py-4 font-medium">Lần đăng nhập cuối</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td className="px-5 py-8 text-text-secondary" colSpan={6}>
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : null}
                {usersQuery.isError ? (
                  <tr>
                    <td className="px-5 py-8 text-red-400" colSpan={6}>
                      Không thể tải danh sách người dùng.
                    </td>
                  </tr>
                ) : null}
                {!usersQuery.isLoading && items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-text-secondary" colSpan={6}>
                      Không có người dùng phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : null}
                {items.map((item) => {
                  const selected = item.id === selectedUserId;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedUserId(item.id)}
                      className={[
                        'cursor-pointer border-t border-border-dark transition-colors',
                        selected ? 'bg-surface-highlight/70' : 'hover:bg-surface-highlight/40',
                      ].join(' ')}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-white">
                          {item.displayName || item.email}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">{item.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={getRoleBadgeClass(item.role)}>{item.role}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={getTierBadgeClass(item.subscription?.tier)}>{item.subscription?.tier || 'n/a'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={getSubscriptionBadgeClass(item.subscription?.status)}>
                          {formatSubscriptionStatus(item.subscription?.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-secondary">
                        {formatAccountStatus(item.status)}
                      </td>
                      <td className="px-5 py-4 text-text-secondary">
                        {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Chưa đăng nhập'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination ? (
            <div className="flex flex-col gap-3 border-t border-border-dark px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-secondary">
                Trang {pagination.page}/{pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={pagination.page <= 1}
                  className="rounded-xl border border-border-dark px-4 py-2 text-sm text-text-secondary transition hover:border-primary/40 hover:text-white disabled:opacity-50"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, pagination.totalPages))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-xl border border-border-dark px-4 py-2 text-sm text-text-secondary transition hover:border-primary/40 hover:text-white disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-border-dark bg-surface-dark/80 p-6">
          {userSummaryQuery.isLoading ? (
            <p className="text-text-secondary">Đang tải hồ sơ người dùng...</p>
          ) : null}
          {userSummaryQuery.isError ? (
            <p className="text-red-400">Không thể tải hồ sơ người dùng.</p>
          ) : null}
          {!selectedUserId && !userSummaryQuery.isLoading ? (
            <p className="text-text-secondary">Chọn một người dùng trong bảng để xem chi tiết.</p>
          ) : null}
          {userSummaryQuery.data?.data ? (
            <AdminUserSummaryPanel
              user={userSummaryQuery.data.data.user}
              subscription={userSummaryQuery.data.data.subscription}
              recentRequests={userSummaryQuery.data.data.recentUpgradeRequests}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AdminUserSummaryPanel({
  user,
  subscription,
  recentRequests,
}: {
  user: User;
  subscription: AdminUserSummaryResponse['data']['subscription'];
  recentRequests: UpgradeRequestSummary[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Chi tiết người dùng</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">
          {user.profile?.displayName || user.displayName || user.email}
        </h3>
        <p className="mt-1 text-text-secondary">{user.email}</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border-dark bg-[#0d1b19] p-4 text-sm">
        <SupportRow label="Vai trò" value={user.role} />
        <SupportRow label="Trạng thái tài khoản" value={formatAccountStatus(user.status)} />
        <SupportRow label="Gói hiện tại" value={subscription.tier} />
        <SupportRow label="Trạng thái gói" value={formatSubscriptionStatus(subscription.status)} />
        <SupportRow
          label="Hết hạn"
          value={subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleString() : 'n/a'}
        />
        <SupportRow
          label="Quota xử lý"
          value={`${subscription.usage.processingUsed}/${subscription.usage.processingLimit}`}
        />
        <SupportRow
          label="Giới hạn tài sản"
          value={`${subscription.usage.assetUsed}/${subscription.usage.assetLimit}`}
        />
        <SupportRow
          label="Reset quota tiếp theo"
          value={new Date(subscription.usage.nextResetAt).toLocaleString()}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Rank" value={user.gamification?.rank || 'n/a'} />
        <MetricCard label="XP" value={String(user.gamification?.totalXp ?? 0)} />
        <MetricCard label="Net worth" value={String(user.gamification?.totalNetWorth ?? 0)} />
        <MetricCard
          label="Maintenance streak"
          value={String(user.gamification?.maintenanceStreak ?? 0)}
        />
      </div>

      <div className="rounded-2xl border border-border-dark bg-[#0d1b19] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">Lịch sử yêu cầu VIP gần đây</p>
          <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
            {recentRequests.length} bản ghi
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {recentRequests.length === 0 ? (
            <p className="text-sm text-text-secondary">Chưa có yêu cầu VIP gần đây.</p>
          ) : (
            recentRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border-dark px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-primary">{request.transferReference}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-text-secondary">
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">
                  {request.type} · {request.payment?.amount ?? 'n/a'} {request.payment?.currency || ''}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Gửi lúc {request.submittedAt ? new Date(request.submittedAt).toLocaleString() : 'n/a'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SupportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-dark bg-[#0d1b19] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatAccountStatus(status?: string) {
  switch (status) {
    case 'active':
      return 'Đang hoạt động';
    case 'suspended':
      return 'Tạm khóa';
    case 'deleted':
      return 'Đã xóa';
    default:
      return 'n/a';
  }
}

function formatSubscriptionStatus(status?: string) {
  switch (status) {
    case 'active':
      return 'Đang hoạt động';
    case 'grace_pending_renewal':
      return 'Grace period';
    case 'expired':
      return 'Hết hạn';
    default:
      return 'n/a';
  }
}

function getRoleBadgeClass(role?: string) {
  return role === 'admin'
    ? 'rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-primary'
    : 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary';
}

function getTierBadgeClass(tier?: string) {
  if (tier === 'vip') {
    return 'rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-primary';
  }

  if (tier === 'free') {
    return 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary';
  }

  return 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-muted';
}

function getSubscriptionBadgeClass(status?: string) {
  if (status === 'active') {
    return 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-emerald-300';
  }

  if (status === 'grace_pending_renewal') {
    return 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-300';
  }

  if (status === 'expired') {
    return 'rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-red-300';
  }

  return 'rounded-full border border-border-dark bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-muted';
}

export default AdminUsersPage;
