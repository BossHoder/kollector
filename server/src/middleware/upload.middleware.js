/**
 * Multer Upload Middleware
 * Configures file upload handling with memory storage
 * @module middleware/upload
 */

const multer = require('multer');
const logger = require('../config/logger');

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

/**
 * File filter function to validate uploaded files
 * @param {Request} req - Express request
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Định dạng tệp không hợp lệ. Chỉ chấp nhận tệp hình ảnh.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
}

/**
 * Multer configuration with memory storage
 * Files are stored in memory as Buffer before forwarding to the storage adapter
 */
const storage = multer.memoryStorage();

/**
 * Multer upload instance
 */
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

/**
 * Middleware to handle file upload errors
 * Transforms Multer errors into API-friendly responses
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn('File too large', { 
        requestId: req.id, 
        limit: `${MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tệp quá lớn',
          details: [
            {
              field: 'image',
              message: 'Kích thước tệp tối đa là 10MB'
            }
          ]
        }
      });
    }
    
    logger.error('Multer error', { 
      requestId: req.id, 
      error: err.message, 
      code: err.code 
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      }
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Định dạng tệp không hợp lệ',
        details: [
          {
            field: 'image',
            message: 'Chỉ chấp nhận tệp hình ảnh (JPEG, PNG, WebP, GIF)'
          }
        ]
      }
    });
  }

  next(err);
}

/**
 * Single image upload middleware
 * @param {string} fieldName - Form field name for the file
 * @returns {Array} Array of middleware functions
 */
function singleImage(fieldName = 'image') {
  return [
    upload.single(fieldName),
    handleUploadError
  ];
}

module.exports = {
  upload,
  singleImage,
  handleUploadError,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES
};
