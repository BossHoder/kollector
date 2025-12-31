/**
 * Button component
 *
 * Primary action button matching Stitch prototype design
 * Supports loading state, disabled state, and variants
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - shows spinner */
  isLoading?: boolean;
  /** Icon to display before text */
  leftIcon?: ReactNode;
  /** Icon to display after text */
  rightIcon?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const variantClasses = {
  primary: [
    'bg-primary hover:bg-[#1de0bf] text-gray-900 font-semibold',
    'shadow-[0_0_15px_-3px_rgba(37,244,209,0.3)]',
    'hover:shadow-[0_0_20px_-3px_rgba(37,244,209,0.5)]',
    'focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-dark focus:ring-primary',
  ].join(' '),
  secondary: [
    'bg-surface-dark hover:bg-surface-highlight text-white font-medium',
    'border border-border-dark',
    'focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary',
  ].join(' '),
  ghost: [
    'bg-transparent hover:bg-surface-dark text-white font-medium',
    'focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary',
  ].join(' '),
  danger: [
    'bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium',
    'border border-red-500/20',
    'focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-red-500',
  ].join(' '),
};

const sizeClasses = {
  sm: 'h-9 px-4 text-sm rounded-lg',
  md: 'h-11 px-5 text-base rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center gap-2',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
