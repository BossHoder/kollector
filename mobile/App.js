import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// Providers
import { ToastProvider } from './src/contexts/ToastContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { PendingUploadProvider } from './src/contexts/PendingUploadContext';

// Navigation
import RootNavigator from './src/navigation/RootNavigator';

// UI Components
import ToastHost from './src/components/ui/ToastHost';
import OfflineBanner from './src/components/ui/OfflineBanner';
import ReconnectingBanner from './src/components/ui/ReconnectingBanner';

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <PendingUploadProvider>
            <SocketProvider>
              <NavigationContainer>
                <OfflineBanner />
                <ReconnectingBanner />
                <RootNavigator />
                <ToastHost />
                <StatusBar style="light" />
              </NavigationContainer>
            </SocketProvider>
          </PendingUploadProvider>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
