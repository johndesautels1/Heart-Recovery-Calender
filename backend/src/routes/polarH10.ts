/**
 * Polar H10 Bluetooth Streaming Routes
 *
 * API endpoints for controlling real-time ECG streaming from Polar H10
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import polarH10Service from '../services/polarH10Bluetooth';

const router = express.Router();

/**
 * POST /api/polar-h10/start-stream
 * Start real-time ECG streaming from Polar H10
 */
router.post('/start-stream', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    console.log(`[POLAR-H10] Starting ECG stream for user ${userId}`);

    // Connect to Polar H10 if not already connected
    if (!polarH10Service.device) {
      await polarH10Service.connect();
    }

    // Start ECG streaming
    await polarH10Service.startECGStream(userId);

    res.json({
      success: true,
      message: 'Polar H10 ECG streaming started',
      sessionId: polarH10Service.sessionId,
    });

  } catch (error: any) {
    console.error('[POLAR-H10] Error starting stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start ECG stream',
    });
  }
});

/**
 * POST /api/polar-h10/stop-stream
 * Stop real-time ECG streaming
 */
router.post('/stop-stream', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    console.log(`[POLAR-H10] Stopping ECG stream for user ${userId}`);

    await polarH10Service.stopECGStream();

    res.json({
      success: true,
      message: 'Polar H10 ECG streaming stopped',
    });

  } catch (error: any) {
    console.error('[POLAR-H10] Error stopping stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop ECG stream',
    });
  }
});

/**
 * GET /api/polar-h10/status
 * Get current streaming status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      isStreaming: polarH10Service.isStreaming,
      isConnected: !!polarH10Service.device,
      sessionId: polarH10Service.sessionId || null,
    });

  } catch (error: any) {
    console.error('[POLAR-H10] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status',
    });
  }
});

/**
 * GET /api/polar-h10/scan
 * Scan for nearby Polar H10 devices
 */
router.get('/scan', authenticateToken, async (req, res) => {
  try {
    console.log('[POLAR-H10] Scanning for devices...');

    const devices = await polarH10Service.scanForDevices();

    res.json({
      success: true,
      devices,
    });

  } catch (error: any) {
    console.error('[POLAR-H10] Error scanning:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan for devices',
    });
  }
});

export default router;
