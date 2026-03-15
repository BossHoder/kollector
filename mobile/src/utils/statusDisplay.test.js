/**
 * Status Display Utility Tests
 *
 * Tests for the status mapping utility that ensures UX parity
 * between web and mobile status display.
 */

import {
  STATUS_DISPLAY,
  getStatusDisplay,
  getValidStatuses,
  isValidStatus,
} from './statusDisplay';

describe('statusDisplay', () => {
  describe('STATUS_DISPLAY mapping', () => {
    it('should have mappings for all valid backend statuses', () => {
      const expectedStatuses = ['draft', 'processing', 'active', 'archived', 'failed', 'partial'];
      
      expectedStatuses.forEach((status) => {
        expect(STATUS_DISPLAY).toHaveProperty(status);
      });
    });

    it('should map "active" to "Sẵn sàng" label (UX parity)', () => {
      expect(STATUS_DISPLAY.active.label).toBe('Sẵn sàng');
    });

    it('should map "draft" to "Bản nháp" label', () => {
      expect(STATUS_DISPLAY.draft.label).toBe('Bản nháp');
    });

    it('should map "processing" to "Đang xử lý" label', () => {
      expect(STATUS_DISPLAY.processing.label).toBe('Đang xử lý');
    });

    it('should map "failed" to "Thất bại" label', () => {
      expect(STATUS_DISPLAY.failed.label).toBe('Thất bại');
    });

    it('should map "partial" to "Một phần" label', () => {
      expect(STATUS_DISPLAY.partial.label).toBe('Một phần');
    });

    it('should map "archived" to "Đã lưu trữ" label', () => {
      expect(STATUS_DISPLAY.archived.label).toBe('Đã lưu trữ');
    });
  });

  describe('Color assignments', () => {
    it('should assign success/emerald color to "active" (Ready)', () => {
      expect(STATUS_DISPLAY.active.color).toBe('#10b981');
    });

    it('should assign error/red color to "failed"', () => {
      expect(STATUS_DISPLAY.failed.color).toBe('#ef4444');
    });

    it('should assign warning/amber color to "partial"', () => {
      expect(STATUS_DISPLAY.partial.color).toBe('#f59e0b');
    });

    it('should assign primary color to "processing"', () => {
      expect(STATUS_DISPLAY.processing.color).toBe('#25f4d1');
    });

    it('should assign gray color to "draft"', () => {
      expect(STATUS_DISPLAY.draft.color).toBe('#9ca3af');
    });

    it('should assign gray color to "archived"', () => {
      expect(STATUS_DISPLAY.archived.color).toBe('#6b7280');
    });
  });

  describe('Animation flags', () => {
    it('should mark "processing" as animated', () => {
      expect(STATUS_DISPLAY.processing.animated).toBe(true);
    });

    it('should not mark other statuses as animated', () => {
      expect(STATUS_DISPLAY.draft.animated).toBe(false);
      expect(STATUS_DISPLAY.active.animated).toBe(false);
      expect(STATUS_DISPLAY.failed.animated).toBe(false);
      expect(STATUS_DISPLAY.partial.animated).toBe(false);
      expect(STATUS_DISPLAY.archived.animated).toBe(false);
    });
  });

  describe('getStatusDisplay()', () => {
    it('should return correct display info for valid status', () => {
      const result = getStatusDisplay('active');
      
      expect(result.label).toBe('Sẵn sàng');
      expect(result.color).toBeTruthy();
      expect(result.icon).toBeTruthy();
    });

    it('should return draft display for unknown status', () => {
      const result = getStatusDisplay('unknown_status');
      
      expect(result.label).toBe('Bản nháp');
    });

    it('should return draft display for null/undefined', () => {
      expect(getStatusDisplay(null).label).toBe('Bản nháp');
      expect(getStatusDisplay(undefined).label).toBe('Bản nháp');
    });
  });

  describe('getValidStatuses()', () => {
    it('should return array of all valid status keys', () => {
      const statuses = getValidStatuses();
      
      expect(statuses).toContain('draft');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('active');
      expect(statuses).toContain('archived');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('partial');
      expect(statuses).toHaveLength(6);
    });
  });

  describe('isValidStatus()', () => {
    it('should return true for valid statuses', () => {
      expect(isValidStatus('draft')).toBe(true);
      expect(isValidStatus('processing')).toBe(true);
      expect(isValidStatus('active')).toBe(true);
      expect(isValidStatus('archived')).toBe(true);
      expect(isValidStatus('failed')).toBe(true);
      expect(isValidStatus('partial')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidStatus('invalid')).toBe(false);
      expect(isValidStatus('')).toBe(false);
      expect(isValidStatus('ACTIVE')).toBe(false); // Case-sensitive
    });
  });
});
