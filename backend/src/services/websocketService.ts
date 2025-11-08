import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

let io: Server | null = null;

/**
 * Initialize WebSocket server for real-time medical data streaming
 * Supports: Samsung Galaxy Watch 8 ECG, Polar H10 heart rate, live vitals
 */
export function initializeWebSocket(socketServer: Server): void {
  io = socketServer;

  io.on('connection', (socket: Socket) => {
    logger.info(`[WEBSOCKET] Client connected: ${socket.id}`);

    // Handle client joining specific patient rooms for targeted streaming
    socket.on('join-patient-room', (userId: number) => {
      const roomName = `patient-${userId}`;
      socket.join(roomName);
      logger.info(`[WEBSOCKET] Client ${socket.id} joined room: ${roomName}`);

      // Send confirmation
      socket.emit('room-joined', { room: roomName, userId });
    });

    // Handle client leaving patient rooms
    socket.on('leave-patient-room', (userId: number) => {
      const roomName = `patient-${userId}`;
      socket.leave(roomName);
      logger.info(`[WEBSOCKET] Client ${socket.id} left room: ${roomName}`);
    });

    // Heartbeat for connection health monitoring
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[WEBSOCKET] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`[WEBSOCKET] Socket error for ${socket.id}:`, error);
    });
  });

  logger.info('[WEBSOCKET] WebSocket service initialized');
}

/**
 * Broadcast real-time vitals data to specific patient's connected clients
 */
export function broadcastVitalsUpdate(userId: number, vitalsData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('vitals-update', {
    userId,
    timestamp: new Date().toISOString(),
    data: vitalsData
  });

  logger.info(`[WEBSOCKET] Broadcasted vitals update to room: ${roomName}`);
}

/**
 * Broadcast real-time ECG data stream from Samsung Galaxy Watch or other devices
 */
export function broadcastECGData(userId: number, ecgData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast ECG - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('ecg-data', {
    userId,
    timestamp: new Date().toISOString(),
    data: ecgData
  });
}

/**
 * Broadcast real-time heart rate from Polar H10 or Samsung Watch
 */
export function broadcastHeartRate(userId: number, heartRateData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast HR - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('heart-rate-update', {
    userId,
    timestamp: new Date().toISOString(),
    data: heartRateData
  });
}

/**
 * Broadcast device connection status changes
 */
export function broadcastDeviceStatus(userId: number, deviceData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast device status - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('device-status', {
    userId,
    timestamp: new Date().toISOString(),
    data: deviceData
  });
}

/**
 * Broadcast exercise/treadmill test data in real-time
 */
export function broadcastExerciseData(userId: number, exerciseData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast exercise data - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('exercise-update', {
    userId,
    timestamp: new Date().toISOString(),
    data: exerciseData
  });
}

/**
 * Broadcast spirometry test results in real-time
 */
export function broadcastSpirometryData(userId: number, spirometryData: any): void {
  if (!io) {
    logger.warn('[WEBSOCKET] Cannot broadcast spirometry - WebSocket not initialized');
    return;
  }

  const roomName = `patient-${userId}`;
  io.to(roomName).emit('spirometry-update', {
    userId,
    timestamp: new Date().toISOString(),
    data: spirometryData
  });
}

/**
 * Get Socket.io instance for use in other modules
 */
export function getIO(): Server | null {
  return io;
}
