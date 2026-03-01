/**
 * Asset Filters Sheet
 *
 * Bottom sheet component for advanced asset filtering:
 * - Status filter
 * - Category filter
 * - Clear all filters
 *
 * Note: Basic status filtering using horizontal chips is already
 * implemented inline in AssetsLibraryScreen. This sheet provides
 * additional filtering options and can be expanded.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { coerceBool, assertBool } from '../../utils/coerceBool';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Button } from '../ui/Button';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';

// Status options for filtering
const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses', value: null },
  { key: 'active', label: 'Ready', value: 'active' },
  { key: 'processing', label: 'Processing', value: 'processing' },
  { key: 'draft', label: 'Draft', value: 'draft' },
  { key: 'failed', label: 'Failed', value: 'failed' },
  { key: 'partial', label: 'Partial', value: 'partial' },
  { key: 'archived', label: 'Archived', value: 'archived' },
];

// Category options (could be loaded dynamically)
const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All Categories', value: null },
  { key: 'sneakers', label: 'Sneakers', value: 'sneakers' },
  { key: 'cards', label: 'Trading Cards', value: 'cards' },
  { key: 'collectibles', label: 'Collectibles', value: 'collectibles' },
  { key: 'electronics', label: 'Electronics', value: 'electronics' },
  { key: 'other', label: 'Other', value: 'other' },
];

/**
 * Filter option row component
 */
function FilterOption({ label, isSelected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.option, isSelected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
    >
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
        {label}
      </Text>
      {isSelected && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * @typedef {Object} AssetFiltersSheetProps
 * @property {boolean} visible - Whether sheet is visible
 * @property {Function} onClose - Close handler
 * @property {Object} filters - Current filter values
 * @property {Function} onApply - Apply filters handler
 */

/**
 * Asset Filters Bottom Sheet
 *
 * @param {AssetFiltersSheetProps} props
 */
export function AssetFiltersSheet({
  visible: rawVisible,
  onClose,
  filters = {},
  onApply,
}) {
  // Coerce to strict boolean — route.params / storage can pass "false" strings
  const visible = coerceBool(rawVisible);
  // Local state for pending filter changes
  const [pendingFilters, setPendingFilters] = useState({
    status: filters.status || null,
    category: filters.category || null,
  });

  // Sync with external filters when sheet opens
  React.useEffect(() => {
    if (visible) {
      setPendingFilters({
        status: filters.status || null,
        category: filters.category || null,
      });
    }
  }, [visible, filters]);

  const handleStatusSelect = useCallback((value) => {
    setPendingFilters(prev => ({ ...prev, status: value }));
  }, []);

  const handleCategorySelect = useCallback((value) => {
    setPendingFilters(prev => ({ ...prev, category: value }));
  }, []);

  const handleClearAll = useCallback(() => {
    setPendingFilters({ status: null, category: null });
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(pendingFilters);
    onClose?.();
  }, [pendingFilters, onApply, onClose]);

  const hasActiveFilters = useMemo(() => {
    return pendingFilters.status !== null || pendingFilters.category !== null;
  }, [pendingFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (pendingFilters.status) count++;
    if (pendingFilters.category) count++;
    return count;
  }, [pendingFilters]);

  assertBool('Modal.visible', visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              {STATUS_OPTIONS.map((option) => (
                <FilterOption
                  key={option.key}
                  label={option.label}
                  isSelected={pendingFilters.status === option.value}
                  onPress={() => handleStatusSelect(option.value)}
                />
              ))}
            </View>

            {/* Category Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              {CATEGORY_OPTIONS.map((option) => (
                <FilterOption
                  key={option.key}
                  label={option.label}
                  isSelected={pendingFilters.category === option.value}
                  onPress={() => handleCategorySelect(option.value)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Footer with Apply button */}
          <View style={styles.footer}>
            <Button
              onPress={handleApply}
              fullWidth
              testID="apply-filters-button"
            >
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  clearButton: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: touchTargetSize,
  },
  optionSelected: {},
  optionText: {
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  checkmark: {
    fontSize: typography.fontSizes.lg,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
});

export default AssetFiltersSheet;
