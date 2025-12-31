/**
 * Error message mapping utility
 *
 * Maps HTTP error codes to Vietnamese user messages
 * per research.md specifications
 */

import type { ApiError } from './api-client';

/**
 * Error message configuration
 */
export interface ErrorMessageConfig {
  /** Vietnamese message to display to user */
  message: string;
  /** Whether the error is recoverable (user can retry) */
  recoverable: boolean;
  /** Action hint for the user */
  actionHint?: string;
}

/**
 * Default error messages by HTTP status code
 */
const ERROR_MESSAGES: Record<number, ErrorMessageConfig> = {
  400: {
    message: 'Dữ liệu không hợp lệ',
    recoverable: true,
    actionHint: 'Vui lòng kiểm tra lại thông tin',
  },
  401: {
    message: 'Phiên đăng nhập đã hết hạn',
    recoverable: true,
    actionHint: 'Vui lòng đăng nhập lại',
  },
  403: {
    message: 'Bạn không có quyền thực hiện thao tác này',
    recoverable: false,
  },
  404: {
    message: 'Không tìm thấy tài nguyên',
    recoverable: false,
  },
  409: {
    message: 'Thao tác bị xung đột',
    recoverable: true,
    actionHint: 'Vui lòng thử lại',
  },
  413: {
    message: 'Tệp quá lớn',
    recoverable: true,
    actionHint: 'Vui lòng chọn tệp nhỏ hơn 10MB',
  },
  415: {
    message: 'Định dạng tệp không được hỗ trợ',
    recoverable: true,
    actionHint: 'Chỉ hỗ trợ JPEG và PNG',
  },
  429: {
    message: 'Quá nhiều yêu cầu',
    recoverable: true,
    actionHint: 'Vui lòng đợi một lát rồi thử lại',
  },
  500: {
    message: 'Đã xảy ra lỗi hệ thống',
    recoverable: true,
    actionHint: 'Vui lòng thử lại sau',
  },
  502: {
    message: 'Máy chủ không phản hồi',
    recoverable: true,
    actionHint: 'Vui lòng thử lại sau',
  },
  503: {
    message: 'Dịch vụ tạm thời không khả dụng',
    recoverable: true,
    actionHint: 'Vui lòng thử lại sau',
  },
};

/**
 * Default message for unhandled status codes
 */
const DEFAULT_ERROR: ErrorMessageConfig = {
  message: 'Đã xảy ra lỗi không xác định',
  recoverable: true,
  actionHint: 'Vui lòng thử lại',
};

/**
 * Field-specific validation messages
 */
export const FIELD_ERRORS: Record<string, string> = {
  email: 'Email không hợp lệ',
  password: 'Mật khẩu phải có ít nhất 8 ký tự',
  username: 'Tên người dùng phải có 3-30 ký tự',
  displayName: 'Tên hiển thị không được để trống',
  category: 'Vui lòng chọn danh mục',
  image: 'Vui lòng chọn ảnh',
  title: 'Tiêu đề không được để trống',
};

/**
 * Get error message config for a status code
 */
export const getErrorMessage = (status: number): ErrorMessageConfig => {
  return ERROR_MESSAGES[status] || DEFAULT_ERROR;
};

/**
 * Format API error for display
 *
 * @param error - API error or unknown error
 * @returns User-friendly error message
 */
export const formatApiError = (error: unknown): string => {
  if (error instanceof Error && 'status' in error) {
    const apiError = error as ApiError;
    const config = getErrorMessage(apiError.status);

    // Use server message if available, otherwise use default
    const message = apiError.message || config.message;

    if (config.actionHint) {
      return `${message}. ${config.actionHint}`;
    }

    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return DEFAULT_ERROR.message;
};

/**
 * Get field validation error message
 */
export const getFieldError = (field: string, defaultMessage?: string): string => {
  return FIELD_ERRORS[field] || defaultMessage || 'Trường này không hợp lệ';
};

/**
 * Check if error is recoverable (user should retry)
 */
export const isRecoverableError = (status: number): boolean => {
  const config = ERROR_MESSAGES[status];
  return config?.recoverable ?? true;
};
