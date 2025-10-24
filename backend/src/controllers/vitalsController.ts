import { Request, Response } from 'express';
import VitalsSample from '../models/VitalsSample';
import { Op } from 'sequelize';

// GET /api/vitals - Get all vitals with filters
export const getVitals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.query.userId;
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

    res.status(201).json(vital);
  } catch (error) {
    console.error('Error adding vital:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/vitals/latest - Get most recent vital signs
export const getLatestVital = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.query.userId;

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
    const userId = req.user?.id;
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
