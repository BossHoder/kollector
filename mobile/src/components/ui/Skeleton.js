/**
 * Skeleton Components
 *
 * Loading placeholder components for:
 * - SkeletonBox: Generic rectangular placeholder
 * - SkeletonText: Text line placeholder with varying widths
 * - SkeletonCard: Asset card placeholder
 * - SkeletonList: List of skeleton cards
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, borderRadius, spacing } from '../../styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Animated shimmer effect for skeleton loaders
 */
function useShimmer() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return opacity;
}

/**
 * Generic rectangular skeleton placeholder
 */
export function SkeletonBox({ width, height, borderRadius: radius = borderRadius.md, style }) {
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Text line skeleton placeholder
 */
export function SkeletonText({ width = '80%', height = 14, style }) {
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        styles.text,
        {
          width,
          height,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Asset card skeleton placeholder
 */
export function SkeletonCard({ style }) {
  const opacity = useShimmer();
  const cardWidth = (SCREEN_WIDTH - spacing.md * 3) / 2; // 2 columns with padding

  return (
    <View style={[styles.card, { width: cardWidth }, style]} testID="skeleton-item">
      {/* Image placeholder */}
      <Animated.View
        style={[
          styles.cardImage,
          { opacity },
        ]}
      />
      
      {/* Content placeholder */}
      <View style={styles.cardContent}>
        <Animated.View
          style={[
            styles.text,
            { width: '75%', height: 16, opacity, marginBottom: spacing.xs },
          ]}
        />
        <Animated.View
          style={[
            styles.text,
            { width: '50%', height: 12, opacity },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * List of skeleton cards for loading state
 */
export function SkeletonList({ count = 6, style }) {
  return (
    <View style={[styles.list, style]} testID="skeleton-loader">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.listItem} />
      ))}
    </View>
  );
}

/**
 * Full-width skeleton row for list views
 */
export function SkeletonRow({ style }) {
  const opacity = useShimmer();

  return (
    <View style={[styles.row, style]} testID="skeleton-item">
      {/* Thumbnail */}
      <Animated.View
        style={[
          styles.rowThumbnail,
          { opacity },
        ]}
      />
      
      {/* Content */}
      <View style={styles.rowContent}>
        <Animated.View
          style={[
            styles.text,
            { width: '70%', height: 16, opacity, marginBottom: spacing.xs },
          ]}
        />
        <Animated.View
          style={[
            styles.text,
            { width: '40%', height: 12, opacity },
          ]}
        />
      </View>

      {/* Status pill placeholder */}
      <Animated.View
        style={[
          styles.rowPill,
          { opacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.neutral[200],
  },
  text: {
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[200],
  },
  cardContent: {
    padding: spacing.sm,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  listItem: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rowThumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[200],
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rowPill: {
    width: 64,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[200],
  },
});

export default {
  Box: SkeletonBox,
  Text: SkeletonText,
  Card: SkeletonCard,
  List: SkeletonList,
  Row: SkeletonRow,
};
