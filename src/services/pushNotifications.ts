import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
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
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX
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
