/**
 * Input Component
 *
 * Accessible text input primitive with:
 * - Label support
 * - Error state
 * - Helper text
 * - Password visibility toggle
 * - Minimum 44pt touch target
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, borderRadius, spacing, typography, touchTargetSize } from '../../styles/tokens';
import { coerceBool, assertBool } from '../../utils/coerceBool';

/**
 * @param {Object} props
 * @param {string} [props.label] - Input label
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.value] - Input value
 * @param {Function} [props.onChangeText] - Text change handler
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Helper text below input
 * @param {boolean} [props.secureTextEntry=false] - Hide text (password mode)
 * @param {string} [props.keyboardType='default'] - Keyboard type
 * @param {string} [props.autoCapitalize='none'] - Auto capitalize behavior
 * @param {string} [props.autoComplete] - Auto complete hint
 * @param {boolean} [props.disabled=false] - Disable input
 * @param {string} [props.testID] - Test identifier
 * @param {Object} [props.style] - Container style overrides
 * @param {Object} [props.inputStyle] - Input style overrides
 */
export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  disabled = false,
  testID,
  style,
  inputStyle,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const isPassword = coerceBool(secureTextEntry);
  // Coerce disabled to strict boolean — prevents Android native crash
  const isDisabled = coerceBool(disabled);

  const containerStyles = [
    styles.container,
    style,
  ];

  const inputContainerStyles = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    hasError && styles.inputContainerError,
    isDisabled && styles.inputContainerDisabled,
  ];

  const inputStyles = [
    styles.input,
    isPassword && styles.inputWithToggle,
    isDisabled && styles.inputDisabled,
    inputStyle,
  ];

  assertBool('TextInput.secureTextEntry', isPassword);
  assertBool('TextInput.editable (disabled)', isDisabled);

  return (
    <View style={containerStyles}>
      {label && (
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
        </Text>
      )}
      
      <View style={inputContainerStyles}>
        <TextInput
          style={inputStyles}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!isDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled: isDisabled }}
          accessible
          {...rest}
        />
        
        {isPassword && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.toggleText}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  labelError: {
    color: colors.statusFailed,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    minHeight: touchTargetSize, // 44pt minimum
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: colors.statusFailed,
  },
  inputContainerDisabled: {
    backgroundColor: colors.neutral[100],
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.base,
    color: colors.neutral[900],
    minHeight: touchTargetSize,
  },
  inputWithToggle: {
    paddingRight: 0, // Space for toggle button
  },
  inputDisabled: {
    color: colors.neutral[500],
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    minHeight: touchTargetSize,
  },
  toggleText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  helperText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.statusFailed,
  },
});

export default Input;
