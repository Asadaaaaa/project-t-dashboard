import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl = getSocketUrl();
    const token = localStorage.getItem('projectt_token');

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      auth: {
        token: token || undefined,
        type: 'dashboard_client'
      },
      query: {
        type: 'dashboard_client'
      }
    });

    socketInstance.on('connect', () => {
      console.log('[DashboardSocket] Connected to Controller Socket server (ID:', socketInstance?.id, ')');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[DashboardSocket] Disconnected from Controller Socket:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[DashboardSocket] Socket connection error:', err.message);
    });
  }

  // Ensure current auth token is synced
  const currentToken = localStorage.getItem('projectt_token');
  if (socketInstance && currentToken) {
    socketInstance.auth = {
      token: currentToken,
      type: 'dashboard_client'
    };
  }

  return socketInstance;
};

/**
 * Hook to monitor Dashboard Socket connection state
 */
export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
};
