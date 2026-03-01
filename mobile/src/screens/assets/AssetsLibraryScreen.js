/**
 * Assets Library Screen
 *
 * Features:
 * - Asset grid with thumbnails
 * - Skeleton loading state
 * - Status pills with correct color semantics
 * - Filter chips (All, Ready, Processing, etc.)
 * - Infinite scroll with cursor pagination
 * - Pull-to-refresh
 * - Empty state with CTA
 * - Error state with retry
 * - Realtime updates via socket
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteAssets } from '../../hooks/useInfiniteAssets';
import { useSocket } from '../../contexts/SocketContext';
import { StatusPill } from '../../components/ui/StatusPill';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../styles/tokens';
import { coerceBool } from '../../utils/coerceBool';
import { getStatusDisplay } from '../../utils/statusDisplay';
import { createRealtimeMerger } from '../../utils/realtimeMerge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 3) / 2;

// Filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All', status: null },
  { key: 'active', label: 'Ready', status: 'active' },
  { key: 'processing', label: 'Processing', status: 'processing' },
  { key: 'draft', label: 'Draft', status: 'draft' },
  { key: 'failed', label: 'Failed', status: 'failed' },
  { key: 'archived', label: 'Archived', status: 'archived' },
];

/**
 * Filter chip component
 */
function FilterChip({ label, isSelected, onPress, testID }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
      onPress={onPress}
      testID={testID}
      accessibilityState={{ selected: isSelected }}
      accessibilityRole="button"
    >
      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Asset card component
 */
function AssetCard({ asset, onPress }) {
  const statusInfo = getStatusDisplay(asset.status);
  const imageUri = asset.primaryImage?.url || asset.images?.[0]?.url;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${asset.title || 'Untitled asset'}, Status: ${statusInfo.label}`}
      accessibilityRole="button"
    >
      <View style={styles.cardImageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cardImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.statusPillContainer}>
          <StatusPill status={asset.status} size="small" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {asset.title || 'Untitled'}
        </Text>
        {asset.category && (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {asset.category}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onUpload }) {
  return (
    <View style={styles.emptyState} testID="empty-state">
      <Text style={styles.emptyStateTitle}>No assets yet</Text>
      <Text style={styles.emptyStateText}>
        Upload your first collectible to get started
      </Text>
      <Button
        testID="empty-state-cta"
        onPress={onUpload}
        style={styles.emptyStateCta}
      >
        Upload First Asset
      </Button>
    </View>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorStateTitle}>Something went wrong</Text>
      <Text style={styles.errorStateText}>
        {error?.message || 'Failed to load assets'}
      </Text>
      <Button
        testID="retry-button"
        onPress={onRetry}
        variant="secondary"
        style={styles.retryButton}
      >
        Try Again
      </Button>
    </View>
  );
}

export default function AssetsLibraryScreen() {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { onAssetProcessed } = useSocket();

  // Get status from filter selection
  const activeStatus = useMemo(() => {
    const filter = FILTER_OPTIONS.find(f => f.key === selectedFilter);
    return filter?.status;
  }, [selectedFilter]);

  // Fetch assets with infinite scroll
  const {
    assets,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    updateAsset,
  } = useInfiniteAssets({
    status: activeStatus,
    pageSize: 20,
  });

  // Realtime merger to debounce rapid updates
  const mergerRef = useRef(null);
  
  useEffect(() => {
    // Create merger that applies batched updates
    mergerRef.current = createRealtimeMerger((updates) => {
      updates.forEach((update) => {
        updateAsset(update.assetId, update);
      });
    }, { debounceMs: 150 });

    return () => {
      mergerRef.current?.clear();
    };
  }, [updateAsset]);

  // Subscribe to realtime asset_processed events
  useEffect(() => {
    const unsubscribe = onAssetProcessed((payload) => {
      // Add to merger for debounced batched update
      if (mergerRef.current) {
        mergerRef.current.add({
          assetId: payload.assetId,
          status: payload.status,
          aiMetadata: payload.aiMetadata,
          processedImageUrl: payload.processedImageUrl,
        });
      }
    });

    return unsubscribe;
  }, [onAssetProcessed]);

  const handleFilterPress = useCallback((filterKey) => {
    setSelectedFilter(filterKey);
  }, []);

  const handleAssetPress = useCallback((assetId) => {
    navigation.navigate('AssetDetail', { assetId });
  }, [navigation]);

  const handleUploadPress = useCallback(() => {
    navigation.navigate('Upload');
  }, [navigation]);

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore]);

  const renderItem = useCallback(({ item }) => (
    <AssetCard
      asset={item}
      onPress={() => handleAssetPress(item.id)}
    />
  ), [handleAssetPress]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderHeader = useCallback(() => (
    <View style={styles.filtersContainer}>
      <FlatList
        horizontal
        data={FILTER_OPTIONS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersList}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            isSelected={selectedFilter === item.key}
            onPress={() => handleFilterPress(item.key)}
            testID={`filter-${item.key}`}
          />
        )}
      />
    </View>
  ), [selectedFilter, handleFilterPress]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return <EmptyState onUpload={handleUploadPress} />;
  }, [isLoading, handleUploadPress]);

  // Determine content to render
  const showSkeleton = isLoading;
  const showError = !isLoading && error && assets.length === 0;
  const showList = !isLoading && !(error && assets.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>
      
      {showSkeleton && (
        <>
          {renderHeader()}
          <SkeletonList count={6} />
        </>
      )}

      {showError && (
        <>
          {renderHeader()}
          <ErrorState error={error} onRetry={refresh} />
        </>
      )}

      {showList && (
        <FlatList
          testID="assets-list"
          data={assets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={coerceBool(isRefreshing)}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          getItemLayout={(_data, index) => ({
            length: CARD_WIDTH + spacing.md,
            offset: (CARD_WIDTH + spacing.md) * Math.floor(index / 2),
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  
  // Filters
  filtersContainer: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginRight: spacing.xs,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterChipTextSelected: {
    color: colors.white,
  },

  // List
  listContent: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[800],
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  statusPillContainer: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },

  // Loading more
  loadingMore: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateCta: {
    marginTop: spacing.sm,
  },

  // Error state
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorStateTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    color: colors.statusFailed,
    marginBottom: spacing.sm,
  },
  errorStateText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    marginTop: spacing.sm,
  },
});
