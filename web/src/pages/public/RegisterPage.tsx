/**
 * RegisterPage
 *
 * Public registration page matching stitch_kollector_register_page design
 * Handles registration and redirects to /app on success
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterForm, type RegisterFormData } from '@/components/forms/RegisterForm';

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, register } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        email: data.email,
        username: data.username,
        password: data.password,
      });
    } catch {
      // Error is already handled by AuthContext and displayed via error prop
    }
  };

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-6">
      {/* Header Text */}
      <div className="text-center space-y-2 mb-2">
        <h1 className="text-white tracking-tight text-3xl font-bold leading-tight">
          Bắt đầu sưu tầm
        </h1>
        <p className="text-text-secondary text-base font-normal">
          Tạo tài khoản để quản lý bộ sưu tập của bạn.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-surface-dark border border-border-dark rounded-xl shadow-glow p-6 sm:p-8 backdrop-blur-sm">
        <RegisterForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />

        {/* Login Link */}
        <div className="text-center pt-6">
          <p className="text-sm text-text-secondary">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="text-white font-semibold hover:text-primary transition-colors ml-1"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Legal Text */}
      <p className="text-xs text-[#4a635e] text-center px-6 leading-relaxed">
        Bằng cách đăng ký, bạn đồng ý với{' '}
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
