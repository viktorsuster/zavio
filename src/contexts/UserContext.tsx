import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { identifyDevice } from 'vexo-analytics';
import { User } from '../types';
import { storageService, type AuthSnapshot } from '../storage';
import { apiService } from '../services/api';
import { resolveGuestVexoIdentity } from '../services/guestVexoIdentity';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  updateUser: (user: User) => void;
  topUpCreditsMutation: ReturnType<typeof useMutation>;
  updateCredits: (newCredits: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_QUERY_KEY = ['user'];

function updateAvatarToBlack(user: User): User {
  if (user.avatar && user.avatar.includes('background=10b981')) {
    const updatedAvatar = user.avatar.replace('background=10b981&color=fff', 'background=000000&color=fff');
    return {
      ...user,
      avatar: updatedAvatar
    };
  }
  if (user.avatar && user.avatar.includes('background=D4AF37')) {
    const updatedAvatar = user.avatar.replace('background=D4AF37&color=000', 'background=000000&color=fff');
    return {
      ...user,
      avatar: updatedAvatar
    };
  }
  return user;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authGuest, setAuthGuest] = useState(() => storageService.isGuestMode());
  const vexoIdentifiedAsRef = useRef<string | null>(null);

  /** Drží ['user'] cache v súlade so storage po každej auth zmene (guest → login, logout, …). */
  const syncUserCacheFromAuthSnapshot = useCallback(
    (snapshot: AuthSnapshot) => {
      setAuthGuest(snapshot.isGuest);
      if (snapshot.isGuest) {
        queryClient.setQueryData<User | null>(USER_QUERY_KEY, null);
        return;
      }
      if (snapshot.isLoggedIn && snapshot.user != null) {
        queryClient.setQueryData<User | null>(
          USER_QUERY_KEY,
          updateAvatarToBlack(snapshot.user as User)
        );
        return;
      }
      queryClient.setQueryData<User | null>(USER_QUERY_KEY, null);
    },
    [queryClient]
  );

  useEffect(() => {
    syncUserCacheFromAuthSnapshot(storageService.getAuthSnapshot());
    return storageService.subscribeAuthChanges(syncUserCacheFromAuthSnapshot);
  }, [syncUserCacheFromAuthSnapshot]);

  // Query pre user data - načíta z storage a môže refetch z API
  const {
    data: user,
    isLoading,
    isError,
    refetch
  }: UseQueryResult<User | null> = useQuery({
    queryKey: USER_QUERY_KEY,
    enabled: !authGuest && Boolean(storageService.getToken()),
    queryFn: async () => {
      // Skúsiť načítať profil z API
      try {
        const { user, followCounts } = await apiService.getProfile();
        // Aktualizovať storage pre offline režim
        const updatedUser = updateAvatarToBlack({ ...user, followCounts });
        storageService.setUser(updatedUser);
        return updatedUser;
      } catch (error) {
        console.log('[UserContext] Failed to fetch profile from API, using storage fallback', error);
        // Fallback na storage
        const storedUser = storageService.getUser();
        if (storedUser) {
          return updateAvatarToBlack(storedUser);
        }
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minút cache
    gcTime: Infinity,
    initialData: () => {
      // Initial data z storage
      const storedUser = storageService.getUser();
      if (storedUser) {
        return updateAvatarToBlack(storedUser);
      }
      return null;
    }
  });

  // Vexo: registrovaný user = email/id; hosť = guest: + ANDROID_ID / iOS IDFV (fallback MMKV). Úplne odhlásený bez guest režimu = null.
  useEffect(() => {
    let cancelled = false;
    const token = storageService.getToken();
    const loggedIn = !authGuest && Boolean(token);

    const run = async () => {
      if (authGuest) {
        const guestId = await resolveGuestVexoIdentity();
        if (cancelled) return;
        if (vexoIdentifiedAsRef.current !== guestId) {
          await identifyDevice(guestId);
          if (!cancelled) vexoIdentifiedAsRef.current = guestId;
        }
        return;
      }

      if (loggedIn) {
        if (user != null) {
          const id =
            (typeof user.email === 'string' && user.email.trim() !== '' ? user.email.trim() : null) ?? user.id ?? null;
          if (id && vexoIdentifiedAsRef.current !== id) {
            await identifyDevice(id);
            if (!cancelled) vexoIdentifiedAsRef.current = id;
          }
          return;
        }
        // Token ešte bez načítaného profilu — neukončovať Vexo session predčasne
        if (isLoading) return;
        if (vexoIdentifiedAsRef.current != null) {
          await identifyDevice(null);
          if (!cancelled) vexoIdentifiedAsRef.current = null;
        }
        return;
      }

      if (vexoIdentifiedAsRef.current != null) {
        await identifyDevice(null);
        if (!cancelled) vexoIdentifiedAsRef.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authGuest, isLoading, user, user?.email, user?.id]);

  // Mutácia pre top-up kreditov
  const topUpCreditsMutation = useMutation({
    mutationFn: (amount: number) => apiService.topUpCredits(amount),
    onSuccess: (response) => {
      // Aktualizovať user credits v query cache aj storage
      if (user) {
        const updatedUser: User = {
          ...user,
          credits: response.user.credits
        };
        
        // Aktualizovať storage
        storageService.setUser(updatedUser);
        
        // Aktualizovať query cache
        queryClient.setQueryData<User | null>(USER_QUERY_KEY, updatedUser);
        
        // Invalidate user query to ensure sync
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      }
    },
    onError: (error: any) => {
      console.error('[UserContext] Top-up error:', error);
    }
  });

  // Funkcia na manuálnu aktualizáciu user dát
  const updateUser = (updatedUser: User) => {
    storageService.setUser(updatedUser);
    queryClient.setQueryData<User | null>(USER_QUERY_KEY, updatedUser);
  };

  // Funkcia na aktualizáciu len kreditov
  const updateCredits = (newCredits: number) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        credits: newCredits
      };
      updateUser(updatedUser);
    }
  };

  const value: UserContextType = {
    user: user ?? null,
    isLoading,
    isError,
    refetch,
    updateUser,
    topUpCreditsMutation,
    updateCredits
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

