import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ProcessingQuotaBannerProps {
  processingUsed: number;
  processingLimit: number;
  nextResetAt: string;
  tier: 'free' | 'vip';
  onAction: () => void;
}

function formatResetDate(nextResetAt: string) {
  const parsedDate = new Date(nextResetAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'sớm';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate);
}

export default function ProcessingQuotaBanner({
  processingUsed,
  processingLimit,
  nextResetAt,
  tier,
  onAction,
}: ProcessingQuotaBannerProps) {
  const safeUsed = Number.isFinite(processingUsed) ? Math.max(0, processingUsed) : 0;
  const safeLimit = Number.isFinite(processingLimit) ? Math.max(1, processingLimit) : 1;
  const remaining = Math.max(safeLimit - safeUsed, 0);
  const atLimit = remaining === 0;
  const formattedResetDate = formatResetDate(nextResetAt);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {atLimit ? 'Đã chạm giới hạn lượt xử lý trong tháng' : `Còn ${remaining} lượt xử lý`}
      </Text>
      <Text style={styles.description}>
        {atLimit
          ? `Bạn đang ở gói ${tier === 'vip' ? 'VIP' : 'Miễn phí'} và đã dùng ${safeLimit}/${safeLimit} lượt xử lý trong tháng này.`
          : `Bạn đã dùng ${safeUsed}/${safeLimit} lượt xử lý trong tháng này.`}
      </Text>
      <Text style={styles.description}>{`Đặt lại vào ${formattedResetDate}`}</Text>
      <Pressable
        testID="processing-quota-action"
        onPress={onAction}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{atLimit ? 'Nâng gói VIP' : 'Phân tích tài sản'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0284c7',
    backgroundColor: '#eff6ff',
    padding: 12,
  },
  title: {
    color: '#0c4a6e',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#075985',
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0c4a6e',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
