import { Request, Response } from 'express';
import Alert from '../models/Alert';
import User from '../models/User';
import { Op } from 'sequelize';

// GET /api/alerts - Get all alerts
export const getAlerts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { resolved, severity, alertType, therapistId, startDate, endDate } = req.query;

    const where: any = {
      [Op.or]: [
        { userId },
        { therapistId: userId } // Therapist can see alerts for their patients
      ]
    };

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    if (severity) {
      where.severity = severity;
    }

    if (alertType) {
      where.alertType = alertType;
    }

    if (therapistId) {
      where.therapistId = therapistId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate as string);
      }
    }

    const alerts = await Alert.findAll({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['resolved', 'ASC'],
        ['severity', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({ data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/alerts/:id - Get single alert
export const getAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/alerts - Create new alert
export const createAlert = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      patientId,
      therapistId,
      alertType,
      severity,
      title,
      message,
      relatedEntityType,
      relatedEntityId
    } = req.body;

    if (!alertType || !title || !message) {
      return res.status(400).json({
        error: 'Alert type, title, and message are required'
      });
    }

    // Determine the patient - either from body or current user
    const alertUserId = patientId || userId;

    const alert = await Alert.create({
      userId: alertUserId,
      therapistId,
      alertType,
      severity: severity || 'info',
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      resolved: false,
      notificationSent: false
    });

    const createdAlert = await Alert.findByPk(alert.id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json(createdAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/alerts/:id - Update alert
export const updateAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const {
      title,
      message,
      severity,
      actionTaken
    } = req.body;

    await alert.update({
      ...(title && { title }),
      ...(message && { message }),
      ...(severity && { severity }),
      ...(actionTaken !== undefined && { actionTaken })
    });

    const updatedAlert = await Alert.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/alerts/:id - Delete alert
export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.destroy();

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/alerts/:id/resolve - Resolve an alert
export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { actionTaken } = req.body;

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId,
      ...(actionTaken && { actionTaken })
    });

    const updatedAlert = await Alert.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/alerts/:id/unresolve - Unresolve an alert
export const unresolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update({
      resolved: false,
      resolvedAt: null,
      resolvedBy: null
    });

    const updatedAlert = await Alert.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error unresolving alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/alerts/:id/mark-notified - Mark notification as sent
export const markNotified = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { methods } = req.body; // ['sms', 'email', 'push']

    const alert = await Alert.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { therapistId: userId }
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await alert.update({
      notificationSent: true,
      notificationMethods: methods || []
    });

    const updatedAlert = await Alert.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'therapist',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error marking alert as notified:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/alerts/stats - Get alert statistics
export const getAlertStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    const where: any = {
      [Op.or]: [
        { userId },
        { therapistId: userId }
      ]
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate as string);
      }
    }

    const totalAlerts = await Alert.count({ where });

    const resolvedAlerts = await Alert.count({
      where: { ...where, resolved: true }
    });

    const unresolvedAlerts = await Alert.count({
      where: { ...where, resolved: false }
    });

    const criticalAlerts = await Alert.count({
      where: { ...where, severity: 'critical', resolved: false }
    });

    const warningAlerts = await Alert.count({
      where: { ...where, severity: 'warning', resolved: false }
    });

    const infoAlerts = await Alert.count({
      where: { ...where, severity: 'info', resolved: false }
    });

    const alertsByType = await Alert.findAll({
      where,
      attributes: [
        'alertType',
        [Alert.sequelize!.fn('COUNT', Alert.sequelize!.col('id')), 'count']
      ],
      group: ['alertType'],
      raw: true
    });

    res.json({
      total: totalAlerts,
      resolved: resolvedAlerts,
      unresolved: unresolvedAlerts,
      bySeverity: {
        critical: criticalAlerts,
        warning: warningAlerts,
        info: infoAlerts
      },
      byType: alertsByType
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
