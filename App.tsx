import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './src/contexts/UserContext';
import { checkAndApplyOtaUpdate } from './src/services/otaUpdates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  configurePushNotificationPresentation,
  ForegroundPushNotification,
  flushInitialNotificationDeepLink,
  navigateFromPushNotificationUrl,
  registerPushNotificationForegroundListener,
  registerPushNotificationDeepLinkListeners,
  syncExpoPushTokenForLoggedInUser
} from './src/services/pushNotifications';
import { colors } from './src/constants/colors';

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
  const insets = useSafeAreaInsets();
  const [foregroundPush, setForegroundPush] = useState<ForegroundPushNotification | null>(null);

  const closeForegroundPush = useCallback(() => {
    setForegroundPush(null);
  }, []);

  const openForegroundPush = useCallback(() => {
    if (!foregroundPush) {
      return;
    }
    navigateFromPushNotificationUrl(foregroundPush.url);
    setForegroundPush(null);
  }, [foregroundPush]);

  useEffect(() => {
    void checkAndApplyOtaUpdate('app_start');
    const removeDeepLinkListeners = registerPushNotificationDeepLinkListeners();
    const removeForegroundListener = registerPushNotificationForegroundListener((notification) => {
      setForegroundPush(notification);
    });
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
      removeForegroundListener();
      clearTimeout(delayedStartupCheck);
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <KeyboardProvider>
          <AppNavigator />
          {foregroundPush && (
            <View
              pointerEvents="box-none"
              style={[styles.foregroundPushOverlay, { top: Math.max(insets.top, 8) + 8 }]}
            >
              <View style={styles.foregroundPushCard}>
                <Text style={styles.foregroundPushTitle} numberOfLines={2}>
                  {foregroundPush.title}
                </Text>
                <Text style={styles.foregroundPushBody} numberOfLines={3}>
                  {foregroundPush.body}
                </Text>
                <View style={styles.foregroundPushActions}>
                  <Pressable onPress={closeForegroundPush} style={styles.dismissButton}>
                    <Text style={styles.dismissButtonText}>Zavrieť</Text>
                  </Pressable>
                  <Pressable onPress={openForegroundPush} style={styles.openButton}>
                    <Text style={styles.openButtonText}>Otvoriť</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
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

const styles = StyleSheet.create({
  foregroundPushOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999
  },
  foregroundPushCard: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14
  },
  foregroundPushTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  foregroundPushBody: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6
  },
  foregroundPushActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontWeight: '600'
  },
  openButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  openButtonText: {
    color: '#000000',
    fontWeight: '700'
  }
});
