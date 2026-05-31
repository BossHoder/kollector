import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusPill } from '../ui/StatusPill';
import { getStatusDisplay } from '../../utils/statusDisplay';
import { colors, spacing, borderRadius, typography } from '../../styles/tokens';

function getPreviewImageUri(asset) {
  return asset.processedImageUrl
    || asset.images?.processed?.url
    || asset.thumbnailUrl
    || asset.primaryImage?.url
    || asset.originalImageUrl
    || asset.images?.original?.url
    || asset.imageUri
    || asset.imageUrl
    || null;
}

export default function AssetCard({ asset, onPress, onRetryPending, compact = false }) {
  const isPendingUpload = asset.status === 'pending_upload';
  const isFailedUpload = asset.status === 'failed_upload';
  const imageUri = getPreviewImageUri(asset);
  const assetTitle = asset.title || 'Tài sản chưa có tên';
  const statusLabel = isPendingUpload
    ? 'Chờ tải lên'
    : isFailedUpload
      ? 'Tải lên thất bại'
      : getStatusDisplay(asset.status).label;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${assetTitle}, trạng thái ${statusLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            testID="asset-card-image"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            {!compact && <Text style={styles.placeholderText}>Không có ảnh</Text>}
          </View>
        )}
        <View style={styles.statusPillContainer}>
          <StatusPill status={asset.status} size="small" />
        </View>
      </View>

      {!compact && (
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{assetTitle}</Text>
          {asset.category ? <Text style={styles.category}>{asset.category}</Text> : null}

          {isPendingUpload ? (
            <Text style={styles.pendingText}>Đang chờ tải lên...</Text>
          ) : null}

          {isFailedUpload ? (
            <>
              <Text style={styles.failedText}>{asset.errorMessage || 'Tải lên thất bại'}</Text>
              <TouchableOpacity
                onPress={() => onRetryPending?.(asset)}
                testID={`retry-pending-${asset.localId}`}
                accessibilityRole="button"
                accessibilityLabel="Thử tải lên lại"
              >
                <Text style={styles.retryText}>Thử tải lên lại</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[800],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  statusPillContainer: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
  },
  category: {
    color: colors.textMuted,
    textTransform: 'capitalize',
    fontSize: typography.fontSizes.sm,
  },
  pendingText: {
    color: colors.warning,
    fontSize: typography.fontSizes.sm,
  },
  failedText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
  },
  retryText: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.sm,
  },
});

export { getPreviewImageUri };
