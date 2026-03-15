/**
 * Toast Host Component
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
    progress: 'rgba(255,255,255,0.9)',
  },
  error: {
    background: colors.error,
    text: '#ffffff',
    progress: 'rgba(255,255,255,0.9)',
  },
  info: {
    background: colors.info,
    text: colors.backgroundDark,
    progress: colors.backgroundDark,
  },
  warning: {
    background: colors.warning,
    text: colors.backgroundDark,
    progress: colors.backgroundDark,
  },
};

function ToastItem({ toast, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const dismissTimerRef = useRef(null);
  const colorScheme = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
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

    if (!toast.persistent) {
      Animated.timing(progress, {
        toValue: 0,
        duration: toast.duration,
        useNativeDriver: false,
      }).start();

      dismissTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss(toast.id));
      }, toast.duration);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [onDismiss, opacity, progress, toast.duration, toast.id, toast.persistent, translateY]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    Animated.parallel([
      Animated.timing(opacity, {
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

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colorScheme.background },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text
        style={[styles.toastText, { color: colorScheme.text }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.dismissButton}
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
      >
        <Text style={[styles.dismissText, { color: colorScheme.text }]}>✕</Text>
      </TouchableOpacity>
      {!toast.persistent && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: colorScheme.progress,
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

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
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  toastText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
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
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressBar: {
    height: '100%',
  },
});
