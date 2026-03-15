import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { CANONICAL_CATEGORIES, CATEGORY_LABELS } from '../../config/categories';
import { colors, spacing, borderRadius, typography } from '../../styles/tokens';
//sdawdaw
const CATEGORY_FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  ...CANONICAL_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key] ?? key })),
];

function CategoryChip({ label, isSelected, onPress, testID }) {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AssetCategoryFilter({ selectedCategory, onSelect }) {
  return (
    <FlatList
      horizontal
      data={CATEGORY_FILTER_OPTIONS}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <CategoryChip
          label={item.label}
          isSelected={selectedCategory === item.key}
          onPress={() => onSelect(item.key)}
          testID={`category-filter-${item.key}`}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },
});
