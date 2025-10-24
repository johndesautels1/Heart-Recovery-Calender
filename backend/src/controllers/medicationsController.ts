import { Request, Response } from 'express';
import Medication from '../models/Medication';
import { Op } from 'sequelize';

// GET /api/medications - Get all medications
export const getMedications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { active, needsRefill } = req.query;

    const where: any = { userId };

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (needsRefill === 'true') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      where.refillDate = {
        [Op.lte]: sevenDaysFromNow
      };
    }

    const medications = await Medication.findAll({
      where,
      order: [['isActive', 'DESC'], ['name', 'ASC']]
    });

    res.json({ data: medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/medications - Add new medication
export const addMedication = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const medicationData = {
      userId,
      ...req.body
    };

    const medication = await Medication.create(medicationData);

    res.status(201).json(medication);
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/medications/schedule - Get medication schedule for a day
export const getSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: date } }
        ]
      },
      order: [['name', 'ASC']]
    });

    // Parse frequency to create schedule
    const schedule = medications.map(med => {
      // Parse frequency string like "Twice daily" or "Every 8 hours"
      const times: string[] = [];
      const taken: boolean[] = [];
      
      if (med.frequency.toLowerCase().includes('once')) {
        times.push('8:00 AM');
        taken.push(false);
      } else if (med.frequency.toLowerCase().includes('twice') || med.frequency.includes('2')) {
        times.push('8:00 AM', '8:00 PM');
        taken.push(false, false);
      } else if (med.frequency.toLowerCase().includes('three') || med.frequency.includes('3')) {
        times.push('8:00 AM', '2:00 PM', '8:00 PM');
        taken.push(false, false, false);
      } else if (med.frequency.toLowerCase().includes('four') || med.frequency.includes('4')) {
        times.push('8:00 AM', '12:00 PM', '4:00 PM', '8:00 PM');
        taken.push(false, false, false, false);
      } else {
        times.push('8:00 AM');
        taken.push(false);
      }

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        times,
        taken,
        nextDose: times[0] // Simplified - would calculate based on current time
      };
    });

    res.json({
      date,
      medications: schedule
    });
  } catch (error) {
    console.error('Error fetching medication schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/medications/:id - Get specific medication
export const getMedication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    res.json(medication);
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/medications/:id - Update medication
export const updateMedication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    await medication.update(req.body);

    res.json(medication);
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/medications/:id - Delete medication
export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    await medication.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/medications/:id/toggle-active - Toggle medication active status
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    await medication.update({ isActive: !medication.isActive });

    res.json(medication);
  } catch (error) {
    console.error('Error toggling medication status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/medications/:id/log-dose - Log that a dose was taken
export const logDose = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { timestamp, taken, notes } = req.body;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // In a full implementation, this would create a MedicationLog entry
    // For now, we'll return a success response
    // TODO: Create MedicationLog model and table

    res.status(201).json({
      medicationId: id,
      timestamp: timestamp || new Date(),
      taken,
      notes
    });
  } catch (error) {
    console.error('Error logging dose:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
