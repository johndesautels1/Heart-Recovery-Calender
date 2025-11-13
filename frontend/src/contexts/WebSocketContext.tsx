import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from './SessionContext';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  latestVitals: any;
  latestECG: any;
  latestHeartRate: any;
  deviceStatus: any;
  exerciseData: any;
  spirometryData: any;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  latestVitals: null,
  latestECG: null,
  latestHeartRate: null,
  deviceStatus: null,
  exerciseData: null,
  spirometryData: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [latestECG, setLatestECG] = useState<any>(null);
  const [latestHeartRate, setLatestHeartRate] = useState<any>(null);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [spirometryData, setSpirometryData] = useState<any>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user?.id) return;

    // Connect to WebSocket server
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

    console.log('[WEBSOCKET] Connecting to:', SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    newSocket.on('connect', () => {
      console.log('[WEBSOCKET] Connected successfully');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Join patient-specific room for targeted data streaming
      newSocket.emit('join-patient-room', user.id);
      console.log(`[WEBSOCKET] Joined patient room: patient-${user.id}`);
    });

    newSocket.on('room-joined', (data) => {
      console.log('[WEBSOCKET] Room joined confirmation:', data);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[WEBSOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WEBSOCKET] Connection error:', error);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('[WEBSOCKET] Max reconnection attempts reached');
      }
    });

    // Listen for real-time vitals updates
    newSocket.on('vitals-update', (data) => {
      console.log('[WEBSOCKET] Vitals update received:', data);
      setLatestVitals(data);
    });

    // Listen for real-time ECG data
    newSocket.on('ecg-data', (data) => {
      console.log('[WEBSOCKET] ECG data received:', data);
      setLatestECG(data);
    });

    // Listen for real-time heart rate updates
    newSocket.on('heart-rate-update', (data) => {
      console.log('[WEBSOCKET] Heart rate update received:', data);
      setLatestHeartRate(data);
    });

    // Listen for device status changes
    newSocket.on('device-status', (data) => {
      console.log('[WEBSOCKET] Device status update:', data);
      setDeviceStatus(data);
    });

    // Listen for exercise/treadmill data
    newSocket.on('exercise-update', (data) => {
      console.log('[WEBSOCKET] Exercise data received:', data);
      setExerciseData(data);
    });

    // Listen for spirometry data
    newSocket.on('spirometry-update', (data) => {
      console.log('[WEBSOCKET] Spirometry data received:', data);
      setSpirometryData(data);
    });

    // Pong response for heartbeat
    newSocket.on('pong', (data) => {
      // Silent heartbeat - don't log every pong
    });

    setSocket(newSocket);

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      if (newSocket) {
        newSocket.emit('leave-patient-room', user.id);
        newSocket.disconnect();
      }
    };
  }, [user?.id]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    latestVitals,
    latestECG,
    latestHeartRate,
    deviceStatus,
    exerciseData,
    spirometryData,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
