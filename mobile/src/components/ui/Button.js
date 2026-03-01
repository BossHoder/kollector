/**
 * Button Component
 *
 * Accessible button primitive with:
 * - Primary/secondary/ghost variants
 * - Loading state
 * - Disabled state
 * - Minimum 44pt touch target
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors, borderRadius, spacing, typography, touchTargetSize } from '../../styles/tokens';
import { coerceBool, assertBool } from '../../utils/coerceBool';

/**
 * @param {Object} props
 * @param {string} props.children - Button label text
 * @param {'primary' | 'secondary' | 'ghost' | 'danger'} [props.variant='primary'] - Button style variant
 * @param {'default' | 'small' | 'large'} [props.size='default'] - Button size
 * @param {boolean} [props.loading=false] - Show loading indicator
 * @param {boolean} [props.disabled=false] - Disable button
 * @param {boolean} [props.fullWidth=false] - Expand to full width
 * @param {Function} props.onPress - Press handler
 * @param {string} [props.testID] - Test identifier
 * @param {Object} [props.style] - Additional style overrides
 */
export function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  testID,
  style,
}) {
  const isDisabled = coerceBool(disabled) || coerceBool(loading);

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isDisabled && styles[`${variant}Disabled`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`size_${size}Text`],
    isDisabled && styles.disabledText,
  ];

  assertBool('TouchableOpacity.disabled', isDisabled);

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={textStyles}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargetSize, // 44pt minimum
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.statusFailed,
  },

  // Disabled states
  disabled: {
    opacity: 0.5,
  },
  primaryDisabled: {
    backgroundColor: colors.neutral[300],
  },
  secondaryDisabled: {
    borderColor: colors.neutral[200],
  },
  ghostDisabled: {},
  dangerDisabled: {},

  // Sizes
  size_small: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  size_default: {
    minHeight: touchTargetSize,
    paddingHorizontal: spacing.lg,
  },
  size_large: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },

  // Text styles
  text: {
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.white,
    fontSize: typography.fontSizes.base,
  },
  secondaryText: {
    color: colors.neutral[700],
    fontSize: typography.fontSizes.base,
  },
  ghostText: {
    color: colors.primary,
    fontSize: typography.fontSizes.base,
  },
  dangerText: {
    color: colors.white,
    fontSize: typography.fontSizes.base,
  },
  disabledText: {
    color: colors.neutral[400],
  },

  // Size text
  size_smallText: {
    fontSize: typography.fontSizes.sm,
  },
  size_defaultText: {
    fontSize: typography.fontSizes.base,
  },
  size_largeText: {
    fontSize: typography.fontSizes.lg,
  },
});

export default Button;
