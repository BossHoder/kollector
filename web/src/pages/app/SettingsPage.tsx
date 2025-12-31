/**
 * SettingsPage Component
 *
 * Displays user profile information, socket connection status,
 * and provides logout functionality
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import type { SocketStatus } from '@/lib/socket';

/**
 * Get Vietnamese status text for socket connection
 */
function getStatusText(status: SocketStatus): string {
  switch (status) {
    case 'connected':
      return 'Đã kết nối';
    case 'connecting':
      return 'Đang kết nối...';
    case 'reconnecting':
      return 'Đang kết nối lại...';
    case 'disconnected':
      return 'Mất kết nối';
    case 'error':
      return 'Lỗi kết nối';
    default:
      return 'Không xác định';
  }
}

/**
 * Get status indicator color class
 */
function getStatusColorClass(status: SocketStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-stitch-green';
    case 'connecting':
    case 'reconnecting':
      return 'bg-stitch-yellow';
    case 'disconnected':
    case 'error':
      return 'bg-stitch-red';
    default:
      return 'bg-gray-500';
  }
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { status } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header with back link */}
      <div className="mb-8">
        <Link
          to="/app/library"
          className="inline-flex items-center gap-2 text-stitch-blue hover:text-stitch-blue-dark transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Quay lại thư viện
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stitch-navy mb-8">Cài đặt</h1>

      {/* User Profile Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">
          Thông tin tài khoản
        </h2>

        <div className="space-y-4">
          {/* Display Name or Username */}
          {(user?.displayName || user?.username) && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Tên hiển thị
              </label>
              <p className="text-stitch-navy">
                {user.displayName || user.username}
              </p>
            </div>
          )}

          {/* Email */}
          {user?.email && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email
              </label>
              <p className="text-stitch-navy">{user.email}</p>
            </div>
          )}

          {/* Username (if different from display name) */}
          {user?.username && user.displayName && user.username !== user.displayName && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Tên đăng nhập
              </label>
              <p className="text-stitch-navy">{user.username}</p>
            </div>
          )}
        </div>
      </section>

      {/* Connection Status Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">
          Trạng thái kết nối
        </h2>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${getStatusColorClass(status)}`}
            aria-hidden="true"
          />
          <span className="text-stitch-navy">{getStatusText(status)}</span>
        </div>
      </section>

      {/* Logout Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">
          Phiên đăng nhập
        </h2>

        <p className="text-gray-600 mb-4">
          Đăng xuất khỏi tài khoản của bạn trên thiết bị này.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center px-4 py-2 bg-stitch-red text-white font-medium rounded-lg hover:bg-stitch-red/90 focus:outline-none focus:ring-2 focus:ring-stitch-red focus:ring-offset-2 transition-colors"
        >
          Đăng xuất
        </button>
      </section>
    </div>
  );
}

export default SettingsPage;
