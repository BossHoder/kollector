import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Canvas, Path, Rect } from '@shopify/react-native-skia';
import { useToast } from '../contexts/ToastContext';
import { borderRadius, colors, spacing, typography } from '../styles/tokens';

const GRID_COLUMNS = 6;
const GRID_ROWS = 6; // slightly taller to match most images
const TOTAL_CELLS = GRID_COLUMNS * GRID_ROWS;
const MIN_DURATION_MS = 2000;
const MIN_DIRECTION_CHANGES = 4;

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function AssetMaintenanceRubMask({
  currentHealth = 100,
  disabled = false,
  onMaintain,
  resetKey = 0,
  testID = 'maintenance-rub-mask',
  visualLayers = [],
}) {
  const toast = useToast();
  const [cleanedPercentage, setCleanedPercentage] = useState(0);
  const [directionChanges, setDirectionChanges] = useState(0);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [pathStr, setPathStr] = useState('');

  const visitedCellsRef = useRef(new Set());
  const startedAtRef = useRef(null);
  const previousXRef = useRef(null);
  const lastDirectionRef = useRef(null);
  const successTriggeredRef = useRef(false);
  const currentPathRef = useRef('');

  const resetProgress = () => {
    visitedCellsRef.current = new Set();
    startedAtRef.current = null;
    previousXRef.current = null;
    lastDirectionRef.current = null;
    successTriggeredRef.current = false;
    currentPathRef.current = '';
    setCleanedPercentage(0);
    setDirectionChanges(0);
    setPathStr('');
  };

  useEffect(() => {
    resetProgress();
  }, [resetKey, disabled]);

  const maybeCompleteMaintenance = () => {
    if (disabled || successTriggeredRef.current || !startedAtRef.current) {
      return;
    }

    const durationMs = Date.now() - startedAtRef.current;
    if (
      cleanedPercentage >= 80 &&
      durationMs >= MIN_DURATION_MS &&
      directionChanges >= MIN_DIRECTION_CHANGES
    ) {
      successTriggeredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success('Maintenance completed. Syncing in background.');
      onMaintain?.({
        cleanedPercentage,
        durationMs,
      });
      // Optionally hide the overlay after success
      setPathStr('');
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => {
      startedAtRef.current = Date.now();
      previousXRef.current = null;
      lastDirectionRef.current = null;
      successTriggeredRef.current = false;
      const x = event.nativeEvent.locationX;
      const y = event.nativeEvent.locationY;
      currentPathRef.current += ` M ${x} ${y}`;
    },
    onPanResponderMove: (event) => {
      if (disabled || !layout.width || !layout.height) {
        return;
      }

      const locationX = Number(event.nativeEvent.locationX || 0);
      const locationY = Number(event.nativeEvent.locationY || 0);
      
      currentPathRef.current += ` L ${locationX} ${locationY}`;
      
      // Throttle Skia path updates to reduce re-renders but keep path smooth
      setPathStr(currentPathRef.current);

      const column = Math.min(
        GRID_COLUMNS - 1,
        Math.max(0, Math.floor((locationX / layout.width) * GRID_COLUMNS))
      );
      const row = Math.min(
        GRID_ROWS - 1,
        Math.max(0, Math.floor((locationY / layout.height) * GRID_ROWS))
      );
      const cellKey = `${column}-${row}`;

      if (!visitedCellsRef.current.has(cellKey)) {
        visitedCellsRef.current.add(cellKey);
        setCleanedPercentage(clampPercentage((visitedCellsRef.current.size / TOTAL_CELLS) * 100));
      }

      if (previousXRef.current !== null) {
        const deltaX = locationX - previousXRef.current;

        if (Math.abs(deltaX) >= 6) {
          const nextDirection = deltaX > 0 ? 'right' : 'left';
          if (lastDirectionRef.current && lastDirectionRef.current !== nextDirection) {
            setDirectionChanges((value) => value + 1);
          }
          lastDirectionRef.current = nextDirection;
        }
      }

      previousXRef.current = locationX;
    },
    onPanResponderRelease: () => {
      maybeCompleteMaintenance();
      if (!successTriggeredRef.current) {
        // user paused, we can just let them continue drawing on next touch without resetting
        // resetProgress(); 
      }
    },
    onPanResponderTerminate: () => {
      // do not reset on terminate, just wait
    },
  }), [cleanedPercentage, directionChanges, disabled, layout.height, layout.width, onMaintain]);

  useEffect(() => {
    maybeCompleteMaintenance();
  }, [cleanedPercentage, directionChanges]);

  if (disabled || currentHealth >= 100 || successTriggeredRef.current) {
    return null;
  }

  // Opacity of dust layer depends on how low the health is.
  // Health 100 -> 0% opacity, Health 0 -> 90% opacity
  const dustOpacity = Math.min(0.9, Math.max(0.1, (100 - currentHealth) / 100));
  
  // Decide dust color based on visual layers
  const hasYellowing = visualLayers.includes('yellowing');
  const dustColor = hasYellowing ? `rgba(180, 160, 50, ${dustOpacity})` : `rgba(143, 122, 92, ${dustOpacity})`;

  return (
    <View 
      style={[StyleSheet.absoluteFill, styles.overlayContainer]} 
      testID={testID}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
      }}
      {...panResponder.panHandlers}
    >
      {layout.width > 0 && layout.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={layout.width} height={layout.height} color={dustColor} />
          {pathStr ? (
            <Path 
              path={pathStr} 
              color="transparent" 
              style="stroke" 
              strokeWidth={50} 
              strokeCap="round" 
              strokeJoin="round" 
              blendMode="clear" 
            />
          ) : null}
        </Canvas>
      )}
      
      <View style={styles.floatingIndicator} pointerEvents="none">
        <Text style={styles.floatingText}>
          {`Lau bụi: ${cleanedPercentage}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: borderRadius.lg, // Match the image toggle border radius
  },
  floatingIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    left: 'auto',
    right: 'auto',
    width: 'auto',
  },
  floatingText: {
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
});
