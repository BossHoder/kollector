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
    return 'soon';
  }

  return new Intl.DateTimeFormat('en-US', {
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
        {atLimit ? 'Monthly processing quota reached' : `${remaining} processing uses left`}
      </Text>
      <Text style={styles.description}>
        {atLimit
          ? `You are on ${tier.toUpperCase()} and reached ${safeLimit}/${safeLimit} processing uses this month.`
          : `You are using ${safeUsed}/${safeLimit} processing uses this month.`}
      </Text>
      <Text style={styles.description}>{`Resets ${formattedResetDate}`}</Text>
      <Pressable
        testID="processing-quota-action"
        onPress={onAction}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{atLimit ? 'Upgrade to VIP' : 'Analyze asset'}</Text>
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
