import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { updateDefaultAssetTheme } from '../../api/authApi';
import {
  ASSET_THEME_FALLBACK_ID,
  ASSET_THEME_PRESETS,
  getAssetThemePresetById,
  resolveAssetThemeId,
} from '../../config/assetThemePresets';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargetSize,
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

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const { connectionState, isFallbackActive, reconnectAttempts } = useSocket();
  const toast = useToast();
  const [themeLoading, setThemeLoading] = useState(false);

  const defaultThemeId = user?.settings?.preferences?.assetTheme?.defaultThemeId ?? null;
  const resolvedThemeId = resolveAssetThemeId(null, defaultThemeId);
  const resolvedTheme = getAssetThemePresetById(resolvedThemeId)
    || getAssetThemePresetById(ASSET_THEME_FALLBACK_ID);
  const defaultTheme = getAssetThemePresetById(defaultThemeId);

  const themeDescription = useMemo(() => {
    if (defaultTheme) {
      return `Mặc định hiện tại: ${defaultTheme.name}`;
    }

    return `Đang dùng preset fallback: ${resolvedTheme?.name || 'Vault Graphite'}`;
  }, [defaultTheme, resolvedTheme]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công');
    } catch {
      toast.error('Đăng xuất không thành công');
    }
  };

  const handleThemeChange = useCallback(async (nextThemeId) => {
    try {
      setThemeLoading(true);
      const updatedUser = await updateDefaultAssetTheme(nextThemeId);
      await updateUser(updatedUser);
      toast.success(
        nextThemeId
          ? 'Đã cập nhật theme mặc định cho tài sản'
          : 'Đã xóa theme mặc định của tài sản'
      );
    } catch (error) {
      toast.error(error?.message || 'Không thể cập nhật theme mặc định');
    } finally {
      setThemeLoading(false);
    }
  }, [toast, updateUser]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
      </View>
      <View style={styles.content}>
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
            {ASSET_THEME_PRESETS.filter((preset) => preset.active).map((preset) => (
              <ThemeChip
                key={preset.id}
                label={preset.name}
                accentColor={preset.tokenSet.accent}
                selected={defaultThemeId === preset.id}
                disabled={themeLoading}
                onPress={() => handleThemeChange(preset.id)}
                testID={`theme-option-${preset.id}`}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.clearButton, themeLoading && styles.themeChipDisabled]}
            onPress={() => handleThemeChange(null)}
            disabled={themeLoading}
            accessibilityRole="button"
            accessibilityLabel="Xóa theme mặc định"
          >
            {themeLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.clearButtonText}>Xóa theme mặc định</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái kết nối</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Kết nối realtime</Text>
            <Text style={[
              styles.value,
              connectionState === 'connected' && styles.connected,
              connectionState === 'disconnected' && styles.disconnected,
              connectionState === 'reconnecting' && styles.reconnecting,
            ]}>
              {connectionState === 'connected'
                ? 'Đã kết nối'
                : connectionState === 'disconnected'
                  ? 'Mất kết nối'
                  : connectionState === 'reconnecting'
                    ? 'Đang kết nối lại'
                    : connectionState}
            </Text>
          </View>
          <View style={[styles.row, styles.rowSecondary]}>
            <Text style={styles.label}>Polling fallback</Text>
            <Text style={[styles.value, isFallbackActive ? styles.reconnecting : styles.connected]}>
              {isFallbackActive ? 'Đang bật (12s)' : 'Tắt'}
            </Text>
          </View>
          <View style={[styles.row, styles.rowSecondary]}>
            <Text style={styles.label}>Reconnect attempts</Text>
            <Text style={styles.value}>{reconnectAttempts}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Đăng xuất"
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
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
  rowSecondary: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  value: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  connected: {
    color: colors.success,
  },
  disconnected: {
    color: colors.error,
  },
  reconnecting: {
    color: colors.warning,
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
    marginTop: 'auto',
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
});
