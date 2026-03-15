/**
 * ImageToggle Component
 *
 * Toggle between Processed (AI-enhanced) and Original images.
 * Follows web design language with mobile-native interactions.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../styles/tokens';
import { coerceBool, assertBool } from '../../utils/coerceBool';

/**
 * ImageToggle - Swaps between processed/original image
 *
 * @param {Object} props
 * @param {string} props.processedUri - URI of processed/enhanced image
 * @param {string} props.originalUri - URI of original uploaded image
 * @param {boolean} [props.showProcessed] - Controlled mode (boolean)
 * @param {string} [props.value] - Controlled mode ('original' | 'processed')
 * @param {function} [props.onToggle] - Callback when toggle changes (receives boolean)
 * @param {function} [props.onChange] - Callback when toggle changes (receives 'original' | 'processed')
 * @param {boolean} [props.disabled=false] - Disable toggle interaction
 * @param {string} [props.testID='image-toggle'] - Test ID for testing
 * @param {boolean} [props.showLoadingIndicator=false] - Show loading indicator
 */
export function ImageToggle({
  processedUri,
  originalUri,
  showProcessed: controlledShowProcessed,
  value,
  onToggle,
  onChange,
  disabled: rawDisabled = false,
  testID = 'image-toggle',
  showLoadingIndicator: rawShowLoadingIndicator = false,
}) {
  // Coerce all boolean-like inputs to strict booleans
  const disabled = coerceBool(rawDisabled);
  const showLoadingIndicator = coerceBool(rawShowLoadingIndicator);

  // Internal state for uncontrolled mode
  const [internalShowProcessed, setInternalShowProcessed] = useState(true);

  // Loading states for each image
  const [processedLoading, setProcessedLoading] = useState(true);
  const [originalLoading, setOriginalLoading] = useState(true);

  // Determine if controlled or uncontrolled
  // Support both 'value' (string) and 'showProcessed' (boolean) props
  const isControlledByValue = value !== undefined;
  const isControlledByProp = controlledShowProcessed !== undefined;
  const isControlled = isControlledByValue || isControlledByProp;

  // Normalize source-of-truth toggle state to strict boolean
  const normalizedShowProcessed = useMemo(() => {
    if (isControlledByValue) {
      return value === 'processed';
    }

    if (isControlledByProp) {
      return coerceBool(controlledShowProcessed);
    }

    return coerceBool(internalShowProcessed);
  }, [
    isControlledByValue,
    isControlledByProp,
    value,
    controlledShowProcessed,
    internalShowProcessed,
  ]);

  // Current image to display
  const currentUri = normalizedShowProcessed ? processedUri : originalUri;
  const isLoading = normalizedShowProcessed ? processedLoading : originalLoading;

  // Runtime guards for Android/native props that require booleans
  assertBool('TouchableOpacity.disabled', disabled);
  assertBool('TouchableOpacity.accessibilityState.selected', normalizedShowProcessed);

  // Handle toggle
  const handleToggle = useCallback(
    (nextValue) => {
      const toProcessed = coerceBool(nextValue);

      if (disabled) return;

      if (!isControlled) {
        setInternalShowProcessed(toProcessed);
      }

      // Fire both callback styles
      onToggle?.(toProcessed);
      onChange?.(toProcessed ? 'processed' : 'original');
    },
    [disabled, isControlled, onToggle, onChange]
  );

  // If only one image exists, show it without toggle
  const hasProcessed = Boolean(processedUri);
  const hasOriginal = Boolean(originalUri);
  const hasBothImages = hasProcessed && hasOriginal;

  // Single image mode
  if (!hasBothImages) {
    const singleUri = processedUri || originalUri;

    if (!singleUri) {
      return (
        <View style={styles.container} testID={testID}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Không có ảnh</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container} testID={testID}>
        <Image
          source={{ uri: singleUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={hasProcessed ? 'Ảnh đã xử lý' : 'Ảnh gốc'}
          testID="toggle-image"
        />
      </View>
    );
  }

  // Dual image mode with toggle
  return (
    <View style={styles.container} testID={testID}>
      {/* Image */}
      <View style={styles.imageWrapper}>
        {(isLoading || showLoadingIndicator) && (
          <View style={styles.loadingOverlay} testID="image-loading">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <Image
          source={{ uri: currentUri }}
          style={styles.image}
          resizeMode="contain"
          onLoadStart={() => {
            if (normalizedShowProcessed) {
              setProcessedLoading(true);
            } else {
              setOriginalLoading(true);
            }
          }}
          onLoadEnd={() => {
            if (normalizedShowProcessed) {
              setProcessedLoading(false);
            } else {
              setOriginalLoading(false);
            }
          }}
          accessibilityLabel={normalizedShowProcessed ? 'Ảnh đã xử lý' : 'Ảnh gốc'}
          testID="toggle-image"
        />
      </View>

      {/* Toggle buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonLeft,
            normalizedShowProcessed && styles.toggleButtonActive,
          ]}
          onPress={() => handleToggle(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Ảnh đã xử lý"
          accessibilityState={{ selected: normalizedShowProcessed, disabled }}
          testID="toggle-processed"
        >
          <Text
            style={[
              styles.toggleButtonText,
              normalizedShowProcessed && styles.toggleButtonTextActive,
            ]}
          >
            Đã xử lý
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonRight,
            !normalizedShowProcessed && styles.toggleButtonActive,
          ]}
          onPress={() => handleToggle(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Ảnh gốc"
          accessibilityState={{ selected: !normalizedShowProcessed, disabled }}
          testID="toggle-original"
        >
          <Text
            style={[
              styles.toggleButtonText,
              !normalizedShowProcessed && styles.toggleButtonTextActive,
            ]}
          >
            Gốc
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.body.fontSize,
    color: colors.gray500,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
    minHeight: 44,
  },
  toggleButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.gray300,
  },
  toggleButtonRight: {
    // No additional styles needed
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.gray700,
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
});

export default ImageToggle;