/**
 * Auth Stack Navigator
 *
 * Handles unauthenticated user flow:
 * - Login
 * - Register
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Placeholder screens - will be implemented in US1
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#10221f' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
