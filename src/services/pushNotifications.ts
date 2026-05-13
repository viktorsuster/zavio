import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { getActionFromState, getStateFromPath } from '@react-navigation/native';
import { navigationRef } from '../navigation/navigationRef';
import { rootStackLinking } from '../navigation/linking';
import { storageService } from '../storage';
import { apiService } from './api';

type PushPlatform = 'ios' | 'android' | 'unknown';

const resolveProjectId = (): string | null => {
  const easProjectId = Constants.easConfig?.projectId;
  const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  return easProjectId ?? expoProjectId ?? null;
};

const resolvePlatform = (): PushPlatform => {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'unknown';
};

const PUSH_URL_PREFIX = 'sportvia://';

/** Bundled via expo-notifications plugin `sounds` in app.config.js — use this basename in push payloads (iOS `sound`, Android often inherits from channel). */
export const PUSH_NOTIFICATION_SOUND = 'sportvia_ping.wav';

/** Must match `defaultChannel` in app.config.js (expo-notifications). Distinct id so channel sound can apply (Android locks sound on an existing channel id). */
export const ANDROID_PUSH_CHANNEL_ID = 'sportvia_push';

export function configurePushNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    })
  });
}

function extractPathFromPushUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith(PUSH_URL_PREFIX)) {
    return null;
  }
  const path = trimmed.slice(PUSH_URL_PREFIX.length).replace(/^\/+/, '');
  return path.length > 0 ? path : null;
}

export function navigateFromPushNotificationUrl(rawUrl: unknown): void {
  if (typeof rawUrl !== 'string') {
    return;
  }

  const path = extractPathFromPushUrl(rawUrl);
  if (!path) {
    console.warn('[Push] Ignoring notification URL (missing or invalid scheme):', rawUrl);
    return;
  }

  if (!storageService.getToken()) {
    console.log('[Push] Deep link ignored: user not logged in', rawUrl);
    return;
  }

  if (!navigationRef.isReady()) {
    console.warn('[Push] Navigation not ready, cannot open:', rawUrl);
    return;
  }

  const state = getStateFromPath(path, rootStackLinking.config);
  if (!state) {
    console.warn('[Push] No navigation state for path:', path);
    return;
  }

  const action = getActionFromState(state, rootStackLinking.config);
  if (!action) {
    console.warn('[Push] No action from state for path:', path);
    return;
  }

  navigationRef.dispatch(action);
}

export function registerPushNotificationDeepLinkListeners(): () => void {
  const openedSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    navigateFromPushNotificationUrl(data?.url);
  });

  return () => {
    openedSub.remove();
  };
}

export async function flushInitialNotificationDeepLink(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return;
  }
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const url = data?.url;
  if (typeof url !== 'string') {
    return;
  }

  const maxAttempts = 40;
  const delayMs = 150;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (navigationRef.isReady()) {
      navigateFromPushNotificationUrl(url);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.warn('[Push] Navigation not ready in time for cold-start deep link:', url);
}

export const syncExpoPushTokenForLoggedInUser = async (): Promise<void> => {
  const platform = resolvePlatform();
  console.log('[Push] Starting token sync. Platform:', platform);

  const authToken = storageService.getToken();
  if (!authToken) {
    console.log('[Push] No auth token, skipping push token sync.');
    return;
  }
  console.log('[Push] Auth token exists, continuing push sync.');

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn('[Push] Missing Expo projectId, skipping token sync.', {
      easProjectId: Constants.easConfig?.projectId ?? null,
      expoProjectId: Constants.expoConfig?.extra?.eas?.projectId ?? null
    });
    return;
  }
  console.log('[Push] Resolved projectId:', projectId);

  if (platform === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_PUSH_CHANNEL_ID, {
      name: 'Sportvia',
      importance: Notifications.AndroidImportance.MAX,
      sound: PUSH_NOTIFICATION_SOUND
    });
    console.log('[Push] Android notification channel ensured.');
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let permissionStatus = existingPermission.status;
  console.log('[Push] Existing notification permission status:', permissionStatus);

  if (permissionStatus !== 'granted') {
    console.log('[Push] Requesting notification permission...');
    const requestedPermission = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermission.status;
    console.log('[Push] Permission status after request:', permissionStatus);
  }

  if (permissionStatus !== 'granted') {
    console.log('[Push] Notification permission not granted.');
    return;
  }

  console.log('[Push] Requesting Expo push token from SDK...');
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;
  console.log('[Push] Expo push token received:', expoPushToken ? `${expoPushToken.slice(0, 24)}...` : null);

  if (!expoPushToken) {
    console.warn('[Push] Expo push token is empty, skipping sync.');
    return;
  }

  const cachedToken = storageService.getExpoPushToken();
  if (cachedToken === expoPushToken) {
    console.log('[Push] Token unchanged, skipping backend sync.');
    return;
  }

  console.log('[Push] Token changed, syncing to backend...');
  await apiService.syncExpoPushToken(expoPushToken, platform);
  console.log('[Push] Backend sync OK, storing token in local cache.');
  storageService.setExpoPushToken(expoPushToken);
  console.log('[Push] Token sync finished successfully.');
};
