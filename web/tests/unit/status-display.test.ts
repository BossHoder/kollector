/**
 * Unit tests for status-display.ts
 * Tests mapping of backend status values to UI display
 *
 * These tests MUST fail initially per Constitution Test-First principle
 */

import { describe, it, expect } from 'vitest';

// Import will fail until implementation exists
import {
  getStatusDisplay,
  STATUS_DISPLAY,
  type StatusDisplayInfo,
} from '@/lib/status-display';
import type { AssetStatus } from '@/types/asset';

describe('status-display', () => {
  describe('STATUS_DISPLAY mapping', () => {
    it('should have mapping for draft status', () => {
      expect(STATUS_DISPLAY.draft).toBeDefined();
      expect(STATUS_DISPLAY.draft.label).toBe('Draft');
      expect(STATUS_DISPLAY.draft.color).toBe('gray');
      expect(STATUS_DISPLAY.draft.icon).toBe('edit');
    });

    it('should have mapping for processing status', () => {
      expect(STATUS_DISPLAY.processing).toBeDefined();
      expect(STATUS_DISPLAY.processing.label).toBe('Processing');
      expect(STATUS_DISPLAY.processing.color).toBe('primary');
      expect(STATUS_DISPLAY.processing.icon).toBe('auto_awesome');
      expect(STATUS_DISPLAY.processing.animated).toBe(true);
    });

    it('should have mapping for active (Ready) status', () => {
      expect(STATUS_DISPLAY.active).toBeDefined();
      expect(STATUS_DISPLAY.active.label).toBe('Ready');
      expect(STATUS_DISPLAY.active.color).toBe('emerald');
      expect(STATUS_DISPLAY.active.icon).toBe('check_circle');
    });

    it('should have mapping for archived status', () => {
      expect(STATUS_DISPLAY.archived).toBeDefined();
      expect(STATUS_DISPLAY.archived.label).toBe('Archived');
      expect(STATUS_DISPLAY.archived.color).toBe('gray');
      expect(STATUS_DISPLAY.archived.icon).toBe('archive');
    });

    it('should have mapping for failed status', () => {
      expect(STATUS_DISPLAY.failed).toBeDefined();
      expect(STATUS_DISPLAY.failed.label).toBe('Failed');
      expect(STATUS_DISPLAY.failed.color).toBe('red');
      expect(STATUS_DISPLAY.failed.icon).toBe('error');
    });

    it('should have mapping for partial status', () => {
      expect(STATUS_DISPLAY.partial).toBeDefined();
      expect(STATUS_DISPLAY.partial.label).toBe('Partial');
      expect(STATUS_DISPLAY.partial.color).toBe('warning');
      expect(STATUS_DISPLAY.partial.icon).toBe('warning');
    });
  });

  describe('getStatusDisplay function', () => {
    it('should return display info for valid status', () => {
      const display = getStatusDisplay('active');

      expect(display).toEqual({
        label: 'Ready',
        color: 'emerald',
        icon: 'check_circle',
      });
    });

    it('should return display info for processing status with animation', () => {
      const display = getStatusDisplay('processing');

      expect(display.animated).toBe(true);
    });

    it('should return draft display for unknown status', () => {
      const display = getStatusDisplay('unknown' as AssetStatus);

      expect(display.label).toBe('Draft');
      expect(display.color).toBe('gray');
    });

    it('should handle all valid status values', () => {
      const statuses: AssetStatus[] = [
        'draft',
        'processing',
        'active',
        'archived',
        'failed',
        'partial',
      ];

      statuses.forEach(status => {
        const display = getStatusDisplay(status);
        expect(display).toBeDefined();
        expect(display.label).toBeTruthy();
        expect(display.color).toBeTruthy();
        expect(display.icon).toBeTruthy();
      });
    });
  });

  describe('StatusDisplayInfo type', () => {
    it('should conform to expected shape', () => {
      const display: StatusDisplayInfo = getStatusDisplay('active');

      // TypeScript will fail if shape is wrong
      expect(typeof display.label).toBe('string');
      expect(typeof display.color).toBe('string');
      expect(typeof display.icon).toBe('string');
      expect(display.animated === undefined || typeof display.animated === 'boolean').toBe(
        true
      );
    });
  });
});
