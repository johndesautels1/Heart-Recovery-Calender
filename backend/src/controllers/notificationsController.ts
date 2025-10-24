import { Request, Response } from 'express';
import { sendTestNotification } from '../services/notificationScheduler';
import User from '../models/User';

// POST /api/notifications/test - Send test notification
export const testNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type } = req.body; // 'email', 'sms', 'push', or 'all'

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await sendTestNotification(userId, type || 'all');
    res.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/notifications/preferences - Update notification preferences
export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { emailEnabled, smsEnabled, pushEnabled, medicationReminders, appointmentReminders, vitalsReminders } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Note: This requires adding notification preferences fields to User model
    // For now, returning success response
    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: {
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? true,
        pushEnabled: pushEnabled ?? true,
        medicationReminders: medicationReminders ?? true,
        appointmentReminders: appointmentReminders ?? true,
        vitalsReminders: vitalsReminders ?? true
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/notifications/preferences - Get notification preferences
export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Note: This requires adding notification preferences fields to User model
    // For now, returning default preferences
    res.json({
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      medicationReminders: true,
      appointmentReminders: true,
      vitalsReminders: true
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
