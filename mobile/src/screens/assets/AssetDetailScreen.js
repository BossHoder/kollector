/**
 * Asset Detail Screen
 *
 * Displays asset based on status with:
 * - Status pill + title
 * - Processed/Original image toggle
 * - AI Analysis card (when available)
 * - Condition meter (when available)
 * - Metadata card
 * - Actions: Archive (for active), Retry (for failed)
 * - Realtime updates via socket
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';
import { coerceBool } from '../../utils/coerceBool';
import { useAsset } from '../../hooks/useAsset';
import { useSocket } from '../../contexts/SocketContext';
import { archiveAsset, retryAsset } from '../../api/assetsApi';
import { getStatusDisplay } from '../../utils/statusDisplay';
import { useToast } from '../../contexts/ToastContext';
import StatusPill from '../../components/ui/StatusPill';
import ImageToggle from '../../components/assets/ImageToggle';
import ProcessingOverlay from '../../components/assets/ProcessingOverlay';

/**
 * Card component for sections
 */
function Card({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
}

/**
 * Info row for metadata
 */
function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

/**
 * Condition meter component
 */
function ConditionMeter({ condition }) {
  const conditionMap = {
    mint: { label: 'Tuyệt vời', width: 100, color: colors.success },
    excellent: { label: 'Xuất sắc', width: 90, color: '#22c55e' },
    'very-good': { label: 'Rất tốt', width: 75, color: '#84cc16' },
    good: { label: 'Tốt', width: 60, color: '#eab308' },
    fair: { label: 'Trung bình', width: 40, color: colors.warning },
    poor: { label: 'Kém', width: 20, color: colors.error },
  };

  const config = conditionMap[condition?.toLowerCase()] || conditionMap.good;

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
  const { assetId, fromUpload } = route.params || {};
  const { onAssetProcessed } = useSocket();

  const [showProcessed, setShowProcessed] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Determine poll interval based on status
  const { asset, isLoading, error, refetch, updateAsset } = useAsset(assetId, {
    enabled: Boolean(assetId),
    pollInterval: 0, // Realtime handled via socket
  });

  // Subscribe to realtime asset_processed events for this asset
  useEffect(() => {
    const unsubscribe = onAssetProcessed((payload) => {
      // Only update if this event is for our asset
      if (payload.assetId === assetId) {
        updateAsset({
          status: payload.status,
          aiMetadata: payload.aiMetadata,
          aiAnalysis: payload.aiMetadata, // alias
          processedImageUrl: payload.processedImageUrl,
          error: payload.error || null,
        });
      }
    });

    return unsubscribe;
  }, [assetId, onAssetProcessed, updateAsset]);

  // Get toast methods
  const toast = useToast();

  // Handle archive action
  const handleArchive = useCallback(async () => {
    try {
      setActionLoading(true);
      await archiveAsset(assetId);
      updateAsset({ status: 'archived' });
      toast.success('Tài sản đã lưu trữ');
    } catch (err) {
      toast.error('Không thể lưu trữ tài sản');
    } finally {
      setActionLoading(false);
    }
  }, [assetId, updateAsset, toast]);

  // Handle retry action
  const handleRetry = useCallback(async () => {
    try {
      setActionLoading(true);
      await retryAsset(assetId);
      updateAsset({ status: 'processing', error: null });
      toast.success('Phân tích đã được khởi động lại');
    } catch (err) {
      toast.error('Không thể thử lại phân tích');
    } finally {
      setActionLoading(false);
    }
  }, [assetId, updateAsset, toast]);

  // Loading state
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

  // Error state
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
  const statusDisplay = getStatusDisplay(status);
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';
  const isPartial = status === 'partial';
  const isArchived = status === 'archived';
  const canArchive = ['active', 'partial', 'failed'].includes(status);
  const canRetry = isFailed || isPartial;

  // Images - support multiple data shapes from API
  const processedImageUrl = asset.processedImageUrl || asset.processedImage?.url || asset.imageUrl;
  const originalImageUrl = asset.originalImageUrl || asset.primaryImage?.url || asset.imageUrl;

  // AI Analysis data
  const analysis = asset.aiAnalysis || asset.analysis || {};
  const hasAnalysis = Object.keys(analysis).length > 0;
  const condition = asset.condition || analysis.condition;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
          {asset.title || 'Chi tiết tài sản'}
        </Text>
        <View style={styles.statusPillContainer}>
          <StatusPill status={status} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={coerceBool(isLoading)}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Image Section */}
        <View style={styles.imageSection}>
          {!isProcessing && (
            <ImageToggle
              processedUri={processedImageUrl}
              originalUri={originalImageUrl}
              showProcessed={showProcessed}
              onToggle={setShowProcessed}
              disabled={isProcessing}
              testID="image-toggle"
            />
          )}
          {isProcessing && (
            <ProcessingOverlay visible message="Đang phân tích ảnh..." testID="processing-overlay" />
          )}
        </View>

        {/* Error message for failed */}
        {isFailed && asset.error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Phân tích thất bại</Text>
            <Text style={styles.errorCardMessage}>{asset.error}</Text>
          </Card>
        )}

        {/* Partial warning */}
        {isPartial && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningCardTitle}>Phân tích một phần</Text>
            <Text style={styles.warningCardMessage}>
              Một số dữ liệu phân tích có thể không đầy đủ. Bạn có thể thử lại để có kết quả đầy đủ.
            </Text>
          </Card>
        )}

        {/* Condition (if available) */}
        {condition && !isProcessing && (
          <Card title="Tình trạng">
            <ConditionMeter condition={condition} />
          </Card>
        )}

        {/* AI Analysis (if available) */}
        {hasAnalysis && !isProcessing && (
          <Card title="Phân tích AI">
            {(analysis.brand || analysis.details?.brand) && (
              <InfoRow label="Thương hiệu" value={analysis.brand || analysis.details?.brand} />
            )}
            {(analysis.model || analysis.details?.model) && (
              <InfoRow label="Mẫu" value={analysis.model || analysis.details?.model} />
            )}
            {(analysis.colorway || analysis.details?.colorway) && (
              <InfoRow label="Phối màu" value={analysis.colorway || analysis.details?.colorway} />
            )}
            {analysis.year && (
              <InfoRow label="Năm" value={analysis.year} />
            )}
            {analysis.estimatedValue && (
              <InfoRow
                label="Giá trị ước tính"
                value={typeof analysis.estimatedValue === 'string'
                  ? analysis.estimatedValue
                  : `$${analysis.estimatedValue.toLocaleString()}`}
              />
            )}
            {analysis.rarity && (
              <InfoRow label="Độ hiếm" value={analysis.rarity} />
            )}
            {analysis.authenticity && (
              <InfoRow label="Xác thực" value={analysis.authenticity} />
            )}
          </Card>
        )}

        {/* Metadata */}
        <Card title="Chi tiết">
          <InfoRow label="Danh mục" value={asset.category} />
          <InfoRow
            label="Ngày tạo"
            value={
              asset.createdAt
                ? new Date(asset.createdAt).toLocaleDateString('vi-VN')
                : '-'
            }
          />
          {asset.updatedAt && (
            <InfoRow
              label="Cập nhật"
              value={new Date(asset.updatedAt).toLocaleDateString('vi-VN')}
            />
          )}
          {asset.tags && asset.tags.length > 0 && (
            <InfoRow label="Nhãn" value={asset.tags.join(', ')} />
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {canRetry && (
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
          )}

          {canArchive && (
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
          )}
        </View>

        {/* Spacer at bottom */}
        <View style={styles.bottomSpacer} />
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
