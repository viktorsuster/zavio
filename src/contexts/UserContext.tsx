import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { User } from '../types';
import { storageService, type AuthSnapshot } from '../storage';
import { apiService } from '../services/api';

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

