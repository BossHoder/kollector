/**
 * Tabs Navigator
 *
 * Bottom tab navigation for authenticated users:
 * - Library (Assets)
 * - Upload
 * - Settings
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Text } from 'react-native';
import { colors, typography, touchTargetSize } from '../styles/tokens';

// Placeholder screens - will be implemented in user stories
import AssetsLibraryScreen from '../screens/assets/AssetsLibraryScreen';
import UploadScreen from '../screens/upload/UploadScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

/**
 * Simple tab bar icon component
 * TODO: Replace with proper icons in US1 implementation
 */
function TabIcon({ label, focused }) {
  const iconMap = {
    Library: '📚',
    Upload: '📤',
    Settings: '⚙️',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={styles.icon}>{iconMap[label] || '•'}</Text>
    </View>
  );
}

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarItemStyle: styles.tabItem,
      })}
    >
      <Tab.Screen
        name="Library"
        component={AssetsLibraryScreen}
        options={{ title: 'Library' }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{ title: 'Upload' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceDark,
    borderTopColor: colors.borderDark,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    minHeight: touchTargetSize,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
