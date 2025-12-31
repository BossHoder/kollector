/**
 * Input component
 *
 * Form input matching Stitch prototype design
 * Supports error state, disabled state, and icons
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Helper/error text */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Left icon/addon */
  leftIcon?: ReactNode;
  /** Right icon/addon */
  rightIcon?: ReactNode;
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
}

const sizeClasses = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-12 px-4 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error = false,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-white block"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full bg-[#111817] text-white border rounded-lg',
              'placeholder:text-[#4a635e]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-1',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-[#3b5450] focus:border-primary focus:ring-primary',
              sizeClasses[size],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>

        {helperText && (
          <p
            className={`text-sm ${error ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
