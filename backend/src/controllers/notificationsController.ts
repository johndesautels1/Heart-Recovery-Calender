import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendEmail, sendSMS, sendPush } from '../services/notificationService';
import User from '../models/User';
import Patient from '../models/Patient';

// Get all notifications for the current user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, type, limit = 50, offset = 0 } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: Number(offset),
    });

    const total = await Notification.count({ where });

    res.json({
      notifications,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const count = await Notification.count({
      where: {
        userId,
        status: ['pending', 'sent'],
      },
    });

    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({
      status: 'read',
      readAt: new Date(),
    });

    res.json(notification);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await Notification.update(
      {
        status: 'read',
        readAt: new Date(),
      },
      {
        where: {
          userId,
          status: ['pending', 'sent'],
        },
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.destroy();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Create and send a notification
export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, title, message, metadata } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create notification record
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      status: 'pending',
      metadata,
    });

    // Attempt to send notification based on type
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const patient = await Patient.findOne({ where: { userId } });

      switch (type) {
        case 'email':
          if (user.email) {
            await sendEmail(user.email, `${title}\n\n${message}`);
          } else {
            throw new Error('User has no email address');
          }
          break;

        case 'sms':
          if (patient?.phone) {
            await sendSMS(patient.phone, `${title}: ${message}`);
          } else {
            throw new Error('User has no phone number');
          }
          break;

        case 'push':
          // Push notification requires device token from metadata
          if (metadata?.deviceToken) {
            await sendPush(metadata.deviceToken, message);
          } else {
            throw new Error('No device token provided');
          }
          break;

        case 'in-app':
          // In-app notifications are just stored in the database
          break;

        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      // Mark as sent
      await notification.update({
        status: 'sent',
        sentAt: new Date(),
      });

      res.status(201).json(notification);
    } catch (sendError: any) {
      // Mark as failed and store error
      await notification.update({
        status: 'failed',
        errorMessage: sendError.message,
      });

      res.status(500).json({
        error: 'Failed to send notification',
        notification,
        details: sendError.message,
      });
    }
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Test notification endpoint (sends test notification to current user)
export const sendTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type = 'in-app' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notification = await Notification.create({
      userId,
      type,
      title: 'Test Notification',
      message: 'This is a test notification from the Heart Recovery Calendar system.',
      status: type === 'in-app' ? 'sent' : 'pending',
      sentAt: type === 'in-app' ? new Date() : undefined,
    });

    if (type !== 'in-app') {
      // Attempt to send
      try {
        const user = await User.findByPk(userId);
        const patient = await Patient.findOne({ where: { userId } });

        switch (type) {
          case 'email':
            if (user?.email) {
              await sendEmail(user.email, 'Test Notification\n\nThis is a test notification from the Heart Recovery Calendar system.');
              await notification.update({ status: 'sent', sentAt: new Date() });
            }
            break;

          case 'sms':
            if (patient?.phone) {
              await sendSMS(patient.phone, 'Test: This is a test notification from Heart Recovery Calendar.');
              await notification.update({ status: 'sent', sentAt: new Date() });
            }
            break;
        }
      } catch (sendError: any) {
        await notification.update({
          status: 'failed',
          errorMessage: sendError.message,
        });
      }
    }

    res.status(201).json(notification);
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};
