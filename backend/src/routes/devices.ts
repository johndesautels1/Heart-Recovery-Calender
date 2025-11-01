import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { deviceConnectionController } from '../controllers/deviceConnectionController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/devices/vitals/latest
 * @desc    Get latest vital signs from all connected devices (real-time)
 * @access  Private
 * @note    Must come before /:id routes to avoid conflict
 */
router.get('/vitals/latest', deviceConnectionController.getLatestVitals);

// Device connection management

/** @route GET /api/devices - @desc Get all connected devices for user - @access Private */
router.get('/', deviceConnectionController.getUserDevices);

/** @route GET /api/devices/:id - @desc Get a specific device by ID - @access Private */
router.get('/:id', deviceConnectionController.getDevice);

/** @route DELETE /api/devices/:id - @desc Disconnect/delete a device - @access Private */
router.delete('/:id', deviceConnectionController.deleteDevice);

/** @route PATCH /api/devices/:id/settings - @desc Update device sync settings - @access Private */
router.patch('/:id/settings', deviceConnectionController.updateDeviceSettings);

/** @route GET /api/devices/:id/sync-history - @desc Get device sync history - @access Private */
router.get('/:id/sync-history', deviceConnectionController.getSyncHistory);

/** @route POST /api/devices/:id/sync - @desc Manually trigger device data sync - @access Private */
router.post('/:id/sync', deviceConnectionController.triggerSync);

export default router;
