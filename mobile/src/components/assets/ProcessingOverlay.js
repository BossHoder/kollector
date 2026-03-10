/**
 * ProcessingOverlay Component
 *
 * Semi-transparent overlay shown on asset images while processing.
 * Includes animated indicator and processing status message.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../styles/tokens';
import { coerceBool, assertBool } from '../../utils/coerceBool';

/**
 * ProcessingOverlay - Shows processing state over content
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether overlay is visible
 * @param {string} [props.message='Processing...'] - Status message
 * @param {string} [props.testID] - Test ID for testing
 */
export function ProcessingOverlay({
  visible: rawVisible,
  message = 'Đang xử lý...',
  testID,
}) {
  // Coerce to strict boolean to prevent Android native crash
  const visible = coerceBool(rawVisible);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Pulse animation for the ring
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Rotation animation for the spinner
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      rotateAnimation.start();

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
      };
    }
  }, [visible, pulseAnim, rotateAnim]);

  if (!visible) {
    return null;
  }

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.2],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  assertBool('ProcessingOverlay.visible', visible);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.content}>
        {/* Pulsing ring */}
        <View style={styles.spinnerContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          {/* Rotating spinner */}
          <Animated.View
            style={[
              styles.spinner,
              {
                transform: [{ rotate }],
              },
            ]}
          >
            <View style={styles.spinnerArc} />
          </Animated.View>
        </View>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const SPINNER_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  content: {
    alignItems: 'center',
  },
  spinnerContainer: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    borderRadius: SPINNER_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  spinner: {
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerArc: {
    width: SPINNER_SIZE - 8,
    height: SPINNER_SIZE - 8,
    borderRadius: (SPINNER_SIZE - 8) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.white,
    borderRightColor: colors.white,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.white,
    textAlign: 'center',
  },
});

export default ProcessingOverlay;
