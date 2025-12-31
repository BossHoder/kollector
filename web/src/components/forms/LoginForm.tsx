/**
 * LoginForm component
 *
 * Login form with email/password validation using React Hook Form + Zod
 * Matches Stitch prototype design from stitch_kollector_login_page
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Validation schema matching backend requirements
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function LoginForm({ onSubmit, isLoading = false, error }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <span className="material-symbols-outlined text-[20px] flex-shrink-0">
            error
          </span>
          <p>{error}</p>
        </div>
      )}

      {/* Email Input */}
      <Input
        {...register('email')}
        type="email"
        label="Email"
        placeholder="vidu@email.com"
        error={!!errors.email}
        helperText={errors.email?.message}
        disabled={isLoading}
        autoComplete="email"
      />

      {/* Password Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-sm font-medium text-white">
            Mật khẩu
          </label>
          <a
            href="#"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Quên mật khẩu?
          </a>
        </div>

        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            className={[
              'w-full bg-[#111817] text-white border rounded-lg px-4 py-3 text-base',
              'placeholder:text-[#4a635e]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-1 pr-12',
              errors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-[#3b5450] focus:border-primary focus:ring-primary',
            ].join(' ')}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a635e] hover:text-primary transition-colors focus:outline-none p-1 rounded-md"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        className="mt-2"
      >
        Đăng nhập
      </Button>
    </form>
  );
}
