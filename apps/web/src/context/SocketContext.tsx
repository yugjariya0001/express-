'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(apiUrl, { withCredentials: true, autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (user) {
        socket.emit('join:user', user._id);
        if (user.role === 'admin') socket.emit('join:admin');
        if (user.role === 'restaurant') socket.emit('join:restaurant', user._id);
      }
    });

    socket.on('disconnect', () => setConnected(false));
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
