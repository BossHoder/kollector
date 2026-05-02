import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../styles/tokens';

const STATUS_COPY = {
  active: {
    label: 'ACTIVE',
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    color: '#dcfce7',
  },
  grace_pending_renewal: {
    label: 'RENEWAL PENDING',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#fef3c7',
  },
  expired: {
    label: 'EXPIRED',
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    color: '#ffe4e6',
  },
};

export default function SubscriptionStateBadge({ status = 'active' }) {
  const copy = STATUS_COPY[status] || STATUS_COPY.active;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: copy.backgroundColor,
          borderColor: copy.borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: copy.color }]}>{copy.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
});
