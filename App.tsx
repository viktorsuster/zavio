import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './src/contexts/UserContext';
import { checkAndApplyOtaUpdate } from './src/services/otaUpdates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  configurePushNotificationPresentation,
  flushInitialNotificationDeepLink,
  registerPushNotificationDeepLinkListeners,
  syncExpoPushTokenForLoggedInUser
} from './src/services/pushNotifications';
import { SocketProvider } from './src/contexts/SocketContext';

configurePushNotificationPresentation();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function AppContent() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void checkAndApplyOtaUpdate('app_start');
    const removeDeepLinkListeners = registerPushNotificationDeepLinkListeners();
    void flushInitialNotificationDeepLink().catch((error) => {
      console.warn('[Push] Initial notification deep link failed:', error);
    });
    void syncExpoPushTokenForLoggedInUser().catch((error) => {
      console.warn('[Push] Startup token sync failed:', error);
    });
    const delayedStartupCheck = setTimeout(() => {
      void checkAndApplyOtaUpdate('app_start_delayed');
    }, 4000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === 'inactive' || previousState === 'background') && nextState === 'active') {
        void checkAndApplyOtaUpdate('app_foreground');
        void syncExpoPushTokenForLoggedInUser().catch((error) => {
          console.warn('[Push] Foreground token sync failed:', error);
        });
      }
    });

    return () => {
      removeDeepLinkListeners();
      clearTimeout(delayedStartupCheck);
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <KeyboardProvider>
          <SocketProvider>
            <AppNavigator />
          </SocketProvider>
        </KeyboardProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
