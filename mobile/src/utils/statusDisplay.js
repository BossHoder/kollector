/**
 * Status Display Mapping Utility
 *
 * Maps backend asset status values to UI display properties.
 * Single source of truth for status display, mirroring web/src/lib/status-display.ts
 *
 * | BE Status   | UI Label     | UI Color    | Icon             |
 * |-------------|--------------|-------------|------------------|
 * | draft       | Bản nháp     | gray        | edit             |
 * | processing  | Đang xử lý   | primary     | auto_awesome     |
 * | active      | Sẵn sàng     | emerald     | check_circle     |
 * | archived    | Đã lưu trữ   | gray        | archive          |
 * | failed      | Thất bại     | red         | error            |
 * | partial     | Một phần     | warning     | warning          |
 */

import { colors } from '../styles/tokens';

/**
 * @typedef {'draft' | 'processing' | 'active' | 'archived' | 'failed' | 'partial'} AssetStatus
 */

/**
 * @typedef {Object} StatusDisplayInfo
 * @property {string} label - Human-readable label
 * @property {string} color - Hex color value
 * @property {string} backgroundColor - Background color (muted version)
 * @property {string} icon - Material icon name (for reference)
 * @property {boolean} [animated] - Whether to show animation (for processing)
 */

/**
 * Mapping of backend status values to UI display properties
 * @type {Record<AssetStatus, StatusDisplayInfo>}
 */
export const STATUS_DISPLAY = {
  draft: {
    label: 'Bản nháp',
    color: colors.statusDraft,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    icon: 'edit',
    animated: false,
  },
  processing: {
    label: 'Đang xử lý',
    color: colors.statusProcessing,
    backgroundColor: colors.primaryMuted,
    icon: 'auto_awesome',
    animated: true,
  },
  active: {
    label: 'Sẵn sàng',
    color: colors.statusReady,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    icon: 'check_circle',
    animated: false,
  },
  archived: {
    label: 'Đã lưu trữ',
    color: colors.statusArchived,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    icon: 'archive',
    animated: false,
  },
  failed: {
    label: 'Thất bại',
    color: colors.statusFailed,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    icon: 'error',
    animated: false,
  },
  partial: {
    label: 'Một phần',
    color: colors.statusPartial,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    icon: 'warning',
    animated: false,
  },
};

/**
 * Get display properties for a status value
 *
 * @param {AssetStatus} status - Backend status value
 * @returns {StatusDisplayInfo} Display info with label, color, icon, and optional animation flag
 */
export const getStatusDisplay = (status) => {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY.draft;
};

/**
 * Get all valid status values
 * @returns {AssetStatus[]}
 */
export const getValidStatuses = () => Object.keys(STATUS_DISPLAY);

/**
 * Check if a status is valid
 * @param {string} status
 * @returns {boolean}
 */
export const isValidStatus = (status) => status in STATUS_DISPLAY;

export default {
  STATUS_DISPLAY,
  getStatusDisplay,
  getValidStatuses,
  isValidStatus,
};
