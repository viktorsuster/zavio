import { MMKV } from 'react-native-mmkv';

type StorageLike = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};

let nativeStorage: MMKV | undefined;
try {
  nativeStorage = new MMKV({
    id: 'zavio-storage'
  });
} catch {
  // noop - will use fallback
}

const memoryStore = new Map<string, string>();
const fallbackStorage: StorageLike = {
  getString(key: string) {
    return memoryStore.get(key);
  },
  set(key: string, value: string) {
    memoryStore.set(key, value);
  },
  delete(key: string) {
    memoryStore.delete(key);
  }
};

const storage: StorageLike = (nativeStorage as unknown as StorageLike) ?? fallbackStorage;

const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const BOOKINGS_KEY = 'bookings';
const POSTS_KEY = 'posts';

export const storageService = {
  getUser: () => {
    const userJson = storage.getString(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },

  setUser: (user: any) => {
    storage.set(USER_KEY, JSON.stringify(user));
  },

  clearUser: () => {
    storage.delete(USER_KEY);
  },

  getToken: () => {
    return storage.getString(TOKEN_KEY) || null;
  },

  setToken: (token: string) => {
    storage.set(TOKEN_KEY, token);
  },

  clearToken: () => {
    storage.delete(TOKEN_KEY);
  },

  clearAll: () => {
    storage.delete(USER_KEY);
    storage.delete(TOKEN_KEY);
    storage.delete(BOOKINGS_KEY);
    storage.delete(POSTS_KEY);
  },

  getBookings: () => {
    const bookingsJson = storage.getString(BOOKINGS_KEY);
    return bookingsJson ? JSON.parse(bookingsJson) : [];
  },

  setBookings: (bookings: any[]) => {
    storage.set(BOOKINGS_KEY, JSON.stringify(bookings));
  },

  getPosts: () => {
    const postsJson = storage.getString(POSTS_KEY);
    return postsJson ? JSON.parse(postsJson) : [];
  },

  setPosts: (posts: any[]) => {
    storage.set(POSTS_KEY, JSON.stringify(posts));
  }
};

