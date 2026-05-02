import { createMMKV } from 'react-native-mmkv';

let nativeStorage: ReturnType<typeof createMMKV> | undefined;
try {
  nativeStorage = createMMKV({
    id: 'sportvia-storage'
  });
  console.log('[Storage] MMKV initialized successfully');
} catch (error) {
  console.warn('[Storage] MMKV initialization failed, using fallback:', error);
}

const memoryStore = new Map<string, string>();

const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const BOOKINGS_KEY = 'bookings';
const POSTS_KEY = 'posts';
const GUEST_MODE_KEY = 'guest_mode';

export type AuthSnapshot = {
  user: unknown | null;
  token: string | null;
  isLoggedIn: boolean;
  isGuest: boolean;
};
const authListeners = new Set<(snapshot: AuthSnapshot) => void>();

const getStorageValue = (key: string): string | undefined => {
  if (nativeStorage) {
    const value = nativeStorage.getString(key);
    console.log(`[Storage] GET ${key}:`, value ? 'EXISTS' : 'NULL', nativeStorage ? 'MMKV' : 'FALLBACK');
    return value;
  }
  const value = memoryStore.get(key);
  console.log(`[Storage] GET ${key}:`, value ? 'EXISTS' : 'NULL', 'FALLBACK');
  return value;
};

const setStorageValue = (key: string, value: string): void => {
  console.log(`[Storage] SET ${key}:`, value.substring(0, 50) + '...', nativeStorage ? 'MMKV' : 'FALLBACK');
  if (nativeStorage) {
    nativeStorage.set(key, value);
  } else {
    memoryStore.set(key, value);
  }
};

const deleteStorageValue = (key: string): void => {
  console.log(`[Storage] DELETE ${key}`, nativeStorage ? 'MMKV' : 'FALLBACK');
  if (nativeStorage) {
    nativeStorage.remove(key);
  } else {
    memoryStore.delete(key);
  }
};

const readGuestMode = (): boolean => getStorageValue(GUEST_MODE_KEY) === '1';

const getAuthSnapshot = (): AuthSnapshot => {
  const userJson = getStorageValue(USER_KEY);
  const token = getStorageValue(TOKEN_KEY) || null;
  let user: unknown | null = null;

  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      user = null;
    }
  }

  const isGuest = readGuestMode();

  return {
    user,
    token,
    isLoggedIn: Boolean(user && token),
    isGuest
  };
};

const notifyAuthListeners = (): void => {
  const snapshot = getAuthSnapshot();
  authListeners.forEach((listener) => listener(snapshot));
};

export const storageService = {
  getUser: () => {
    console.log('[Storage] getUser() called');
    const userJson = getStorageValue(USER_KEY);
    if (!userJson) {
      console.log('[Storage] getUser() - no user found');
      return null;
    }
    try {
      const user = JSON.parse(userJson);
      console.log('[Storage] getUser() - user found:', user.email || user.name);
      return user;
    } catch (error) {
      console.error('[Storage] getUser() - parse error:', error);
      return null;
    }
  },

  setGuestMode: (active: boolean) => {
    if (active) {
      setStorageValue(GUEST_MODE_KEY, '1');
    } else {
      deleteStorageValue(GUEST_MODE_KEY);
    }
    notifyAuthListeners();
  },

  /** Bez účtu: vyčistí token aj používateľa a nastaví hosťa (jedna notifikácia). */
  enterGuestMode: () => {
    deleteStorageValue(USER_KEY);
    deleteStorageValue(TOKEN_KEY);
    setStorageValue(GUEST_MODE_KEY, '1');
    notifyAuthListeners();
  },

  isGuestMode: readGuestMode,

  setUser: (user: any) => {
    console.log('[Storage] setUser() called:', user.email || user.name);
    deleteStorageValue(GUEST_MODE_KEY);
    setStorageValue(USER_KEY, JSON.stringify(user));
    const verify = getStorageValue(USER_KEY);
    console.log('[Storage] setUser() - verification:', verify ? 'SUCCESS' : 'FAILED');
    notifyAuthListeners();
  },

  clearUser: () => {
    console.log('[Storage] clearUser() called');
    deleteStorageValue(USER_KEY);
    notifyAuthListeners();
  },

  getToken: () => {
    console.log('[Storage] getToken() called');
    const token = getStorageValue(TOKEN_KEY);
    console.log('[Storage] getToken() - result:', token ? 'EXISTS (' + token.substring(0, 20) + '...)' : 'NULL');
    return token || null;
  },

  setToken: (token: string) => {
    console.log('[Storage] setToken() called:', token.substring(0, 20) + '...');
    deleteStorageValue(GUEST_MODE_KEY);
    setStorageValue(TOKEN_KEY, token);
    const verify = getStorageValue(TOKEN_KEY);
    console.log('[Storage] setToken() - verification:', verify ? 'SUCCESS' : 'FAILED');
    notifyAuthListeners();
  },

  clearToken: () => {
    console.log('[Storage] clearToken() called');
    deleteStorageValue(TOKEN_KEY);
    notifyAuthListeners();
  },

  clearAll: () => {
    deleteStorageValue(USER_KEY);
    deleteStorageValue(TOKEN_KEY);
    deleteStorageValue(GUEST_MODE_KEY);
    deleteStorageValue(EXPO_PUSH_TOKEN_KEY);
    deleteStorageValue(BOOKINGS_KEY);
    deleteStorageValue(POSTS_KEY);
    notifyAuthListeners();
  },

  getAuthSnapshot,

  subscribeAuthChanges: (listener: (snapshot: AuthSnapshot) => void) => {
    authListeners.add(listener);
    return () => {
      authListeners.delete(listener);
    };
  },

  getExpoPushToken: () => {
    const token = getStorageValue(EXPO_PUSH_TOKEN_KEY);
    return token || null;
  },

  setExpoPushToken: (token: string) => {
    setStorageValue(EXPO_PUSH_TOKEN_KEY, token);
  },

  getBookings: () => {
    const bookingsJson = getStorageValue(BOOKINGS_KEY);
    if (!bookingsJson) return [];
    try {
      return JSON.parse(bookingsJson);
    } catch {
      return [];
    }
  },

  setBookings: (bookings: any[]) => {
    setStorageValue(BOOKINGS_KEY, JSON.stringify(bookings));
  },

  getPosts: () => {
    const postsJson = getStorageValue(POSTS_KEY);
    if (!postsJson) return [];
    try {
      return JSON.parse(postsJson);
    } catch {
      return [];
    }
  },

  setPosts: (posts: any[]) => {
    setStorageValue(POSTS_KEY, JSON.stringify(posts));
  }
};

