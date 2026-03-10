/**
 * Reconnecting Banner Component
 *
 * Displays a banner when socket is reconnecting.
 * Shows after initial disconnect, with optional manual reconnect button.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useSocket } from '../../contexts/SocketContext';
import { colors, spacing, typography, touchTargetSize } from '../../styles/tokens';

export default function ReconnectingBanner() {
  const { isReconnecting, reconnectAttempts, isMaxReconnectReached, forceReconnect } = useSocket();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showBanner = isReconnecting || isMaxReconnectReached;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: showBanner ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: showBanner ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [showBanner, heightAnim, opacityAnim]);

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  // Don't render anything when not showing
  if (!showBanner) {
    return null;
  }

  return (
    <View
      accessible={true}
      role="alert"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[
          styles.container,
          {
            height: animatedHeight,
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.content}>
          {isMaxReconnectReached ? (
            <>
              <Text style={styles.text}>Mất kết nối</Text>
              <TouchableOpacity
                style={styles.reconnectButton}
                onPress={forceReconnect}
                accessibilityLabel="Kết nối lại"
                accessibilityRole="button"
              >
                <Text style={styles.reconnectText}>Kết nối lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.text}>
              Đang kết nối lại{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}...
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  text: {
    color: colors.backgroundDark,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  reconnectButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: touchTargetSize - 16,
    justifyContent: 'center',
  },
  reconnectText: {
    color: colors.warning,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
