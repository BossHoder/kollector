import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '../contexts/ToastContext';
import { borderRadius, colors, spacing, typography } from '../styles/tokens';

const GRID_COLUMNS = 6;
const GRID_ROWS = 4;
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

  const visitedCellsRef = useRef(new Set());
  const startedAtRef = useRef(null);
  const previousXRef = useRef(null);
  const lastDirectionRef = useRef(null);
  const successTriggeredRef = useRef(false);

  const resetProgress = () => {
    visitedCellsRef.current = new Set();
    startedAtRef.current = null;
    previousXRef.current = null;
    lastDirectionRef.current = null;
    successTriggeredRef.current = false;
    setCleanedPercentage(0);
    setDirectionChanges(0);
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
      cleanedPercentage >= 80
      && durationMs >= MIN_DURATION_MS
      && directionChanges >= MIN_DIRECTION_CHANGES
    ) {
      successTriggeredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success('Maintenance completed. Syncing in background.');
      onMaintain?.({
        cleanedPercentage,
        durationMs,
      });
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: () => {
      startedAtRef.current = Date.now();
      previousXRef.current = null;
      lastDirectionRef.current = null;
      successTriggeredRef.current = false;
    },
    onPanResponderMove: (event) => {
      if (disabled || !layout.width || !layout.height) {
        return;
      }

      const locationX = Number(event.nativeEvent.locationX || 0);
      const locationY = Number(event.nativeEvent.locationY || 0);
      const column = Math.min(GRID_COLUMNS - 1, Math.max(0, Math.floor((locationX / layout.width) * GRID_COLUMNS)));
      const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((locationY / layout.height) * GRID_ROWS)));
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
        resetProgress();
      }
    },
    onPanResponderTerminate: () => {
      resetProgress();
    },
  }), [cleanedPercentage, directionChanges, disabled, layout.height, layout.width, onMaintain]);

  useEffect(() => {
    maybeCompleteMaintenance();
  }, [cleanedPercentage, directionChanges]);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>Dust Maintenance</Text>
      <Text style={styles.subtitle}>
        Rub back and forth for 2 seconds and clear at least 80% of the dust mask.
      </Text>

      <View
        style={[styles.scrubArea, disabled && styles.scrubAreaDisabled]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setLayout({ width, height });
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.dustOverlay,
            {
              opacity: Math.max(0.15, 1 - (cleanedPercentage / 100)),
            },
          ]}
        />
        <Text style={styles.scrubLabel}>
          {disabled ? 'Maintenance unavailable' : `${cleanedPercentage}% cleaned`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>Health: {Math.round(Number(currentHealth || 0))}</Text>
        <Text style={styles.stat}>Direction changes: {directionChanges}</Text>
      </View>

      <Text style={styles.layerText}>
        Active layers: {visualLayers.length > 0 ? visualLayers.join(', ') : 'none'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  scrubArea: {
    height: 180,
    borderRadius: borderRadius.lg,
    backgroundColor: '#d8cfbf',
    borderWidth: 1,
    borderColor: colors.borderDark,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubAreaDisabled: {
    opacity: 0.5,
  },
  dustOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8f7a5c',
  },
  scrubLabel: {
    color: '#ffffff',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    zIndex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stat: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  layerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
});
