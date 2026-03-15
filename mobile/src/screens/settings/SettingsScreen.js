/**
 * Settings Screen (Placeholder)
 *
 * Will be fully implemented in US5 with:
 * - User email display
 * - Socket connection state
 * - Logout button
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { connectionState, isFallbackActive, reconnectAttempts, isConnected } = useSocket();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công');
    } catch (error) {
      toast.error('Đăng xuất không thành công');
    }
  };

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
          <Text style={styles.sectionTitle}>Trạng thái kết nối</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Kết nối realtime</Text>
            <Text style={[
              styles.value,
              connectionState === 'connected' && styles.connected,
              connectionState === 'disconnected' && styles.disconnected,
              connectionState === 'reconnecting' && styles.reconnecting,
            ]}>
              {connectionState === 'connected' ? 'Đã kết nối' : connectionState === 'disconnected' ? 'Mất kết nối' : connectionState === 'reconnecting' ? 'Đang kết nối lại' : connectionState}
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
