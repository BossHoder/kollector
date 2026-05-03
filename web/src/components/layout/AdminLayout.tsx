import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/contexts/ToastContext';

const adminLinks = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/subscriptions', label: 'Yêu cầu VIP' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/operations', label: 'Vận hành' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toasts, dismissToast } = useToast();

  const displayName = user?.profile?.displayName || user?.displayName || user?.email || 'Admin';

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-border-dark bg-[#0d1b19] px-6 py-8 lg:block">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">
              Kollector Admin
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white">Bảng điều khiển</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Duyệt yêu cầu VIP, theo dõi người dùng và kiểm tra Queue nội bộ.
            </p>
          </div>

          <nav className="space-y-2">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [
                    'block rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-[#062b24]'
                      : 'text-text-secondary hover:bg-surface-dark hover:text-white',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-border-dark bg-surface-dark/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Phiên đăng nhập</p>
            <p className="mt-2 font-medium text-white">{displayName}</p>
            <p className="mt-1 text-sm text-text-secondary">{user?.email}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="mt-4 inline-flex items-center rounded-lg border border-border-dark px-3 py-2 text-sm text-text-secondary transition hover:border-primary/40 hover:text-white"
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-border-dark bg-surface-dark/70 px-5 py-4 backdrop-blur-sm sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Hệ thống nội bộ</p>
                <p className="mt-1 text-lg font-semibold text-white">Admin</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                  {user?.role || 'user'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="rounded-lg border border-border-dark px-3 py-2 transition hover:border-primary/40 hover:text-white"
                >
                  Về ứng dụng
                </button>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    [
                      'whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-[#062b24]'
                        : 'border border-border-dark text-text-secondary',
                    ].join(' ')
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="flex-1 px-5 py-6 sm:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
