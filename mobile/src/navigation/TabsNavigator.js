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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, touchTargetSize } from '../styles/tokens';

// Placeholder screens - will be implemented in user stories
import AssetsLibraryScreen from '../screens/assets/AssetsLibraryScreen';
import UploadScreen from '../screens/upload/UploadScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_VERTICAL_PADDING = 8;

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
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: TAB_BAR_BASE_HEIGHT + insets.bottom,
            paddingBottom: Math.max(insets.bottom, TAB_BAR_VERTICAL_PADDING),
          },
        ],
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
        options={{
          title: 'Thư viện',
          tabBarLabel: 'Thư viện',
          tabBarAccessibilityLabel: 'Tab Thư viện',
          tabBarAccessibilityHint: 'Mở thư viện bộ sưu tập',
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          title: 'Tải lên',
          tabBarLabel: 'Tải lên',
          tabBarAccessibilityLabel: 'Tab Tải lên',
          tabBarAccessibilityHint: 'Mở màn hình tải lên tài sản',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarLabel: 'Cài đặt',
          tabBarAccessibilityLabel: 'Tab Cài đặt',
          tabBarAccessibilityHint: 'Mở màn hình cài đặt',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceDark,
    borderTopColor: colors.borderDark,
    borderTopWidth: 1,
    height: TAB_BAR_BASE_HEIGHT,
    paddingBottom: TAB_BAR_VERTICAL_PADDING,
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
