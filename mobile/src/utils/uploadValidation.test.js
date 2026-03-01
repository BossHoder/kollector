/**
 * Upload Validation Tests
 *
 * Unit tests for upload validation utility:
 * - File type validation (accepted image mime types)
 * - File size validation (max 10MB)
 * - Combined validation
 */

import {
  validateFileType,
  validateFileSize,
  validateUploadFile,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './uploadValidation';

describe('uploadValidation', () => {
  describe('Constants', () => {
    it('should have MAX_FILE_SIZE of 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB in bytes
    });

    it('should accept common image mime types', () => {
      expect(ACCEPTED_MIME_TYPES).toContain('image/jpeg');
      expect(ACCEPTED_MIME_TYPES).toContain('image/png');
      expect(ACCEPTED_MIME_TYPES).toContain('image/webp');
      expect(ACCEPTED_MIME_TYPES).toContain('image/heic');
    });
  });

  describe('validateFileType', () => {
    it('should accept JPEG files', () => {
      const result = validateFileType('image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept PNG files', () => {
      const result = validateFileType('image/png');
      expect(result.valid).toBe(true);
    });

    it('should accept WebP files', () => {
      const result = validateFileType('image/webp');
      expect(result.valid).toBe(true);
    });

    it('should accept HEIC files', () => {
      const result = validateFileType('image/heic');
      expect(result.valid).toBe(true);
    });

    it('should accept HEIF files', () => {
      const result = validateFileType('image/heif');
      expect(result.valid).toBe(true);
    });

    it('should reject PDF files', () => {
      const result = validateFileType('application/pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject video files', () => {
      const result = validateFileType('video/mp4');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject text files', () => {
      const result = validateFileType('text/plain');
      expect(result.valid).toBe(false);
    });

    it('should handle undefined mime type', () => {
      const result = validateFileType(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null mime type', () => {
      const result = validateFileType(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files under 10MB', () => {
      const result = validateFileSize(5 * 1024 * 1024); // 5MB
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept files exactly at 10MB', () => {
      const result = validateFileSize(10 * 1024 * 1024); // 10MB
      expect(result.valid).toBe(true);
    });

    it('should reject files over 10MB', () => {
      const result = validateFileSize(11 * 1024 * 1024); // 11MB
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('should accept small files', () => {
      const result = validateFileSize(100); // 100 bytes
      expect(result.valid).toBe(true);
    });

    it('should handle zero size', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined size', () => {
      const result = validateFileSize(undefined);
      expect(result.valid).toBe(false);
    });

    it('should handle negative size', () => {
      const result = validateFileSize(-100);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUploadFile', () => {
    it('should pass valid JPEG under 10MB', () => {
      const file = {
        type: 'image/jpeg',
        fileSize: 5 * 1024 * 1024,
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass valid PNG at 10MB', () => {
      const file = {
        type: 'image/png',
        fileSize: 10 * 1024 * 1024,
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid type', () => {
      const file = {
        type: 'application/pdf',
        fileSize: 1024 * 1024,
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not supported');
    });

    it('should fail for oversized file', () => {
      const file = {
        type: 'image/jpeg',
        fileSize: 15 * 1024 * 1024, // 15MB
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('10MB');
    });

    it('should return multiple errors for invalid type AND size', () => {
      const file = {
        type: 'video/mp4',
        fileSize: 50 * 1024 * 1024, // 50MB
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('should handle file object with mimeType instead of type', () => {
      const file = {
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024,
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(true);
    });

    it('should handle file object with size instead of fileSize', () => {
      const file = {
        type: 'image/jpeg',
        size: 1024 * 1024,
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(true);
    });

    it('should handle null file', () => {
      const result = validateUploadFile(null);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined file', () => {
      const result = validateUploadFile(undefined);
      expect(result.valid).toBe(false);
    });
  });
});
