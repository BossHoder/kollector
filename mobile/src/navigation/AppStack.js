/**
 * App Stack Navigator
 *
 * Navigation for authenticated users:
 * - Tabs (Library, Upload, Settings)
 * - Asset Detail (modal/push from Library)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabsNavigator from './TabsNavigator';

// Placeholder screen - will be implemented in US3
import AssetDetailScreen from '../screens/assets/AssetDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#10221f' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={TabsNavigator} />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}
