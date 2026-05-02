import { Alert } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { storageService } from '../storage';

/**
 * Hosť ukončí režim a vráti sa na login (bez zmien účtu v pozadí).
 */
export function promptLoginToContinue(
  title = 'Prihlásenie',
  message = 'Pre túto funkciu sa prosím prihlás.'
): void {
  Alert.alert(title, message, [
    { text: 'Zrušiť', style: 'cancel' },
    {
      text: 'Prihlásiť sa',
      style: 'default',
      onPress: () => {
        storageService.setGuestMode(false);
      }
    }
  ]);
}

/** Variant s vyčistením user cache po návrate na login (bez zápisného účtu). */
export function promptLoginToContinueAndClearUserCache(
  queryClient: QueryClient | undefined,
  title?: string,
  message?: string
): void {
  Alert.alert(title ?? 'Prihlásenie', message ?? 'Pre túto funkciu sa prosím prihlás.', [
    { text: 'Zrušiť', style: 'cancel' },
    {
      text: 'Prihlásiť sa',
      style: 'default',
      onPress: () => {
        storageService.setGuestMode(false);
        queryClient?.setQueryData(['user'], null);
      }
    }
  ]);
}
