import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AssetCapBannerProps {
  assetUsed: number;
  assetLimit: number;
  tier: 'free' | 'vip';
  onCreate: () => void;
}

export default function AssetCapBanner({
  assetUsed,
  assetLimit,
  tier,
  onCreate,
}: AssetCapBannerProps) {
  const safeUsed = Number.isFinite(assetUsed) ? Math.max(0, assetUsed) : 0;
  const safeLimit = Number.isFinite(assetLimit) ? Math.max(1, assetLimit) : 1;
  const remaining = Math.max(safeLimit - safeUsed, 0);
  const atLimit = remaining === 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {atLimit ? 'Asset limit reached' : `${remaining} slots left`}
      </Text>
      <Text style={styles.description}>
        {atLimit
          ? `You are on ${tier.toUpperCase()} and reached ${safeLimit} assets.`
          : `You are using ${safeUsed}/${safeLimit} assets.`}
      </Text>
      <Pressable
        testID="asset-cap-create"
        accessibilityState={{ disabled: atLimit }}
        disabled={atLimit}
        onPress={() => {
          if (!atLimit) {
            onCreate();
          }
        }}
        style={[styles.button, atLimit ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonLabel}>{atLimit ? 'Upgrade to VIP' : 'Create asset'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fff7ed',
    padding: 12,
  },
  title: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#78350f',
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#92400e',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
