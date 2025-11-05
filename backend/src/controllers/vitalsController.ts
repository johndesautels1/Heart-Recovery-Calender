import { Request, Response } from 'express';
import VitalsSample from '../models/VitalsSample';
import User from '../models/User';
import Patient from '../models/Patient';
import { Op } from 'sequelize';
import { sendWeightChangeAlert } from '../services/notificationService';

// GET /api/vitals - Get all vitals with filters
export const getVitals = async (req: Request, res: Response) => {
  try {
    // Check query param first (for admin/therapist viewing other patients), fall back to logged-in user
    const userId = req.query.userId || req.user?.id;
    console.log('[vitalsController] getVitals - userId from query:', req.query.userId, 'user.id:', req.user?.id, 'using:', userId);
    const { start, end, limit = 50 } = req.query;

    const where: any = { userId };

    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp[Op.gte] = new Date(start as string);
      if (end) where.timestamp[Op.lte] = new Date(end as string);
    }

    const vitals = await VitalsSample.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit as string)
    });

    res.json({ data: vitals });
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/vitals - Add new vital signs
export const addVital = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const vitalData = {
      userId,
      ...req.body,
      timestamp: req.body.timestamp || new Date()
    };

    const vital = await VitalsSample.create(vitalData);

    // Check for rapid weight change and send alert if needed
    if (vital.weight && userId) {
      try {
        // Get the previous weight reading
        const previousVital = await VitalsSample.findOne({
          where: {
            userId,
            weight: { [Op.not]: null },
            id: { [Op.not]: vital.id }
          },
          order: [['timestamp', 'DESC']]
        });

        if (previousVital && previousVital.weight) {
          // Calculate weight change and rate
          const weightChange = vital.weight - previousVital.weight;
          const timeDiffMs = new Date(vital.timestamp).getTime() - new Date(previousVital.timestamp).getTime();
          const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
          const timeDiffWeeks = timeDiffDays / 7;
          const changePerWeek = timeDiffWeeks > 0 ? Math.abs(weightChange) / timeDiffWeeks : 0;

          console.log(`[VITALS] Weight change detected: ${weightChange.toFixed(1)} lbs over ${timeDiffDays.toFixed(1)} days (${changePerWeek.toFixed(2)} lbs/week)`);

          // Send alert if rate exceeds 3.5 lbs/week (dangerous) or 2 lbs/week (concerning)
          if (changePerWeek > 2) {
            // Get user data for notifications
            const user = await User.findByPk(userId);
            if (user && user.email) {
              console.log(`[VITALS] Sending rapid weight change alert to ${user.email}`);
              await sendWeightChangeAlert(
                user.email,
                user.phoneNumber,
                weightChange,
                changePerWeek,
                vital.weight,
                weightChange > 0, // isGain
                Math.round(timeDiffDays)
              );
            }
          }
        }
      } catch (alertError) {
        // Don't fail the vital creation if alert fails
        console.error('[VITALS] Error sending weight change alert:', alertError);
      }
    }

    res.status(201).json(vital);
  } catch (error) {
    console.error('Error adding vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/vitals/latest - Get most recent vital signs
export const getLatestVital = async (req: Request, res: Response) => {
  try {
    // Check query param first (for admin/therapist viewing other patients), fall back to logged-in user
    const userId = (req.query.userId as string) || req.user?.id;
    console.log('[vitalsController] getLatestVital - userId from query:', req.query.userId, 'user.id:', req.user?.id, 'using:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const vital = await VitalsSample.findOne({
      where: { userId },
      order: [['timestamp', 'DESC']]
    });

    if (!vital) {
      return res.status(404).json({ error: 'No vitals found for this user' });
    }

    res.json({ data: vital });
  } catch (error) {
    console.error('Error fetching latest vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/vitals/trends - Get trends for specific metric
export const getTrends = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const { metric, start, end, interval = 'day' } = req.query;

    if (!metric) {
      return res.status(400).json({ error: 'Metric parameter is required' });
    }

    const startDate = start ? new Date(start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    const vitals = await VitalsSample.findAll({
      where: {
        userId,
        timestamp: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      order: [['timestamp', 'ASC']]
    });

    // Format data based on metric
    let data: any[] = [];
    let normalRange: any = {};
    
    switch (metric) {
      case 'bloodPressure':
        data = vitals
          .filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.bloodPressureSystolic,
            secondaryValue: v.bloodPressureDiastolic
          }));
        normalRange = { min: 90, max: 120, secondaryMin: 60, secondaryMax: 80 };
        break;

      case 'heartRate':
        data = vitals
          .filter(v => v.heartRate)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.heartRate
          }));
        normalRange = { min: 60, max: 100 };
        break;

      case 'weight':
        data = vitals
          .filter(v => v.weight)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.weight
          }));
        normalRange = {};
        break;

      case 'bloodSugar':
        data = vitals
          .filter(v => v.bloodSugar)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.bloodSugar
          }));
        normalRange = { min: 70, max: 140 };
        break;

      case 'oxygenSaturation':
        data = vitals
          .filter(v => v.oxygenSaturation)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.oxygenSaturation
          }));
        normalRange = { min: 95, max: 100 };
        break;

      default:
        return res.status(400).json({ error: 'Invalid metric type' });
    }

    // Calculate average
    const values = data.map(d => d.value);
    const currentAverage = values.length > 0 
      ? values.reduce((a, b) => a + b, 0) / values.length 
      : 0;

    res.json({
      metric,
      data,
      normalRange,
      currentAverage
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/vitals/:id - Get specific vital
export const getVital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const vital = await VitalsSample.findOne({
      where: { id, userId }
    });

    if (!vital) {
      return res.status(404).json({ error: 'Vital not found' });
    }

    res.json(vital);
  } catch (error) {
    console.error('Error fetching vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/vitals/:id - Update vital
export const updateVital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const vital = await VitalsSample.findOne({
      where: { id, userId }
    });

    if (!vital) {
      return res.status(404).json({ error: 'Vital not found' });
    }

    await vital.update(req.body);

    res.json(vital);
  } catch (error) {
    console.error('Error updating vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/vitals/:id - Delete vital
export const deleteVital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const vital = await VitalsSample.findOne({
      where: { id, userId }
    });

    if (!vital) {
      return res.status(404).json({ error: 'Vital not found' });
    }

    await vital.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
