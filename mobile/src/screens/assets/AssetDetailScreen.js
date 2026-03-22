/**
 * Asset Detail Screen
 *
 * Displays asset based on status with:
 * - Status pill + title
 * - Processed/Original image toggle
 * - AI Analysis card (when available)
 * - Condition meter (when available)
 * - Maintenance interaction for eligible active assets
 * - Metadata card
 * - Actions: Archive (for active), Retry (for failed)
 * - Realtime updates via socket
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { archiveAsset, retryAsset } from '../../api/assetsApi';
import { queueAssetMaintenance } from '../../api/gamification';
import AssetMaintenanceRubMask from '../../components/AssetMaintenanceRubMask';
import ImageToggle from '../../components/assets/ImageToggle';
import ProcessingOverlay from '../../components/assets/ProcessingOverlay';
import StatusPill from '../../components/ui/StatusPill';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsset } from '../../hooks/useAsset';
import { useRealtimeFallback } from '../../hooks/useRealtimeFallback';
import { borderRadius, colors, spacing, touchTargetSize, typography } from '../../styles/tokens';
import { normalizeMetadata, getDisplayText } from '../../utils/assetMetadata';
import { coerceBool } from '../../utils/coerceBool';

function Card({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function InfoRow({ label, value }) {
  const displayValue = getDisplayText(value) || '-';

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{displayValue}</Text>
    </View>
  );
}

function ConditionMeter({ condition }) {
  const conditionMap = {
    mint: { label: 'Tuyệt vời', width: 100, color: colors.success },
    excellent: { label: 'Xuất sắc', width: 90, color: '#22c55e' },
    'very-good': { label: 'Rất tốt', width: 75, color: '#84cc16' },
    good: { label: 'Tốt', width: 60, color: '#eab308' },
    fair: { label: 'Trung bình', width: 40, color: colors.warning },
    poor: { label: 'Kém', width: 20, color: colors.error },
  };

  let config;

  if (condition && typeof condition === 'object') {
    const health = condition.health ?? 60;
    const grade = health >= 90
      ? 'mint'
      : health >= 75
        ? 'excellent'
        : health >= 60
          ? 'very-good'
          : health >= 40
            ? 'good'
            : health >= 20
              ? 'fair'
              : 'poor';
    config = { ...conditionMap[grade], width: health };
  } else {
    config = conditionMap[typeof condition === 'string' ? condition.toLowerCase() : ''] || conditionMap.good;
  }

  return (
    <View style={styles.conditionContainer}>
      <View style={styles.conditionHeader}>
        <Text style={styles.conditionLabel}>Tình trạng</Text>
        <Text style={[styles.conditionValue, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      <View style={styles.conditionBar}>
        <View
          style={[
            styles.conditionFill,
            { width: `${config.width}%`, backgroundColor: config.color },
          ]}
        />
      </View>
    </View>
  );
}

export default function AssetDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { assetId } = route.params || {};
  const { onAssetProcessed, isConnected } = useSocket();
  const toast = useToast();
  let insets = { top: 0, right: 0, bottom: 0, left: 0 };

  try {
    insets = useSafeAreaInsets();
  } catch {
    // Tests may render without SafeAreaProvider.
  }

  const [showProcessed, setShowProcessed] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [maintenanceResetKey, setMaintenanceResetKey] = useState(0);

  const { asset, isLoading, error, refetch, updateAsset } = useAsset(assetId, {
    enabled: Boolean(assetId),
    pollInterval: 0,
  });

  useRealtimeFallback({
    isConnected,
    onPoll: refetch,
    onReconnect: refetch,
  });

  useEffect(() => {
    const unsubscribe = onAssetProcessed((payload) => {
      if (payload.assetId === assetId) {
        updateAsset({
          status: payload.status,
          aiMetadata: payload.aiMetadata,
          aiAnalysis: payload.aiMetadata,
          processedImageUrl: payload.processedImageUrl,
          error: payload.error || null,
        });
      }
    });

    return unsubscribe;
  }, [assetId, onAssetProcessed, updateAsset]);

  const handleArchive = useCallback(async () => {
    try {
      setActionLoading(true);
      const updated = await archiveAsset(assetId);
      updateAsset((prev) => ({
        ...prev,
        ...updated,
        status: updated?.status || 'archived',
      }));
      toast.success('Tài sản đã lưu trữ');
    } catch {
      toast.error('Không thể lưu trữ tài sản');
    } finally {
      setActionLoading(false);
    }
  }, [assetId, toast, updateAsset]);

  const handleRetry = useCallback(async () => {
    try {
      setActionLoading(true);
      const updated = await retryAsset(assetId);
      updateAsset((prev) => ({
        ...prev,
        ...updated,
        status: updated?.status || 'processing',
        error: null,
      }));
      toast.success('Phân tích đã được khởi động lại');
    } catch {
      toast.error('Không thể thử lại phân tích');
    } finally {
      setActionLoading(false);
    }
  }, [assetId, toast, updateAsset]);

  const handleMaintenance = useCallback(async ({ cleanedPercentage, durationMs }) => {
    if (!asset) {
      return;
    }

    try {
      const { flushPromise } = await queueAssetMaintenance({
        asset,
        cleanedPercentage,
        durationMs,
        onOptimisticUpdate: (optimisticState) => {
          updateAsset((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              condition: {
                ...(prev.condition || {}),
                ...(optimisticState.condition || {}),
              },
              visualLayers: optimisticState.visualLayers,
              version: optimisticState.version,
            };
          });
        },
        onRollback: ({ snapshot, error: rollbackError }) => {
          updateAsset((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              condition: snapshot.condition,
              visualLayers: snapshot.visualLayers,
              version: snapshot.version,
            };
          });
          setMaintenanceResetKey((value) => value + 1);
          toast.error(getDisplayText(rollbackError?.message) || 'Đồng bộ bảo trì thất bại, đã khôi phục trạng thái trước đó.');
        },
        onSuccess: (_response, resolvedState) => {
          updateAsset((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              condition: {
                ...(prev.condition || {}),
                ...(resolvedState.condition || {}),
              },
              visualLayers: resolvedState.visualLayers,
              version: resolvedState.version,
            };
          });
        },
      });

      void flushPromise.catch(() => {});
    } catch (maintenanceError) {
      toast.error(getDisplayText(maintenanceError?.message) || 'Không thể xếp hàng bảo trì.');
      setMaintenanceResetKey((value) => value + 1);
      await refetch();
    }
  }, [asset, refetch, toast, updateAsset]);

  if (isLoading && !asset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Đang tải...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !asset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Lỗi</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không thể tải tài sản</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Không tìm thấy</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy tài sản</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = asset.status || 'draft';
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';
  const isPartial = status === 'partial';
  const canArchive = ['active', 'partial', 'failed'].includes(status);
  const canRetry = isFailed || isPartial;

  const processedImageUrl = asset.processedImageUrl || asset.processedImage?.url || asset.imageUrl;
  const originalImageUrl = asset.originalImageUrl || asset.primaryImage?.url || asset.imageUrl;

  const analysis = asset.aiMetadata || asset.aiAnalysis || asset.analysis || {};
  const hasAnalysis = Object.keys(analysis).length > 0;
  const condition = asset.condition || analysis.condition;
  const maintenanceHealth = Number(condition?.health ?? 100);
  const canMaintain = status === 'active' && maintenanceHealth < 80;
  const maintenanceDisabled = status !== 'active';
  const fileMetadata = normalizeMetadata(asset);
  const assetTitle = getDisplayText(asset.title) || 'Asset detail';
  const errorMessage = getDisplayText(asset.error) || getDisplayText(asset.aiMetadata?.error);
  const brandValue = getDisplayText(analysis.brand) || getDisplayText(analysis.details?.brand);
  const modelValue = getDisplayText(analysis.model) || getDisplayText(analysis.details?.model);
  const colorwayValue = getDisplayText(analysis.colorway) || getDisplayText(analysis.details?.colorway);
  const yearValue = getDisplayText(analysis.year);
  const rarityValue = getDisplayText(analysis.rarity);
  const authenticityValue = getDisplayText(analysis.authenticity);
  const estimatedValue = typeof analysis.estimatedValue === 'number'
    ? `$${analysis.estimatedValue.toLocaleString()}`
    : getDisplayText(analysis.estimatedValue);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {assetTitle}
        </Text>
        <View style={styles.statusPillContainer}>
          <StatusPill status={status} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxxl + insets.bottom }]}
        refreshControl={(
          <RefreshControl
            refreshing={coerceBool(isLoading)}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          {!isProcessing ? (
            <ImageToggle
              processedUri={processedImageUrl}
              originalUri={originalImageUrl}
              showProcessed={showProcessed}
              onToggle={setShowProcessed}
              disabled={isProcessing}
              testID="image-toggle"
            />
          ) : (
            <ProcessingOverlay visible message="Đang phân tích ảnh..." testID="processing-overlay" />
          )}
        </View>

        {isFailed && errorMessage ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Phân tích thất bại</Text>
            <Text style={styles.errorCardMessage}>{errorMessage}</Text>
          </Card>
        ) : null}

        {isPartial ? (
          <Card style={styles.warningCard}>
            <Text style={styles.warningCardTitle}>Phân tích một phần</Text>
            <Text style={styles.warningCardMessage}>
              Một số dữ liệu phân tích có thể không đầy đủ. Bạn có thể thử lại để có kết quả đầy đủ.
            </Text>
          </Card>
        ) : null}

        {condition && !isProcessing ? (
          <Card title="Tình trạng">
            <ConditionMeter condition={condition} />
          </Card>
        ) : null}

        {!isProcessing ? (
          <Card title="Maintenance">
            {canMaintain ? (
              <AssetMaintenanceRubMask
                currentHealth={maintenanceHealth}
                onMaintain={handleMaintenance}
                resetKey={maintenanceResetKey}
                visualLayers={asset.visualLayers || []}
              />
            ) : (
              <Text style={styles.maintenanceHint} testID="maintenance-disabled-message">
                {maintenanceDisabled
                  ? 'Maintenance is disabled until this asset becomes active.'
                  : 'This asset is already above 80 health and does not need maintenance yet.'}
              </Text>
            )}
          </Card>
        ) : null}

        {hasAnalysis && !isProcessing ? (
          <Card title="Phân tích AI">
            {brandValue ? <InfoRow label="Thương hiệu" value={brandValue} /> : null}
            {modelValue ? <InfoRow label="Mẫu" value={modelValue} /> : null}
            {colorwayValue ? <InfoRow label="Phối màu" value={colorwayValue} /> : null}
            {yearValue ? <InfoRow label="Năm" value={yearValue} /> : null}
            {estimatedValue ? <InfoRow label="Giá trị ước tính" value={estimatedValue} /> : null}
            {rarityValue ? <InfoRow label="Độ hiếm" value={rarityValue} /> : null}
            {authenticityValue ? <InfoRow label="Xác thực" value={authenticityValue} /> : null}
          </Card>
        ) : null}

        <Card title="Chi tiết">
          <InfoRow label="Tên file" value={fileMetadata.originalFilename} />
          <InfoRow label="Kích thước" value={fileMetadata.fileSizeMB} />
          <InfoRow label="Định dạng" value={fileMetadata.mimeType} />
          <InfoRow label="Tải lên lúc" value={fileMetadata.uploadedAt} />
          <InfoRow label="Danh mục" value={asset.category} />
          <InfoRow
            label="Ngày tạo"
            value={asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('vi-VN') : '-'}
          />
          {asset.updatedAt ? (
            <InfoRow
              label="Cập nhật"
              value={new Date(asset.updatedAt).toLocaleDateString('vi-VN')}
            />
          ) : null}
          {asset.tags && asset.tags.length > 0 ? (
            <InfoRow label="Nhãn" value={asset.tags.join(', ')} />
          ) : null}
        </Card>

        <View style={styles.actionsContainer}>
          {canRetry ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryActionButton]}
              onPress={handleRetry}
              disabled={actionLoading}
              accessibilityLabel="Thử lại phân tích"
              accessibilityRole="button"
              testID="retry-button"
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.retryActionText}>Thử lại phân tích</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {canArchive ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.archiveActionButton,
                canRetry && styles.secondaryAction,
              ]}
              onPress={handleArchive}
              disabled={actionLoading}
              accessibilityLabel="Lưu trữ tài sản"
              accessibilityRole="button"
              testID="archive-button"
            >
              <Text
                style={[
                  styles.archiveActionText,
                  canRetry && styles.secondaryActionText,
                ]}
              >
                Lưu trữ
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.bottomSpacer, { height: spacing.xxl + insets.bottom }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
  },
  backButton: {
    minWidth: touchTargetSize,
    minHeight: touchTargetSize,
    justifyContent: 'center',
  },
  backText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
  },
  statusPillContainer: {
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.backgroundDark,
    fontWeight: typography.fontWeight.semibold,
  },
  imageSection: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  conditionContainer: {
    marginTop: spacing.sm,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  conditionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  conditionValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  conditionBar: {
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  conditionFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  errorCard: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  errorCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorCardMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  warningCard: {
    borderColor: colors.warning,
    borderWidth: 1,
  },
  warningCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  warningCardMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  maintenanceHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    minHeight: touchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  retryActionButton: {
    backgroundColor: colors.primary,
  },
  retryActionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.backgroundDark,
  },
  archiveActionButton: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  archiveActionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  secondaryActionText: {
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
