import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants/config';
import { storageService } from '../storage';

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let instance: Socket | null = null;

    const connectIfNeeded = () => {
      const token = storageService.getToken();
      const auth = storageService.getAuthSnapshot();
      if (!token || !auth.isLoggedIn) {
        if (instance) {
          instance.removeAllListeners();
          instance.disconnect();
          instance = null;
        }
        setSocket(null);
        setConnected(false);
        return;
      }

      if (instance) return;
      instance = io(API_URL, {
        path: '/socket.io',
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true
      });
      instance.on('connect', () => setConnected(true));
      instance.on('disconnect', () => setConnected(false));
      setSocket(instance);
    };

    connectIfNeeded();
    const unsubscribe = storageService.subscribeAuthChanges(connectIfNeeded);
    return () => {
      unsubscribe();
      if (instance) {
        instance.removeAllListeners();
        instance.disconnect();
      }
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
