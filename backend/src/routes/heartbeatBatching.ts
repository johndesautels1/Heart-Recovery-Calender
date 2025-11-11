/**
 * Heartbeat Batching Status and Control Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import heartbeatBatchingService from '../services/heartbeatBatchingService';

const router = express.Router();

/**
 * GET /api/heartbeat-batching/status
 * Get current batching service statistics
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const stats = heartbeatBatchingService.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        description: 'Batching heartbeats into 1-minute windows to prevent database flooding',
        savingsRate: '~98% fewer database writes',
      },
    });
  } catch (error: any) {
    console.error('[HEARTBEAT-BATCH-API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get batching stats',
    });
  }
});

export default router;
