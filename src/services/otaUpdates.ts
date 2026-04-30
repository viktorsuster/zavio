import * as Updates from 'expo-updates';

type OtaCheckReason = 'app_start' | 'app_start_delayed' | 'app_foreground';

let isCheckingForUpdate = false;

function isUpdatesRuntimeAvailable() {
  return Updates.isEnabled && !__DEV__;
}

export async function checkAndApplyOtaUpdate(reason: OtaCheckReason) {
  const context = {
    reason,
    isEnabled: Updates.isEnabled,
    channel: Updates.channel ?? 'unknown',
    runtimeVersion: Updates.runtimeVersion ?? 'unknown',
    updateId: Updates.updateId ?? 'embedded',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };

  if (!isUpdatesRuntimeAvailable()) {
    console.log('[OTA] Skipped check - updates runtime unavailable', context);
    return;
  }

  if (isCheckingForUpdate) {
    console.log('[OTA] Check skipped - already in progress', context);
    return;
  }

  isCheckingForUpdate = true;
  console.log('[OTA] Checking for updates', context);

  try {
    const checkResult = await Updates.checkForUpdateAsync();
    console.log('[OTA] Check result', {
      reason,
      isAvailable: checkResult.isAvailable,
      manifestId: checkResult.manifest?.id ?? 'none',
      rolloutKey: checkResult.manifest?.extra?.expoClient?.id ?? 'none',
    });

    if (!checkResult.isAvailable) {
      console.log('[OTA] No update available');
      return;
    }

    console.log('[OTA] Update available, fetching');
    const fetchResult = await Updates.fetchUpdateAsync();
    console.log('[OTA] Fetch result', {
      reason,
      isNew: (fetchResult as { isNew?: boolean }).isNew ?? true,
      manifestId: fetchResult.manifest?.id ?? 'none',
    });

    console.log('[OTA] Update fetched, reloading app');
    await Updates.reloadAsync();
  } catch (error) {
    console.log('[OTA] Update check failed', { reason, error });
  } finally {
    isCheckingForUpdate = false;
  }
}
