/**
 * Assets Library Screen
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteAssets } from '../../hooks/useInfiniteAssets';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { useSocket } from '../../contexts/SocketContext';
import { usePendingUploadContext } from '../../contexts/PendingUploadContext';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AssetCard from '../../components/assets/AssetCard';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';
import { coerceBool } from '../../utils/coerceBool';
import { createRealtimeMerger } from '../../utils/realtimeMerge';
import { uploadAsset } from '../../api/uploadApi';
import { useRealtimeFallback } from '../../hooks/useRealtimeFallback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const HEADER_H = 60;
const FILTER_H = 132;
const PAGINATION_H = 56;

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả', status: null },
  { key: 'active', label: 'Sẵn sàng', status: 'active' },
  { key: 'processing', label: 'Đang xử lý', status: 'processing' },
  { key: 'partial', label: 'Xử lý một phần', status: 'partial' },
  { key: 'draft', label: 'Bản nháp', status: 'draft' },
  { key: 'failed', label: 'Thất bại', status: 'failed' },
  { key: 'archived', label: 'Đã lưu trữ', status: 'archived' },
];

function GridIcon({ cols, color }) {
  const displayCols = Math.min(cols, 4);
  const rows = cols <= 2 ? 2 : cols <= 4 ? 2 : 4;
  return (
    <View style={{ width: 16, height: 13, flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 1.5 }}>
          {Array.from({ length: displayCols }).map((__, c) => (
            <View key={c} style={{ flex: 1, backgroundColor: color, borderRadius: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Dropdown({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  testID,
  optionTestIdPrefix,
}) {
  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={onToggle}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={styles.dropdownTriggerText}>{value}</Text>
        <Text style={styles.dropdownCaret}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.dropdownOption}
              onPress={() => onSelect(option.key)}
              testID={`${optionTestIdPrefix}-${option.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option.label}`}
            >
              <Text style={styles.dropdownOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyState({ onUpload }) {
  return (
    <View style={styles.emptyState} testID="empty-state">
      <Text style={styles.emptyStateTitle}>Chưa có tài sản</Text>
      <Text style={styles.emptyStateText}>
        Tải lên tài sản đầu tiên của bạn để bắt đầu
      </Text>
      <Button
        testID="empty-state-cta"
        onPress={onUpload}
        style={styles.emptyStateCta}
        accessibilityLabel="Tải lên tài sản đầu tiên"
      >
        Tải lên tài sản đầu tiên
      </Button>
    </View>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorStateTitle}>Đã xảy ra lỗi</Text>
      <Text style={styles.errorStateText}>
        {error?.message || 'Không thể tải tài sản'}
      </Text>
      <Button
        testID="retry-button"
        onPress={onRetry}
        variant="secondary"
        style={styles.retryButton}
        accessibilityLabel="Thử tải lại danh sách"
      >
        Thử lại
      </Button>
    </View>
  );
}

const MemoAssetCard = React.memo(AssetCard);
const MemoDropdown = React.memo(Dropdown);
const MemoEmptyState = React.memo(EmptyState);
const MemoErrorState = React.memo(ErrorState);

export default function AssetsLibraryScreen() {
  const navigation = useNavigation();
  const { categories } = useAssetCategories();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customCategoryFilter, setCustomCategoryFilter] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [numColumns, setNumColumns] = useState(2);
  const [page, setPage] = useState(0);
  const { onAssetProcessed, isConnected } = useSocket();
  const { retryPendingUpload } = usePendingUploadContext();

  const categoryOptions = useMemo(() => ([
    { key: 'all', value: 'all', label: 'Tất cả danh mục' },
    ...categories.map((category) => ({
      key: category.value,
      value: category.value,
      label: category.label,
      allowCustomValue: Boolean(category.allowCustomValue),
    })),
  ]), [categories]);
  const knownCategoryValues = useMemo(
    () => new Set(categoryOptions.map((option) => option.value)),
    [categoryOptions]
  );
  const selectedCategoryKey = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return 'all';
    }

    if (knownCategoryValues.has(selectedCategory)) {
      return selectedCategory;
    }

    return 'other';
  }, [knownCategoryValues, selectedCategory]);

  const cardWidth = useMemo(() => {
    const totalPadding = spacing.md * 2;
    const totalGaps = CARD_GAP * (numColumns - 1);
    return Math.floor((SCREEN_WIDTH - totalPadding - totalGaps) / numColumns);
  }, [numColumns]);

  const listContentStyle = useMemo(() => ({
    paddingHorizontal: numColumns === 1 ? spacing.md : 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  }), [numColumns]);

  const activeStatus = useMemo(() => {
    const filter = FILTER_OPTIONS.find((option) => option.key === selectedFilter);
    return filter?.status;
  }, [selectedFilter]);

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
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    pageSize: 20,
  });

  const cardHeight = useMemo(() => {
    if (numColumns >= 4) return cardWidth;
    return cardWidth + 76;
  }, [numColumns, cardWidth]);

  const itemsPerPage = useMemo(() => {
    const available = SCREEN_HEIGHT - HEADER_H - FILTER_H - PAGINATION_H;
    const rowHeight = cardHeight + CARD_GAP;
    const rows = Math.max(1, Math.floor(available / rowHeight));
    return rows * numColumns;
  }, [cardHeight, numColumns]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(assets.length / itemsPerPage)),
    [assets.length, itemsPerPage]
  );

  const pageAssets = useMemo(
    () => assets.slice(page * itemsPerPage, (page + 1) * itemsPerPage),
    [assets, itemsPerPage, page]
  );

  useEffect(() => {
    setPage(0);
  }, [numColumns, activeStatus, selectedCategory]);

  useRealtimeFallback({
    isConnected,
    onPoll: refresh,
    onReconnect: refresh,
  });

  const mergerRef = useRef(null);

  useEffect(() => {
    mergerRef.current = createRealtimeMerger((updates) => {
      updates.forEach((update) => {
        updateAsset(update.assetId, update);
      });
    }, { debounceMs: 150 });

    return () => {
      mergerRef.current?.clear();
    };
  }, [updateAsset]);

  useEffect(() => {
    const unsubscribe = onAssetProcessed((payload) => {
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
    setOpenDropdown(null);
  }, []);

  const handleCategoryFilterPress = useCallback((categoryKey) => {
    if (categoryKey === 'all') {
      setSelectedCategory('all');
      setCustomCategoryFilter('');
      setOpenDropdown(null);
      return;
    }

    if (categoryKey === 'other') {
      setSelectedCategory(customCategoryFilter.trim() || 'other');
      setOpenDropdown(null);
      return;
    }

    setSelectedCategory(categoryKey);
    setCustomCategoryFilter('');
    setOpenDropdown(null);
  }, [customCategoryFilter]);

  const selectedFilterLabel = useMemo(() => {
    return FILTER_OPTIONS.find((option) => option.key === selectedFilter)?.label || 'Tất cả';
  }, [selectedFilter]);

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryKey === 'other' && customCategoryFilter.trim()) {
      return customCategoryFilter.trim();
    }

    return categoryOptions.find((option) => option.key === selectedCategoryKey)?.label || 'Tất cả danh mục';
  }, [categoryOptions, customCategoryFilter, selectedCategoryKey]);

  const handleRetryPending = useCallback(async (asset) => {
    try {
      await retryPendingUpload(asset.localId, (pendingAsset) => uploadAsset({
        uri: pendingAsset.imageUri,
        fileName: pendingAsset.originalFilename || `retry_${Date.now()}.jpg`,
        category: pendingAsset.category,
        assetName: pendingAsset.title || pendingAsset.originalFilename || 'asset',
      }));
      await refresh();
    } catch {
      // no-op
    }
  }, [refresh, retryPendingUpload]);

  const handleAssetPress = useCallback((assetId) => {
    navigation.navigate('AssetDetail', { assetId });
  }, [navigation]);

  const handleUploadPress = useCallback(() => {
    navigation.navigate('Upload');
  }, [navigation]);

  const handlePrevPage = useCallback(() => {
    setPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    const nextPage = page + 1;
    if ((nextPage + 1) * itemsPerPage >= assets.length && hasMore) {
      loadMore();
    }
    setPage(nextPage);
  }, [assets.length, hasMore, itemsPerPage, loadMore, page]);

  const renderItem = useCallback(({ item }) => (
    <View style={{ width: cardWidth, marginBottom: CARD_GAP }}>
      <MemoAssetCard
        asset={item}
        compact={numColumns >= 4}
        onPress={() => handleAssetPress(item.id)}
        onRetryPending={handleRetryPending}
      />
    </View>
  ), [cardWidth, handleAssetPress, handleRetryPending, numColumns]);

  const keyExtractor = useCallback((item) => String(item.id ?? item._id ?? item.localId ?? ''), []);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return <MemoEmptyState onUpload={handleUploadPress} />;
  }, [handleUploadPress, isLoading]);

  const showSkeleton = isLoading;
  const showError = !isLoading && error && assets.length === 0;
  const showList = !isLoading && !(error && assets.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Thư viện</Text>
        <View style={styles.gridPicker}>
          {[1, 2, 4, 8].map((cols) => {
            const active = numColumns === cols;
            return (
              <TouchableOpacity
                key={cols}
                style={[styles.gridBtn, active && styles.gridBtnActive]}
                onPress={() => setNumColumns(cols)}
                accessibilityRole="button"
                accessibilityLabel={`${cols} cột`}
              >
                <GridIcon cols={cols} color={active ? colors.backgroundDark : colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.dropdownRow}>
          <MemoDropdown
            label="Trạng thái"
            value={selectedFilterLabel}
            options={FILTER_OPTIONS}
            isOpen={openDropdown === 'status'}
            onToggle={() => setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))}
            onSelect={handleFilterPress}
            testID="status-dropdown"
            optionTestIdPrefix="filter"
          />
          <MemoDropdown
            label="Danh mục"
            value={selectedCategoryLabel}
            options={categoryOptions}
            isOpen={openDropdown === 'category'}
            onToggle={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
            onSelect={handleCategoryFilterPress}
            testID="category-dropdown"
            optionTestIdPrefix="category-filter"
          />
        </View>
        {selectedCategoryKey === 'other' && (
          <Input
            label="Danh mục tùy chỉnh"
            value={customCategoryFilter}
            onChangeText={(value) => {
              setCustomCategoryFilter(value);
              setSelectedCategory(value.trim() || 'other');
            }}
            placeholder="Nhập danh mục"
            style={styles.customCategoryInput}
            testID="custom-category-filter-input"
          />
        )}
      </View>

      {openDropdown && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setOpenDropdown(null)}
          activeOpacity={1}
        />
      )}

      {showSkeleton && <SkeletonList count={6} />}
      {showError && <MemoErrorState error={error} onRetry={refresh} />}

      {showList && (
        <>
          <FlatList
            key={`${numColumns}-${page}`}
            testID="assets-list"
            style={{ flex: 1 }}
            data={pageAssets}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: CARD_GAP, paddingHorizontal: spacing.md } : undefined}
            contentContainerStyle={listContentStyle}
            ListEmptyComponent={renderEmpty}
            refreshControl={(
              <RefreshControl
                refreshing={coerceBool(isRefreshing)}
                onRefresh={() => {
                  setPage(0);
                  refresh();
                }}
                tintColor={colors.primary}
              />
            )}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
          />
          {assets.length > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                onPress={handlePrevPage}
                disabled={page === 0}
                accessibilityRole="button"
                accessibilityLabel="Trang trước"
              >
                <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                {page + 1} / {totalPages}{isLoadingMore ? '  ···' : ''}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages - 1 && !hasMore && styles.pageBtnDisabled]}
                onPress={handleNextPage}
                disabled={page >= totalPages - 1 && !hasMore}
                accessibilityRole="button"
                accessibilityLabel="Trang sau"
              >
                <Text style={[styles.pageBtnText, page >= totalPages - 1 && !hasMore && styles.pageBtnTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  gridBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  title: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
    zIndex: 100,
    elevation: 10,
  },
  customCategoryInput: {
    marginTop: spacing.sm,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dropdownWrap: {
    flex: 1,
    zIndex: 1,
  },
  dropdownLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  dropdownTrigger: {
    minHeight: touchTargetSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  dropdownCaret: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    zIndex: 200,
    elevation: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceDark,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dropdownOption: {
    minHeight: touchTargetSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  dropdownOptionText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
  },
  pageBtnTextDisabled: {
    color: colors.textMuted,
  },
  pageInfo: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    minWidth: 72,
    textAlign: 'center',
  },
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
