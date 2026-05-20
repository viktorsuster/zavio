import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { storageService } from '../storage';

const GUEST_PREFIX = 'guest:';

/**
 * Stabilná identita pre Vexo pri režime hosť: ANDROID_ID / iOS IDFV, inak perzistentný fallback v MMKV.
 */
export async function resolveGuestVexoIdentity(): Promise<string> {
  if (Platform.OS === 'android') {
    try {
      const androidId = Application.getAndroidId();
      if (androidId?.length) return `${GUEST_PREFIX}${androidId}`;
    } catch {
      // ignored — fallback nižšie
    }
  }

  if (Platform.OS === 'ios') {
    try {
      const idfv = await Application.getIosIdForVendorAsync();
      if (idfv?.length) return `${GUEST_PREFIX}${idfv}`;
    } catch {
      // ignored
    }
  }

  return `${GUEST_PREFIX}install-${storageService.getOrCreateGuestVexoFallbackId()}`;
}
