import * as Updates from 'expo-updates';

type OtaCheckReason = 'app_start' | 'app_foreground';

const FOREGROUND_THROTTLE_MS = 15_000;

let isCheckingForUpdate = false;
let lastForegroundCheckAt = 0;

function isUpdatesRuntimeAvailable() {
  return Updates.isEnabled && !__DEV__;
}

export async function checkAndApplyOtaUpdate(reason: OtaCheckReason) {
  if (!isUpdatesRuntimeAvailable()) {
    return;
  }

  if (isCheckingForUpdate) {
    console.log(`[OTA] Check skipped (${reason}) - already in progress`);
    return;
  }

  if (reason === 'app_foreground') {
    const now = Date.now();
    if (now - lastForegroundCheckAt < FOREGROUND_THROTTLE_MS) {
      return;
    }
    lastForegroundCheckAt = now;
  }

  isCheckingForUpdate = true;
  console.log(`[OTA] Checking for updates (${reason})`);

  try {
    const result = await Updates.checkForUpdateAsync();

    if (!result.isAvailable) {
      console.log('[OTA] No update available');
      return;
    }

    console.log('[OTA] Update available, fetching');
    await Updates.fetchUpdateAsync();
    console.log('[OTA] Update fetched, reloading app');
    await Updates.reloadAsync();
  } catch (error) {
    console.log('[OTA] Update check failed', error);
  } finally {
    isCheckingForUpdate = false;
  }
}
