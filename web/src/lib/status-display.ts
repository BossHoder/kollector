/**
 * Status display mapping utility
 *
 * Maps backend asset status values to UI display properties
 * Single source of truth for status display across all components
 */

import type { AssetStatus } from '@/types/asset';

/**
 * Display information for a status value
 */
export interface StatusDisplayInfo {
  /** Human-readable label */
  label: string;
  /** Tailwind color class name (gray, primary, emerald, red, warning) */
  color: 'gray' | 'primary' | 'emerald' | 'red' | 'warning';
  /** Material icon name */
  icon: string;
  /** Whether to show animation (for processing) */
  animated?: boolean;
}

/**
 * Mapping of backend status values to UI display properties
 *
 * | BE Status   | UI Label   | UI Color  | Icon          |
 * |-------------|------------|-----------|---------------|
 * | draft       | Draft      | gray      | edit          |
 * | processing  | Processing | primary   | auto_awesome  |
 * | active      | Ready      | emerald   | check_circle  |
 * | archived    | Archived   | gray      | archive       |
 * | failed      | Failed     | red       | error         |
 * | partial     | Partial    | warning   | warning       |
 */
export const STATUS_DISPLAY: Record<AssetStatus, StatusDisplayInfo> = {
  draft: {
    label: 'Draft',
    color: 'gray',
    icon: 'edit',
  },
  processing: {
    label: 'Processing',
    color: 'primary',
    icon: 'auto_awesome',
    animated: true,
  },
  active: {
    label: 'Ready',
    color: 'emerald',
    icon: 'check_circle',
  },
  archived: {
    label: 'Archived',
    color: 'gray',
    icon: 'archive',
  },
  failed: {
    label: 'Failed',
    color: 'red',
    icon: 'error',
  },
  partial: {
    label: 'Partial',
    color: 'warning',
    icon: 'warning',
  },
};

/**
 * Get display properties for a status value
 *
 * @param status - Backend status value
 * @returns Display info with label, color, icon, and optional animation flag
 */
export const getStatusDisplay = (status: AssetStatus): StatusDisplayInfo => {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY.draft;
};
