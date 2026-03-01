/**
 * Toast Host Component
 *
 * Renders toast notifications in an overlay at the top of the screen.
 * Must be placed at the root of the app (inside ToastProvider).
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../styles/tokens';

const TOAST_COLORS = {
  success: {
    background: colors.success,
    text: '#ffffff',
  },
  error: {
    background: colors.error,
    text: '#ffffff',
  },
  info: {
    background: colors.info,
    text: colors.backgroundDark,
  },
  warning: {
    background: colors.warning,
    text: colors.backgroundDark,
  },
};

/**
 * Individual Toast Component with animation
 */
function ToastItem({ toast, onDismiss }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  const colorScheme = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colorScheme.background },
        { opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <Text
        style={[styles.toastText, { color: colorScheme.text }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      {toast.persistent && (
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Text style={[styles.dismissText, { color: colorScheme.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

/**
 * Toast Host - renders all active toasts
 */
export default function ToastHost() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { pointerEvents: 'box-none' }]}>
      <View style={[styles.toastList, { pointerEvents: 'box-none' }]}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  toastText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
});
