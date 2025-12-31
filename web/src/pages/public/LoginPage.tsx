/**
 * LoginPage
 *
 * Public login page matching stitch_kollector_login_page design
 * Handles authentication and redirects to /app on success
 */

import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm, type LoginFormData } from '@/components/forms/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, error, login } = useAuth();

  // Get redirect path from location state or default to /app
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
    } catch {
      // Error is already handled by AuthContext and displayed via error prop
    }
  };

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-6">
      {/* Header Text */}
      <div className="text-center space-y-2 mb-2">
        <h1 className="text-white tracking-tight text-3xl font-bold leading-tight">
          Chào mừng quay lại
        </h1>
        <p className="text-text-secondary text-base font-normal">
          Tiếp tục hành trình sưu tầm của bạn.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-surface-dark border border-border-dark rounded-xl shadow-glow p-6 sm:p-8 backdrop-blur-sm">
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />

        {/* Sign Up Link */}
        <div className="text-center pt-6">
          <p className="text-sm text-text-secondary">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="text-white font-semibold hover:text-primary transition-colors ml-1"
            >
              Tạo tài khoản
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Legal Text */}
      <p className="text-xs text-[#4a635e] text-center px-6 leading-relaxed">
        Bằng cách đăng nhập, bạn đồng ý với{' '}
        <a href="#" className="underline hover:text-text-secondary">
          Điều khoản dịch vụ
        </a>{' '}
        và{' '}
        <a href="#" className="underline hover:text-text-secondary">
          Chính sách bảo mật
        </a>{' '}
        của Kollector.
      </p>
    </div>
  );
}
