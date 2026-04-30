import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './src/contexts/UserContext';
import { checkAndApplyOtaUpdate } from './src/services/otaUpdates';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export default function App() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void checkAndApplyOtaUpdate('app_start');
    const delayedStartupCheck = setTimeout(() => {
      void checkAndApplyOtaUpdate('app_start_delayed');
    }, 4000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === 'inactive' || previousState === 'background') && nextState === 'active') {
        void checkAndApplyOtaUpdate('app_foreground');
      }
    });

    return () => {
      clearTimeout(delayedStartupCheck);
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <KeyboardProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </KeyboardProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
