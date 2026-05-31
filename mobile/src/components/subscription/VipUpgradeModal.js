import React, { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../ui/Button';
import {
  borderRadius,
  colors,
  spacing,
  touchTargetSize,
  typography,
} from '../../styles/tokens';
import {
  buildVipUpgradeQrUrl,
  formatVipUpgradeAmount,
  VIP_UPGRADE_ACCOUNT_NAME,
  VIP_UPGRADE_ACCOUNT_NUMBER,
  VIP_UPGRADE_AMOUNT_VND,
  VIP_UPGRADE_BANK_NAME,
} from '../../config/vipUpgrade';

function InfoRow({ label, value, onCopy, testID }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} testID={`${testID}-value`}>{value}</Text>
      </View>
      <Button
        variant="ghost"
        size="small"
        onPress={onCopy}
        testID={`${testID}-copy-button`}
      >
        Sao chép
      </Button>
    </View>
  );
}

export default function VipUpgradeModal({
  visible,
  transferReference,
  submitting,
  expiresInMs,
  refreshCooldownMs,
  refreshingReference,
  onClose,
  onConfirm,
  onRefreshReference,
  onCopyField,
}) {
  const qrSource = useMemo(() => {
    if (!transferReference) {
      return null;
    }

    return { uri: buildVipUpgradeQrUrl(transferReference) };
  }, [transferReference]);

  const amountLabel = useMemo(
    () => formatVipUpgradeAmount(VIP_UPGRADE_AMOUNT_VND),
    []
  );

  const expiresInLabel = useMemo(() => {
    const totalSeconds = Math.max(0, Math.ceil((expiresInMs || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [expiresInMs]);

  const refreshCooldownLabel = useMemo(() => {
    if (!refreshCooldownMs || refreshCooldownMs <= 0) {
      return 'Bạn có thể làm mới mã ngay bây giờ.';
    }

    return `Có thể làm mới lại mã sau ${Math.ceil(refreshCooldownMs / 1000)}s.`;
  }, [refreshCooldownMs]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
          >
            <View style={styles.headerBanner}>
              <Text style={styles.headerTitle}>Nạp tiền qua chuyển khoản</Text>
            </View>

            <InfoRow
              label="Ngân hàng"
              value={VIP_UPGRADE_BANK_NAME}
              onCopy={() => onCopyField('Ngân hàng', VIP_UPGRADE_BANK_NAME)}
              testID="vip-upgrade-bank"
            />
            <InfoRow
              label="Tên chủ tài khoản"
              value={VIP_UPGRADE_ACCOUNT_NAME}
              onCopy={() => onCopyField('Tên chủ tài khoản', VIP_UPGRADE_ACCOUNT_NAME)}
              testID="vip-upgrade-account-name"
            />
            <InfoRow
              label="Số tài khoản"
              value={VIP_UPGRADE_ACCOUNT_NUMBER}
              onCopy={() => onCopyField('Số tài khoản', VIP_UPGRADE_ACCOUNT_NUMBER)}
              testID="vip-upgrade-account-number"
            />
            <InfoRow
              label="Số tiền"
              value={amountLabel}
              onCopy={() => onCopyField('Số tiền', String(VIP_UPGRADE_AMOUNT_VND))}
              testID="vip-upgrade-amount"
            />
            <InfoRow
              label="Nội dung chuyển khoản"
              value={transferReference}
              onCopy={() => onCopyField('Nội dung chuyển khoản', transferReference)}
              testID="vip-upgrade-reference"
            />

            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Nạp tiền qua quét mã QR</Text>
              <Text style={styles.sessionText} testID="vip-upgrade-expiry-text">
                Mã có hiệu lực trong {expiresInLabel}
              </Text>
              {qrSource ? (
                <Image
                  source={qrSource}
                  style={styles.qrImage}
                  resizeMode="contain"
                  testID="vip-upgrade-qr-image"
                />
              ) : null}
              <Text style={styles.qrHint}>
                Quét mã để mở app ngân hàng với sẵn số tài khoản, số tiền và mã tham chiếu.
              </Text>
              <Button
                onPress={onRefreshReference}
                variant="ghost"
                size="small"
                loading={refreshingReference}
                disabled={Boolean(refreshCooldownMs) || submitting}
                testID="vip-upgrade-refresh-button"
              >
                Làm mới mã
              </Button>
              <Text style={styles.refreshHint} testID="vip-upgrade-refresh-hint">
                {refreshCooldownLabel}
              </Text>
            </View>

            <View style={styles.actionGroup}>
              <Button
                onPress={onConfirm}
                fullWidth
                loading={submitting}
                testID="vip-upgrade-confirm-button"
              >
                Xác nhận đã chuyển khoản
              </Button>
              <Button
                onPress={onClose}
                fullWidth
                variant="secondary"
                style={styles.cancelButton}
                testID="vip-upgrade-cancel-button"
              >
                Hủy giao dịch
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.backgroundDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBanner: {
    backgroundColor: '#e8f0fa',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: '#13233f',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  infoText: {
    flex: 1,
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  qrSection: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  qrTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  qrImage: {
    width: 240,
    height: 240,
    borderRadius: borderRadius.md,
    backgroundColor: '#ffffff',
  },
  qrHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sessionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  refreshHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actionGroup: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  cancelButton: {
    minHeight: touchTargetSize,
  },
});
