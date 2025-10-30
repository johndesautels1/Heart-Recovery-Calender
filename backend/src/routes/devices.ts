import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { deviceConnectionController } from '../controllers/deviceConnectionController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Device connection management
router.get('/', deviceConnectionController.getUserDevices);
router.get('/:id', deviceConnectionController.getDevice);
router.delete('/:id', deviceConnectionController.deleteDevice);
router.patch('/:id/settings', deviceConnectionController.updateDeviceSettings);
router.get('/:id/sync-history', deviceConnectionController.getSyncHistory);
router.post('/:id/sync', deviceConnectionController.triggerSync);

export default router;
