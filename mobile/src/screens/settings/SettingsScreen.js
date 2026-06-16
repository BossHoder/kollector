import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { getMe, updateDefaultAssetTheme } from '../../api/authApi';
import {
  createUpgradeRequest,
  getSubscriptionStatus,
  listUpgradeRequests,
} from '../../api/subscriptionApi';
import VipUpgradeModal from '../../components/subscription/VipUpgradeModal';
import SubscriptionStateBadge from '../../components/subscription/SubscriptionStateBadge';
import {
  ASSET_THEME_FALLBACK_ID,
  ASSET_THEME_PRESETS,
  getAssetThemePresetById,
  resolveAssetThemeId,
} from '../../config/assetThemePresets';
import {
  VIP_UPGRADE_ACCOUNT_NUMBER,
  VIP_UPGRADE_AMOUNT_VND,
  VIP_UPGRADE_BANK_NAME,
  VIP_UPGRADE_CURRENCY,
} from '../../config/vipUpgrade';
import { copyToClipboard } from '../../services/clipboard';
import { useRealtimeFallback } from '../../hooks/useRealtimeFallback';
import {
  clearVipUpgradeSession,
  getOrCreateVipUpgradeSession,
  refreshVipUpgradeSession,
  VIP_UPGRADE_REFRESH_COOLDOWN_MS,
} from '../../services/vipUpgradeSession';
import {
  borderRadius,
  colors,
  spacing,
  touchTargetSize,
  typography,
} from '../../styles/tokens';

function ThemeChip({
  label,
  accentColor,
  selected,
  disabled,
  onPress,
  testID,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.themeChip,
        selected && styles.themeChipSelected,
        disabled && styles.themeChipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      testID={testID}
    >
      <View style={[styles.themeAccent, { backgroundColor: accentColor }]} />
      <Text style={[styles.themeChipLabel, selected && styles.themeChipLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const RANK_THRESHOLDS = [
  { rank: 'Bronze', minXp: 0, nextRank: 'Silver', nextXp: 500 },
  { rank: 'Silver', minXp: 500, nextRank: 'Gold', nextXp: 2000 },
  { rank: 'Gold', minXp: 2000, nextRank: 'Platinum', nextXp: 5000 },
  { rank: 'Platinum', minXp: 5000, nextRank: 'Diamond', nextXp: 10000 },
  { rank: 'Diamond', minXp: 10000, nextRank: null, nextXp: null },
];

const BADGE_LABELS = {
  FIRST_CLEAN: 'Lần bảo dưỡng đầu',
  '7_DAY_STREAK': 'Chuỗi 7 ngày',
  PRISTINE_COLLECTION: 'Bộ sưu tập tinh tươm',
};

function getRankProgress(totalXp = 0, rank = 'Bronze') {
  const xp = Math.max(0, Number(totalXp) || 0);
  const current = RANK_THRESHOLDS.find((entry) => entry.rank === rank)
    || [...RANK_THRESHOLDS].reverse().find((entry) => xp >= entry.minXp)
    || RANK_THRESHOLDS[0];

  if (!current.nextXp) {
    return {
      xp,
      currentRank: current.rank,
      nextRank: null,
      xpIntoRank: xp - current.minXp,
      xpNeeded: 0,
      progressRatio: 1,
    };
  }

  const xpIntoRank = Math.max(0, xp - current.minXp);
  const xpNeeded = current.nextXp - current.minXp;

  return {
    xp,
    currentRank: current.rank,
    nextRank: current.nextRank,
    xpIntoRank,
    xpNeeded,
    progressRatio: Math.min(1, xpIntoRank / xpNeeded),
  };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { isConnected } = useSocket();
  const toast = useToast();
  const [themeLoading, setThemeLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [settingsRefreshing, setSettingsRefreshing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [vipUpgradeModalVisible, setVipUpgradeModalVisible] = useState(false);
  const [transferReference, setTransferReference] = useState('');
  const [transferReferenceExpiresAt, setTransferReferenceExpiresAt] = useState(null);
  const [transferReferenceLastRefreshedAt, setTransferReferenceLastRefreshedAt] = useState(null);
  const [referenceClock, setReferenceClock] = useState(Date.now());
  const [referenceHydrating, setReferenceHydrating] = useState(false);
  const [referenceRefreshing, setReferenceRefreshing] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const defaultThemeId = user?.settings?.preferences?.assetTheme?.defaultThemeId ?? null;
  const resolvedThemeId = resolveAssetThemeId(null, defaultThemeId);
  const resolvedTheme = getAssetThemePresetById(resolvedThemeId)
    || getAssetThemePresetById(ASSET_THEME_FALLBACK_ID);
  const defaultTheme = getAssetThemePresetById(defaultThemeId);
  const lockedPresetIds = subscriptionData?.entitlements?.theme?.lockedPresetIds || [];
  const latestRequest = upgradeRequests[0] || null;
  const gamification = user?.gamification || {};
  const badges = Array.isArray(gamification.badges) ? gamification.badges : [];
  const rankProgress = getRankProgress(gamification.totalXp, gamification.rank);
  const rankProgressWidth = `${Math.round(rankProgress.progressRatio * 100)}%`;
  const transferReferenceExpiresInMs = Math.max(
    0,
    (transferReferenceExpiresAt || 0) - referenceClock
  );
  const transferReferenceRefreshCooldownMs = Math.max(
    0,
    ((transferReferenceLastRefreshedAt || 0) + VIP_UPGRADE_REFRESH_COOLDOWN_MS) - referenceClock
  );

  const themeDescription = useMemo(() => {
    if (defaultTheme) {
      return `Giao diện mặc định hiện tại: ${defaultTheme.name}`;
    }

    return `Đang dùng giao diện: ${resolvedTheme?.name || 'Kho Lưu Trữ Than Chì'}`;
  }, [defaultTheme, resolvedTheme]);

  const loadSettingsState = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setSettingsRefreshing(true);
    }

    try {
      const profile = await getMe();
      await updateUser(profile);
    } catch (error) {
      if (!silent) {
        toast.error(error?.message || 'Không thể tải dữ liệu tài khoản');
      }
    }

    try {
      setSubscriptionLoading(true);
      const statusResponse = await getSubscriptionStatus();
      setSubscriptionData(statusResponse?.data || null);
    } catch (error) {
      toast.error(error?.message || 'Không thể tải dữ liệu gói đăng ký');
    } finally {
      setSubscriptionLoading(false);
    }

    try {
      const requestsResponse = await listUpgradeRequests();
      setUpgradeRequests(requestsResponse?.data || []);
    } catch (error) {
      toast.error(error?.message || 'Không thể tải danh sách yêu cầu nâng gói');
    } finally {
      if (!silent) {
        setSettingsRefreshing(false);
      }
    }
  }, [toast, updateUser]);

  useEffect(() => {
    void loadSettingsState({ silent: true });
  }, [loadSettingsState]);

  useRealtimeFallback({
    isConnected,
    onPoll: () => loadSettingsState({ silent: true }),
    onReconnect: () => loadSettingsState({ silent: true }),
  });

  useEffect(() => {
    if (!vipUpgradeModalVisible) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setReferenceClock(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [vipUpgradeModalVisible]);

  useEffect(() => {
    if (!vipUpgradeModalVisible || transferReferenceExpiresInMs > 0 || referenceHydrating) {
      return;
    }

    const hydrateFreshSession = async () => {
      setReferenceHydrating(true);
      try {
        const session = await getOrCreateVipUpgradeSession();
        setTransferReference(session.reference);
        setTransferReferenceExpiresAt(session.expiresAt);
        setTransferReferenceLastRefreshedAt(session.lastRefreshedAt);
      } catch (error) {
        toast.error(error?.message || 'Không thể làm mới mã chuyển khoản đã hết hạn');
      } finally {
        setReferenceHydrating(false);
      }
    };

    void hydrateFreshSession();
  }, [referenceHydrating, toast, transferReferenceExpiresInMs, vipUpgradeModalVisible]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công');
    } catch {
      toast.error('Đăng xuất thất bại');
    }
  };

  const handleThemeChange = useCallback(async (nextThemeId) => {
    try {
      setThemeLoading(true);
      const updatedUser = await updateDefaultAssetTheme(nextThemeId);
      await updateUser((prevUser) => {
        const hasReturnedDefaultThemeId = Object.prototype.hasOwnProperty.call(
          updatedUser?.settings?.preferences?.assetTheme || {},
          'defaultThemeId'
        );

        return {
          ...(prevUser || {}),
          ...(updatedUser || {}),
          settings: {
            ...(prevUser?.settings || {}),
            ...(updatedUser?.settings || {}),
            preferences: {
              ...(prevUser?.settings?.preferences || {}),
              ...(updatedUser?.settings?.preferences || {}),
              assetTheme: {
                ...(prevUser?.settings?.preferences?.assetTheme || {}),
                ...(updatedUser?.settings?.preferences?.assetTheme || {}),
                defaultThemeId: hasReturnedDefaultThemeId
                  ? updatedUser.settings.preferences.assetTheme.defaultThemeId
                  : nextThemeId,
              },
            },
          },
        };
      });
      toast.success(nextThemeId ? 'Đã cập nhật giao diện mặc định' : 'Đã xóa giao diện mặc định');
    } catch (error) {
      toast.error(error?.message || 'Không thể cập nhật giao diện mặc định');
    } finally {
      setThemeLoading(false);
    }
  }, [toast, updateUser]);

  const handleOpenVipUpgradeModal = useCallback(async () => {
    try {
      setReferenceHydrating(true);
      const session = await getOrCreateVipUpgradeSession();
      setTransferReference(session.reference);
      setTransferReferenceExpiresAt(session.expiresAt);
      setTransferReferenceLastRefreshedAt(session.lastRefreshedAt);
      setReferenceClock(Date.now());
      setVipUpgradeModalVisible(true);
    } catch (error) {
      toast.error(error?.message || 'Không thể khởi tạo mã chuyển khoản');
    } finally {
      setReferenceHydrating(false);
    }
  }, [toast]);

  const handleCloseVipUpgradeModal = useCallback(() => {
    if (requestSubmitting) {
      return;
    }

    setVipUpgradeModalVisible(false);
  }, [requestSubmitting]);

  const handleRefreshVipUpgradeReference = useCallback(async () => {
    try {
      setReferenceRefreshing(true);
      const { session, refreshed, retryAfterMs } = await refreshVipUpgradeSession();
      setTransferReference(session.reference);
      setTransferReferenceExpiresAt(session.expiresAt);
      setTransferReferenceLastRefreshedAt(session.lastRefreshedAt);
      setReferenceClock(Date.now());

      if (!refreshed) {
        toast.error(`Bạn chỉ có thể làm mới mã sau ${Math.ceil(retryAfterMs / 1000)} giây nữa`);
        return;
      }

      toast.success('Đã làm mới mã chuyển khoản');
    } catch (error) {
      toast.error(error?.message || 'Không thể làm mới mã chuyển khoản');
    } finally {
      setReferenceRefreshing(false);
    }
  }, [toast]);

  const handleCopyVipUpgradeField = useCallback(async (fieldLabel, value) => {
    try {
      await copyToClipboard(value);
      toast.success(`Đã sao chép ${fieldLabel.toLowerCase()}`);
    } catch (error) {
      toast.error(error?.message || `Không thể sao chép ${fieldLabel.toLowerCase()}`);
    }
  }, [toast]);

  const handleSubmitUpgradeRequest = useCallback(async () => {
    if (!transferReference.trim()) {
      toast.error('Không thể tạo mã tham chiếu chuyển khoản');
      return;
    }

    try {
      setRequestSubmitting(true);
      await createUpgradeRequest({
        type: 'upgrade',
        transferReference: transferReference.trim(),
        amount: VIP_UPGRADE_AMOUNT_VND,
        currency: VIP_UPGRADE_CURRENCY,
        bankLabel: VIP_UPGRADE_BANK_NAME,
        payerMask: VIP_UPGRADE_ACCOUNT_NUMBER.slice(-4),
      });
      await clearVipUpgradeSession();
      setVipUpgradeModalVisible(false);
      setTransferReference('');
      setTransferReferenceExpiresAt(null);
      setTransferReferenceLastRefreshedAt(null);
      toast.success('Chuyển khoản đã được ghi nhận, vui lòng chờ duyệt.');
      await loadSettingsState({ silent: true });
    } catch (error) {
      toast.error(error?.message || 'Không thể gửi yêu cầu nâng gói');
    } finally {
      setRequestSubmitting(false);
    }
  }, [loadSettingsState, toast, transferReference]);

  const latestRequestTypeLabel = latestRequest?.type === 'renewal' ? 'Gia hạn VIP' : 'Nâng gói VIP';
  const latestRequestStatusLabel = {
    pending: 'Đang chờ',
    approved: 'Đã duyệt',
    rejected: 'Đã từ chối',
    expired: 'Đã hết hạn',
  }[latestRequest?.status] || latestRequest?.status;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
      </View>
      <ScrollView
        testID="settings-scroll"
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: spacing.lg + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={settingsRefreshing}
            onRefresh={() => loadSettingsState()}
            tintColor={colors.primary}
          />
        )}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến độ sưu tầm</Text>
          <View style={[styles.row, styles.columnRow]}>
            <View style={styles.rankHeader}>
              <View>
                <Text style={styles.label}>Rank {rankProgress.currentRank}</Text>
                <Text style={styles.value}>{rankProgress.xp} XP</Text>
              </View>
              <Text style={styles.streakValue}>{Number(gamification.maintenanceStreak || 0)} ngày</Text>
            </View>
            <View style={styles.progressTrack} testID="rank-progress-track">
              <View style={[styles.progressFill, { width: rankProgressWidth }]} testID="rank-progress-fill" />
            </View>
            <Text style={styles.value} testID="rank-progress-text">
              {rankProgress.nextRank
                ? `${rankProgress.xpIntoRank}/${rankProgress.xpNeeded} XP để lên ${rankProgress.nextRank}`
                : 'Đã đạt rank cao nhất'}
            </Text>
            <Text style={styles.value}>Streak bảo dưỡng: {Number(gamification.maintenanceStreak || 0)} ngày</Text>
            <View style={styles.badgeList} testID="badge-list">
              {badges.length > 0 ? badges.map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Text style={styles.badgeText}>{BADGE_LABELS[badge] || badge}</Text>
                </View>
              )) : (
                <Text style={styles.value}>Chưa có huy hiệu</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gói đăng ký</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Trạng thái hiện tại</Text>
            {subscriptionData ? (
              <>
                <SubscriptionStateBadge status={subscriptionData.status} />
                <Text style={styles.value}>Gói: {subscriptionData.tier === 'vip' ? 'VIP' : 'Free'}</Text>
                <Text style={styles.value}>
                  Tài sản: {subscriptionData.usage.assetUsed}/{subscriptionData.usage.assetLimit}
                </Text>
                <Text style={styles.value}>
                  Lượt xử lý: {subscriptionData.usage.processingUsed}/{subscriptionData.usage.processingLimit}
                </Text>
              </>
            ) : (
              <Text style={styles.value}>{subscriptionLoading ? 'Đang tải...' : 'Không khả dụng'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Chưa đăng nhập'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme tài sản</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Theme mặc định</Text>
            <Text style={styles.value}>{themeDescription}</Text>
          </View>
          <View style={styles.themeList}>
            {ASSET_THEME_PRESETS.filter((preset) => preset.active).map((preset) => {
              const locked = lockedPresetIds.includes(preset.id);

              return (
                <ThemeChip
                  key={preset.id}
                  label={locked ? `${preset.name} (VIP)` : preset.name}
                  accentColor={preset.tokenSet.accent}
                  selected={resolvedThemeId === preset.id}
                  disabled={themeLoading || locked}
                  onPress={() => handleThemeChange(preset.id)}
                  testID={`theme-option-${preset.id}`}
                />
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.clearButton, themeLoading && styles.themeChipDisabled]}
            onPress={() => handleThemeChange(null)}
            disabled={themeLoading}
            accessibilityRole="button"
            accessibilityLabel="Xóa giao diện mặc định"
          >
            {themeLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.clearButtonText}>Xóa giao diện mặc định</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nâng gói VIP</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Thanh toán qua chuyển khoản</Text>
            <Text style={styles.value}>
              Mở mã QR chuyển khoản, sao chép thông tin nhanh và xác nhận sau khi đã chuyển.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleOpenVipUpgradeModal}
            disabled={requestSubmitting}
            accessibilityRole="button"
            testID="open-vip-upgrade-button"
          >
            <Text style={styles.clearButtonText}>Nâng gói lên VIP</Text>
          </TouchableOpacity>
          {latestRequest ? (
            <Text style={[styles.value, styles.requestHistoryText]}>
              Yêu cầu gần nhất: {latestRequestTypeLabel} / {latestRequestStatusLabel}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Đăng xuất"
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
      <VipUpgradeModal
        visible={vipUpgradeModalVisible}
        transferReference={transferReference}
        submitting={requestSubmitting}
        expiresInMs={transferReferenceExpiresInMs}
        refreshCooldownMs={transferReferenceRefreshCooldownMs}
        refreshingReference={referenceRefreshing || referenceHydrating}
        onClose={handleCloseVipUpgradeModal}
        onConfirm={handleSubmitUpgradeRequest}
        onRefreshReference={handleRefreshVipUpgradeReference}
        onCopyField={handleCopyVipUpgradeField}
      />
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
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  columnRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  rankHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  streakValue: {
    color: colors.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderDark,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  badgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badgeChip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  label: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  value: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: touchTargetSize,
  },
  themeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  themeChipDisabled: {
    opacity: 0.6,
  },
  themeAccent: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  themeChipLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  themeChipLabelSelected: {
    color: colors.textPrimary,
  },
  clearButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    minHeight: touchTargetSize,
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  logoutButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: touchTargetSize,
    marginTop: spacing.md,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
  requestHistoryText: {
    marginTop: spacing.md,
  },
});
