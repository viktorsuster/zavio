import { useEffect, useState } from 'react';
import { storageService, type AuthSnapshot } from '../storage';

export type AuthGateState = Pick<AuthSnapshot, 'isLoggedIn' | 'isGuest'>;

export function useAuthGate(): AuthGateState {
  const [gate, setGate] = useState<AuthGateState>(() => {
    const s = storageService.getAuthSnapshot();
    return { isLoggedIn: s.isLoggedIn, isGuest: s.isGuest };
  });

  useEffect(() => {
    return storageService.subscribeAuthChanges((snapshot) => {
      setGate({ isLoggedIn: snapshot.isLoggedIn, isGuest: snapshot.isGuest });
    });
  }, []);

  return gate;
}
