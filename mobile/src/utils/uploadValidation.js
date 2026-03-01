/**
 * Upload Validation Utility
 *
 * Validation functions for file uploads:
 * - File type validation (accepted image mime types)
 * - File size validation (max 10MB per spec)
 * - Combined validation for upload files
 */

// Maximum file size: 10MB (per spec)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Accepted image mime types
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// User-friendly type descriptions
const TYPE_DESCRIPTIONS = {
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
};

/**
 * Format bytes to human-readable size
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file type
 * @param {string} mimeType - The MIME type to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileType(mimeType) {
  if (!mimeType) {
    return {
      valid: false,
      error: 'File type could not be determined',
    };
  }

  const normalizedType = mimeType.toLowerCase();
  
  if (ACCEPTED_MIME_TYPES.includes(normalizedType)) {
    return { valid: true };
  }

  const acceptedTypes = Object.values(TYPE_DESCRIPTIONS).join(', ');
  return {
    valid: false,
    error: `File type "${mimeType}" is not supported. Accepted types: ${acceptedTypes}`,
  };
}

/**
 * Validate file size
 * @param {number} sizeInBytes - File size in bytes
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileSize(sizeInBytes) {
  if (sizeInBytes === undefined || sizeInBytes === null || sizeInBytes < 0) {
    return {
      valid: false,
      error: 'File size could not be determined',
    };
  }

  if (sizeInBytes === 0) {
    return {
      valid: false,
      error: 'File appears to be empty',
    };
  }

  if (sizeInBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatBytes(sizeInBytes)}) exceeds maximum allowed size of 10MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate a file for upload
 * Checks both type and size
 *
 * @param {Object} file - File object with type/mimeType and fileSize/size properties
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUploadFile(file) {
  if (!file) {
    return {
      valid: false,
      errors: ['No file provided'],
    };
  }

  const errors = [];

  // Get mime type (different libraries use different property names)
  const mimeType = file.type || file.mimeType;
  const typeResult = validateFileType(mimeType);
  if (!typeResult.valid) {
    errors.push(typeResult.error);
  }

  // Get file size (different libraries use different property names)
  const fileSize = file.fileSize ?? file.size;
  const sizeResult = validateFileSize(fileSize);
  if (!sizeResult.valid) {
    errors.push(sizeResult.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get supported file types as string for display
 * @returns {string}
 */
export function getSupportedTypesText() {
  return 'JPEG, PNG, WebP, HEIC';
}

/**
 * Get max file size as string for display
 * @returns {string}
 */
export function getMaxFileSizeText() {
  return formatBytes(MAX_FILE_SIZE);
}

export default {
  validateFileType,
  validateFileSize,
  validateUploadFile,
  getSupportedTypesText,
  getMaxFileSizeText,
  MAX_FILE_SIZE,
  ACCEPTED_MIME_TYPES,
};
