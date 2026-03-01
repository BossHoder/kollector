/**
 * Root Navigator
 *
 * Top-level navigator that switches between:
 * - AuthStack (unauthenticated)
 * - AppStack (authenticated)
 *
 * Also shows loading screen during auth initialization.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { colors, typography } from '../styles/tokens';

const Stack = createNativeStackNavigator();

/**
 * Loading screen shown during auth initialization
 */
function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: typography.fontSize.base,
  },
});
