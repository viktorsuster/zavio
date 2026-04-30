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
  const authToken = storageService.getToken();
  if (!authToken) {
    return;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn('[Push] Missing Expo projectId, skipping token sync.');
    return;
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let permissionStatus = existingPermission.status;

  if (permissionStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermission.status;
  }

  if (permissionStatus !== 'granted') {
    console.log('[Push] Notification permission not granted.');
    return;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;

  if (!expoPushToken) {
    return;
  }

  const cachedToken = storageService.getExpoPushToken();
  if (cachedToken === expoPushToken) {
    return;
  }

  await apiService.syncExpoPushToken(expoPushToken, resolvePlatform());
  storageService.setExpoPushToken(expoPushToken);
};
