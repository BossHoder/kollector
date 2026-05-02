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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
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
import {
  archiveAsset,
  retryAsset,
  triggerEnhancement,
  updateAsset as updateAssetRequest,
} from '../../api/assetsApi';
import { queueAssetMaintenance } from '../../api/gamification';
import { getSubscriptionStatus } from '../../api/subscriptionApi';
import AssetMaintenanceRubMask from '../../components/AssetMaintenanceRubMask';
import ImageToggle from '../../components/assets/ImageToggle';
import ProcessingOverlay from '../../components/assets/ProcessingOverlay';
import StatusPill from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsset } from '../../hooks/useAsset';
import { useRealtimeFallback } from '../../hooks/useRealtimeFallback';
import {
  ASSET_THEME_FALLBACK_ID,
  ASSET_THEME_PRESETS,
  getAssetThemePresetById,
  resolveAssetThemeId,
} from '../../config/assetThemePresets';
import { borderRadius, colors, spacing, touchTargetSize, typography } from '../../styles/tokens';
import { normalizeMetadata, getDisplayText } from '../../utils/assetMetadata';
import { coerceBool } from '../../utils/coerceBool';

function hexToRgb(hex) {
  if (typeof hex !== 'string') {
    return null;
  }

  const normalizedHex = hex.trim().replace('#', '');

  if (!/^[\da-f]{3}$|^[\da-f]{6}$/i.test(normalizedHex)) {
    return null;
  }

  const expandedHex = normalizedHex.length === 3
    ? normalizedHex.split('').map((value) => `${value}${value}`).join('')
    : normalizedHex;

  const colorValue = Number.parseInt(expandedHex, 16);

  return {
    r: (colorValue >> 16) & 255,
    g: (colorValue >> 8) & 255,
    b: colorValue & 255,
  };
}

function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getContrastingTextColor(backgroundHex) {
  const rgb = hexToRgb(backgroundHex);

  if (!rgb) {
    return colors.backgroundDark;
  }

  const luminance = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  return luminance > 150 ? colors.backgroundDark : colors.textPrimary;
}

function buildAssetThemePalette(themePreset) {
  const tokenSet = themePreset?.tokenSet || {};
  const surface = tokenSet.surface || colors.backgroundDark;
  const surfaceElevated = tokenSet.surfaceElevated || colors.surfaceDark;
  const textPrimary = tokenSet.text || colors.textPrimary;
  const accent = tokenSet.accent || colors.primary;

  return {
    surface,
    surfaceElevated,
    textPrimary,
    textSecondary: withAlpha(textPrimary, 0.78),
    textMuted: withAlpha(textPrimary, 0.58),
    accent,
    accentSoft: withAlpha(accent, 0.18),
    accentBorder: withAlpha(accent, 0.42),
    accentText: getContrastingTextColor(accent),
    border: withAlpha(textPrimary, 0.12),
    divider: withAlpha(textPrimary, 0.12),
    chipBackground: withAlpha(textPrimary, 0.06),
    chipSelectedBackground: withAlpha(accent, 0.16),
    chipSelectedText: textPrimary,
    placeholderBackground: withAlpha(surfaceElevated, 0.95),
  };
}

const DEFAULT_ASSET_THEME_PALETTE = buildAssetThemePalette(
  getAssetThemePresetById(ASSET_THEME_FALLBACK_ID)
);
const AssetThemeContext = createContext(DEFAULT_ASSET_THEME_PALETTE);

function Card({ title, children, style, theme }) {
  const contextTheme = useContext(AssetThemeContext);
  const resolvedTheme = theme || contextTheme;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: resolvedTheme.surfaceElevated,
          borderColor: resolvedTheme.border,
        },
        style,
      ]}
    >
      {title ? (
        <Text style={[styles.cardTitle, { color: resolvedTheme.textPrimary }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

function InfoRow({ label, value, theme }) {
  const contextTheme = useContext(AssetThemeContext);
  const resolvedTheme = theme || contextTheme;
  const displayValue = getDisplayText(value) || '-';

  return (
    <View style={[styles.infoRow, { borderBottomColor: resolvedTheme.divider }]}>
      <Text style={[styles.infoLabel, { color: resolvedTheme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: resolvedTheme.textPrimary }]}>{displayValue}</Text>
    </View>
  );
}

function ThemeChip({
  label,
  accentColor,
  selected,
  onPress,
  disabled,
  testID,
  theme,
}) {
  const contextTheme = useContext(AssetThemeContext);
  const resolvedTheme = theme || contextTheme;

  return (
    <TouchableOpacity
      style={[
        styles.themeChip,
        {
          borderColor: resolvedTheme.border,
          backgroundColor: resolvedTheme.chipBackground,
        },
        selected && styles.themeChipSelected,
        selected && {
          borderColor: resolvedTheme.accentBorder,
          backgroundColor: resolvedTheme.chipSelectedBackground,
        },
        disabled && styles.themeChipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      testID={testID}
    >
      <View style={[styles.themeAccent, { backgroundColor: accentColor }]} />
      <Text
        style={[
          styles.themeChipText,
          { color: resolvedTheme.textSecondary },
          selected && styles.themeChipTextSelected,
          selected && { color: resolvedTheme.chipSelectedText },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ConditionMeter({ condition, theme }) {
  const contextTheme = useContext(AssetThemeContext);
  const resolvedTheme = theme || contextTheme;
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
      <View style={[styles.conditionBar, { backgroundColor: resolvedTheme.chipBackground }]}>
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
  const { onAssetProcessed, onAssetImageEnhanced, isConnected } = useSocket();
  const { user } = useAuth();
  const toast = useToast();
  let insets = { top: 0, right: 0, bottom: 0, left: 0 };

  try {
    insets = useSafeAreaInsets();
  } catch {
    // Tests may render without SafeAreaProvider.
  }

  const [showProcessed, setShowProcessed] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [enhancementLoading, setEnhancementLoading] = useState(false);
  const [themeLoading, setThemeLoading] = useState(false);
  const [maintenanceResetKey, setMaintenanceResetKey] = useState(0);
  const [subscriptionData, setSubscriptionData] = useState(null);

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
    let active = true;

    getSubscriptionStatus()
      .then((response) => {
        if (active) {
          setSubscriptionData(response?.data || null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAssetProcessed((payload) => {
      if (payload.assetId === assetId) {
        updateAsset((prev) => {
          if (!prev) {
            return prev;
          }

          const nextImages = {
            ...(prev.images || {}),
          };

          if (payload.processedImageUrl) {
            nextImages.processed = {
              ...(prev.images?.processed || {}),
              url: payload.processedImageUrl,
            };
          }

          return {
            ...prev,
            status: payload.status,
            aiMetadata: payload.aiMetadata,
            aiAnalysis: payload.aiMetadata,
            images: nextImages,
            processedImageUrl: payload.processedImageUrl || prev.processedImageUrl,
            detailImageUrl: payload.processedImageUrl || prev.detailImageUrl,
            error: payload.error || null,
          };
        });
      }
    });

    return unsubscribe;
  }, [assetId, onAssetProcessed, updateAsset]);

  useEffect(() => {
    const unsubscribe = onAssetImageEnhanced((payload) => {
      if (payload.assetId !== assetId) {
        return;
      }

      updateAsset((prev) => {
        if (!prev) {
          return prev;
        }

        const nextEnhancement = {
          ...(prev.enhancement || {}),
          status: payload.status,
          attemptCount: payload.attemptCount,
          completedAt: payload.timestamp,
          errorMessage: payload.error || null,
        };

        const nextImages = {
          ...(prev.images || {}),
        };

        if (payload.enhancedImageUrl) {
          nextImages.enhanced = {
            ...(prev.images?.enhanced || {}),
            url: payload.enhancedImageUrl,
          };
        }

        return {
          ...prev,
          images: nextImages,
          enhancedImageUrl: payload.enhancedImageUrl || prev.enhancedImageUrl,
          status: payload.status === 'failed' ? 'failed' : prev.status,
          error: payload.status === 'failed' ? payload.error || prev.error : prev.error,
          enhancement: nextEnhancement,
        };
      });
    });

    return unsubscribe;
  }, [assetId, onAssetImageEnhanced, updateAsset]);

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

  const handleEnhancement = useCallback(async () => {
    try {
      setEnhancementLoading(true);
      const response = await triggerEnhancement(assetId);
      updateAsset((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          status: 'processing',
          enhancement: {
            ...(prev.enhancement || {}),
            status: response?.data?.status || 'queued',
            lastJobId: response?.data?.jobId || prev.enhancement?.lastJobId,
            requestedAt: new Date().toISOString(),
            errorMessage: null,
          },
        };
      });
      toast.success('Đã xếp hàng tăng cường và tái xử lý ảnh');
    } catch (error) {
      toast.error(error?.message || 'Không thể khởi động workflow tăng cường ảnh');
    } finally {
      setEnhancementLoading(false);
    }
  }, [assetId, toast, updateAsset]);

  const handleThemeOverride = useCallback(async (themeOverrideId) => {
    try {
      setThemeLoading(true);
      const updatedAsset = await updateAssetRequest(assetId, {
        presentation: {
          themeOverrideId,
        },
      });

      updateAsset((prev) => {
        const hasReturnedThemeOverrideId = Object.prototype.hasOwnProperty.call(
          updatedAsset?.presentation || {},
          'themeOverrideId'
        );

        return {
          ...(prev || {}),
          ...updatedAsset,
          presentation: {
            ...(prev?.presentation || {}),
            ...(updatedAsset?.presentation || {}),
            themeOverrideId: hasReturnedThemeOverrideId
              ? updatedAsset.presentation.themeOverrideId
              : themeOverrideId,
          },
        };
      });

      toast.success(
        themeOverrideId
          ? 'Đã cập nhật theme cho tài sản'
          : 'Đã xóa theme override của tài sản'
      );
    } catch (error) {
      toast.error(error?.message || 'Không thể cập nhật theme tài sản');
    } finally {
      setThemeLoading(false);
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
  const enhancement = asset.enhancement || {};
  const enhancementStatus = enhancement.status || 'idle';
  const enhancementBusy = enhancementStatus === 'queued' || enhancementStatus === 'processing';
  const enhancementWorkflowBusy = enhancementBusy || enhancementLoading || isProcessing;
  const assetThemeOverrideId = asset.presentation?.themeOverrideId ?? null;
  const userDefaultThemeId = user?.settings?.preferences?.assetTheme?.defaultThemeId ?? null;
  const lockedPresetIds = subscriptionData?.entitlements?.theme?.lockedPresetIds || [];
  const maintenanceMultiplier = subscriptionData?.entitlements?.maintenanceExpMultiplier || 1;
  const resolvedThemeId = resolveAssetThemeId(assetThemeOverrideId, userDefaultThemeId);
  const resolvedTheme = getAssetThemePresetById(resolvedThemeId)
    || getAssetThemePresetById(ASSET_THEME_FALLBACK_ID);
  const overrideTheme = getAssetThemePresetById(assetThemeOverrideId);
  const themePalette = buildAssetThemePalette(resolvedTheme);

  const processedImageUrl =
    asset.processedImageUrl
    || asset.images?.processed?.url
    || asset.detailImageUrl
    || asset.enhancedImageUrl
    || asset.images?.enhanced?.url
    || asset.processedImage?.url
    || asset.imageUrl;
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
    <AssetThemeContext.Provider value={themePalette}>
      <SafeAreaView style={[styles.container, { backgroundColor: themePalette.surface }]}>
        <View style={[styles.header, { borderBottomColor: themePalette.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: themePalette.textPrimary }]} numberOfLines={1}>
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
              tintColor={themePalette.accent}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.imageSection}>
          {!isProcessing ? (
            <View style={{ position: 'relative' }}>
              <ImageToggle
                processedUri={processedImageUrl}
                originalUri={originalImageUrl}
                showProcessed={showProcessed}
                onToggle={setShowProcessed}
                disabled={isProcessing || canMaintain}
                testID="image-toggle"
                theme={themePalette}
              />
              {canMaintain ? (
                <AssetMaintenanceRubMask
                  currentHealth={maintenanceHealth}
                  onMaintain={handleMaintenance}
                  resetKey={maintenanceResetKey}
                  visualLayers={asset.visualLayers || []}
                />
              ) : null}
            </View>
          ) : (
            <ProcessingOverlay visible message="Đang phân tích ảnh..." testID="processing-overlay" />
          )}
        </View>

        {isFailed && errorMessage ? (
          <Card style={styles.errorCard} theme={themePalette}>
            <Text style={styles.errorCardTitle}>Phân tích thất bại</Text>
            <Text style={[styles.errorCardMessage, { color: themePalette.textSecondary }]}>{errorMessage}</Text>
          </Card>
        ) : null}

        {isPartial ? (
          <Card style={styles.warningCard} theme={themePalette}>
            <Text style={styles.warningCardTitle}>Phân tích một phần</Text>
            <Text style={[styles.warningCardMessage, { color: themePalette.textSecondary }]}>
              Một số dữ liệu phân tích có thể không đầy đủ. Bạn có thể thử lại để có kết quả đầy đủ.
            </Text>
            <Text style={[styles.maintenanceHint, { color: themePalette.textSecondary, marginTop: spacing.sm }]}>
              {maintenanceMultiplier >= 3
                ? 'VIP reward active: maintenance grants 3x EXP.'
                : 'Free reward active: maintenance grants base EXP.'}
            </Text>
          </Card>
        ) : null}

        <Card title="Tăng cường và tái xử lý ảnh">
          <InfoRow label="Trạng thái" value={enhancementStatus} />
          {typeof enhancement.attemptCount === 'number' ? (
            <InfoRow label="Số lần thử" value={String(enhancement.attemptCount)} />
          ) : null}
          {getDisplayText(enhancement.errorMessage) ? (
            <Text style={styles.inlineErrorText}>{getDisplayText(enhancement.errorMessage)}</Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.retryActionButton,
              {
                backgroundColor: themePalette.accent,
              },
              enhancementWorkflowBusy && styles.disabledAction,
            ]}
            onPress={handleEnhancement}
            disabled={enhancementWorkflowBusy}
            accessibilityRole="button"
            accessibilityLabel="Tăng cường và tái xử lý ảnh"
            testID="enhance-image-button"
          >
            {enhancementLoading ? (
              <ActivityIndicator size="small" color={themePalette.accentText} />
            ) : (
              <Text style={[styles.retryActionText, { color: themePalette.accentText }]}>
                {enhancementWorkflowBusy
                  ? 'Đang tăng cường và tái xử lý ảnh'
                  : 'Tăng cường và tái xử lý ảnh'}
              </Text>
            )}
          </TouchableOpacity>
        </Card>

        <Card title="Theme tài sản">
          <InfoRow
            label="Theme đang áp dụng"
            value={resolvedTheme?.name || 'Vault Graphite'}
          />
          <InfoRow
            label="Override riêng"
            value={overrideTheme?.name || 'Không'}
          />
          <View style={styles.themeList}>
            {ASSET_THEME_PRESETS.filter((preset) => preset.active).map((preset) => (
              <ThemeChip
                key={preset.id}
                label={lockedPresetIds.includes(preset.id) ? `${preset.name} (VIP)` : preset.name}
                accentColor={preset.tokenSet.accent}
                selected={resolvedThemeId === preset.id}
                onPress={() => handleThemeOverride(preset.id)}
                disabled={themeLoading || lockedPresetIds.includes(preset.id)}
                testID={`asset-theme-${preset.id}`}
                theme={themePalette}
              />
            ))}
          </View>
          {lockedPresetIds.length > 0 ? (
            <Text style={[styles.inlineErrorText, { color: themePalette.textSecondary }]}>
              VIP-only presets stay visible on downgraded assets but cannot be newly applied.
            </Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.archiveActionButton,
              styles.clearThemeButton,
              {
                backgroundColor: themePalette.chipBackground,
                borderColor: themePalette.border,
              },
              themeLoading && styles.disabledAction,
            ]}
            onPress={() => handleThemeOverride(null)}
            disabled={themeLoading}
            accessibilityRole="button"
            accessibilityLabel="Xóa theme override"
          >
            {themeLoading ? (
              <ActivityIndicator size="small" color={themePalette.textSecondary} />
            ) : (
              <Text style={styles.archiveActionText}>Xóa theme override</Text>
            )}
          </TouchableOpacity>
        </Card>

        {condition && !isProcessing ? (
          <Card title="Tình trạng">
            <ConditionMeter condition={condition} />
          </Card>
        ) : null}

        {!isProcessing && !canMaintain ? (
          <Card title="Maintenance">
            <Text style={[styles.maintenanceHint, { color: themePalette.textSecondary }]} testID="maintenance-disabled-message">
              {maintenanceDisabled
                ? 'Maintenance is disabled until this asset becomes active.'
                : 'Tài sản đang còn mới, trên 80 điểm sạch sẽ. Chưa cần lau chùi..'}
            </Text>
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
              style={[
                styles.actionButton,
                styles.retryActionButton,
                {
                  backgroundColor: themePalette.accent,
                },
              ]}
              onPress={handleRetry}
              disabled={actionLoading}
              accessibilityLabel="Thử lại phân tích"
              accessibilityRole="button"
              testID="retry-button"
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={themePalette.accentText} />
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
                {
                  backgroundColor: canRetry ? 'transparent' : themePalette.chipBackground,
                  borderColor: themePalette.border,
                },
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
                  { color: themePalette.textSecondary },
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
    </AssetThemeContext.Provider>
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
  inlineErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  themeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTargetSize,
  },
  themeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceDark,
  },
  themeChipDisabled: {
    opacity: 0.6,
  },
  themeAccent: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  themeChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  themeChipTextSelected: {
    color: colors.textPrimary,
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
  disabledAction: {
    opacity: 0.65,
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
  clearThemeButton: {
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
