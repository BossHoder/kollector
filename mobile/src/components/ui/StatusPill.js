/**
 * StatusPill Component
 *
 * Displays asset status with consistent color semantics matching web app.
 * Uses statusDisplay utility for label and color mapping.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusDisplay } from '../../utils/statusDisplay';
import { colors, borderRadius, spacing, typography } from '../../styles/tokens';

/**
 * @param {Object} props
 * @param {string} props.status - Asset status (active, draft, processing, failed, partial, archived)
 * @param {'small' | 'default'} [props.size='default'] - Pill size variant
 * @param {Object} [props.style] - Additional style overrides
 */
export function StatusPill({ status, size = 'default', style }) {
  const statusInfo = getStatusDisplay(status);
  
  const isSmall = size === 'small';
  
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: statusInfo.backgroundColor },
        isSmall && styles.pillSmall,
        style,
      ]}
      accessibilityLabel={`Status: ${statusInfo.label}`}
      accessibilityRole="text"
    >
      {statusInfo.animated && (
        <View style={[styles.indicator, { backgroundColor: statusInfo.color }]} />
      )}
      <Text
        style={[
          styles.label,
          { color: statusInfo.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {statusInfo.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  pillSmall: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  labelSmall: {
    fontSize: typography.fontSizes.xs,
  },
});

export default StatusPill;
