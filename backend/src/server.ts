import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { startContinuousSync } from './services/continuousDeviceSync';
import { initializeWebSocket } from './services/websocketService';

const PORT = process.env.PORT || 8080;

// Create HTTP server and attach Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Initialize WebSocket for real-time vitals streaming
initializeWebSocket(io);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
  console.log(`🔴 WebSocket server ready for real-time ECG/vitals streaming`);

  // Start continuous device sync (Strava, Polar, Samsung Health - every 5 minutes)
  // Critical for heart condition monitoring
  startContinuousSync();
});

// Export io for use in other modules
export { io };
