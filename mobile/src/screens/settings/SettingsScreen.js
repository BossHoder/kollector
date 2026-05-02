import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { updateDefaultAssetTheme } from '../../api/authApi';
import {
  createUpgradeRequest,
  getSubscriptionStatus,
  listUpgradeRequests,
} from '../../api/subscriptionApi';
import SubscriptionStateBadge from '../../components/subscription/SubscriptionStateBadge';
import {
  ASSET_THEME_FALLBACK_ID,
  ASSET_THEME_PRESETS,
  getAssetThemePresetById,
  resolveAssetThemeId,
} from '../../config/assetThemePresets';
import { pickImageFromGallery } from '../../services/imagePicker';
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

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const { connectionState, isFallbackActive, reconnectAttempts } = useSocket();
  const toast = useToast();
  const [themeLoading, setThemeLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [requestType, setRequestType] = useState('upgrade');
  const [transferReference, setTransferReference] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const defaultThemeId = user?.settings?.preferences?.assetTheme?.defaultThemeId ?? null;
  const resolvedThemeId = resolveAssetThemeId(null, defaultThemeId);
  const resolvedTheme = getAssetThemePresetById(resolvedThemeId)
    || getAssetThemePresetById(ASSET_THEME_FALLBACK_ID);
  const defaultTheme = getAssetThemePresetById(defaultThemeId);
  const lockedPresetIds = subscriptionData?.entitlements?.theme?.lockedPresetIds || [];

  const themeDescription = useMemo(() => {
    if (defaultTheme) {
      return `Current default: ${defaultTheme.name}`;
    }

    return `Fallback preset: ${resolvedTheme?.name || 'Vault Graphite'}`;
  }, [defaultTheme, resolvedTheme]);

  const loadSubscriptionState = useCallback(async () => {
    try {
      setSubscriptionLoading(true);
      const statusResponse = await getSubscriptionStatus();
      setSubscriptionData(statusResponse?.data || null);
    } catch (error) {
      toast.error(error?.message || 'Unable to load subscription data');
    } finally {
      setSubscriptionLoading(false);
    }

    try {
      const requestsResponse = await listUpgradeRequests();
      setUpgradeRequests(requestsResponse?.data || []);
    } catch (error) {
      toast.error(error?.message || 'Unable to load upgrade requests');
    }
  }, [toast]);

  useEffect(() => {
    void loadSubscriptionState();
  }, [loadSubscriptionState]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
    } catch {
      toast.error('Logout failed');
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
      toast.success(nextThemeId ? 'Default theme updated' : 'Default theme cleared');
    } catch (error) {
      toast.error(error?.message || 'Unable to update default theme');
    } finally {
      setThemeLoading(false);
    }
  }, [toast, updateUser]);

  const handlePickProof = useCallback(async () => {
    const image = await pickImageFromGallery();
    if (image) {
      setProofImage(image);
    }
  }, []);

  const handleSubmitUpgradeRequest = useCallback(async () => {
    if (!transferReference.trim() || !proofImage) {
      toast.error('Transfer reference and proof image are required');
      return;
    }

    try {
      setRequestSubmitting(true);
      await createUpgradeRequest({
        type: requestType,
        transferReference: transferReference.trim(),
        proofFile: {
          uri: proofImage.uri,
          name: proofImage.fileName || 'subscription-proof.jpg',
          type: proofImage.type || 'image/jpeg',
        },
      });
      setTransferReference('');
      setProofImage(null);
      toast.success('Upgrade request submitted');
      await loadSubscriptionState();
    } catch (error) {
      toast.error(error?.message || 'Unable to submit upgrade request');
    } finally {
      setRequestSubmitting(false);
    }
  }, [loadSubscriptionState, proofImage, requestType, toast, transferReference]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Current status</Text>
            {subscriptionData ? (
              <>
                <SubscriptionStateBadge status={subscriptionData.status} />
                <Text style={styles.value}>Tier: {String(subscriptionData.tier || 'free').toUpperCase()}</Text>
                <Text style={styles.value}>
                  Assets: {subscriptionData.usage.assetUsed}/{subscriptionData.usage.assetLimit}
                </Text>
                <Text style={styles.value}>
                  Processing: {subscriptionData.usage.processingUsed}/{subscriptionData.usage.processingLimit}
                </Text>
              </>
            ) : (
              <Text style={styles.value}>{subscriptionLoading ? 'Loading...' : 'Unavailable'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Theme</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Default theme</Text>
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
            accessibilityLabel="Clear default theme"
          >
            {themeLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.clearButtonText}>Clear default theme</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Transfer Upgrade</Text>
          <View style={[styles.row, styles.columnRow]}>
            <Text style={styles.label}>Request type</Text>
            <View style={styles.themeList}>
              {['upgrade', 'renewal'].map((type) => (
                <ThemeChip
                  key={type}
                  label={type === 'upgrade' ? 'Upgrade VIP' : 'Renew VIP'}
                  accentColor={type === 'upgrade' ? colors.primary : colors.warning}
                  selected={requestType === type}
                  disabled={requestSubmitting}
                  onPress={() => setRequestType(type)}
                  testID={`request-type-${type}`}
                />
              ))}
            </View>
            <Text style={styles.label}>Transfer reference</Text>
            <Text style={styles.value}>{transferReference || 'Not set'}</Text>
          </View>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setTransferReference(`BANK-${Date.now()}`)}
            disabled={requestSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.clearButtonText}>Generate quick reference</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handlePickProof}
            disabled={requestSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.clearButtonText}>
              {proofImage ? `Selected: ${proofImage.fileName || 'proof image'}` : 'Pick proof image'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutButton, requestSubmitting && styles.themeChipDisabled]}
            onPress={handleSubmitUpgradeRequest}
            disabled={requestSubmitting}
            accessibilityRole="button"
          >
            {requestSubmitting ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.logoutText}>Submit request</Text>
            )}
          </TouchableOpacity>
          {upgradeRequests.length > 0 ? (
            <Text style={[styles.value, styles.requestHistoryText]}>
              Latest: {upgradeRequests[0].type} / {upgradeRequests[0].status}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Realtime</Text>
            <Text
              style={[
                styles.value,
                connectionState === 'connected' && styles.connected,
                connectionState === 'disconnected' && styles.disconnected,
                connectionState === 'reconnecting' && styles.reconnecting,
              ]}
            >
              {connectionState}
            </Text>
          </View>
          <View style={[styles.row, styles.rowSecondary]}>
            <Text style={styles.label}>Polling fallback</Text>
            <Text style={[styles.value, isFallbackActive ? styles.reconnecting : styles.connected]}>
              {isFallbackActive ? 'Enabled (12s)' : 'Off'}
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
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Log out</Text>
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
  requestHistoryText: {
    marginTop: spacing.md,
  },
});
