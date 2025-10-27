import { Request, Response } from 'express';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
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
    console.log('[ADD_MEDICATION] Request received');
    console.log('[ADD_MEDICATION] User ID:', req.user?.id);
    console.log('[ADD_MEDICATION] Request body:', JSON.stringify(req.body, null, 2));

    // Use userId from body if provided (for therapists adding for patients), otherwise use authenticated user's ID
    const userId = req.body.userId || req.user?.id;

    if (!userId) {
      console.error('[ADD_MEDICATION] No user ID found in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };
    // Remove userId from sanitizedData to avoid duplication
    delete sanitizedData.userId;

    // Convert empty strings to null for date fields
    if (sanitizedData.endDate === '') sanitizedData.endDate = null;
    if (sanitizedData.refillDate === '') sanitizedData.refillDate = null;

    // Convert empty strings to null for optional text fields
    if (sanitizedData.prescribedBy === '') sanitizedData.prescribedBy = null;
    if (sanitizedData.timeOfDay === '') sanitizedData.timeOfDay = null;
    if (sanitizedData.instructions === '') sanitizedData.instructions = null;
    if (sanitizedData.sideEffects === '') sanitizedData.sideEffects = null;
    if (sanitizedData.purpose === '') sanitizedData.purpose = null;
    if (sanitizedData.pharmacy === '') sanitizedData.pharmacy = null;
    if (sanitizedData.pharmacyPhone === '') sanitizedData.pharmacyPhone = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;

    const medicationData = {
      userId,
      ...sanitizedData
    };

    console.log('[ADD_MEDICATION] Creating medication with data:', JSON.stringify(medicationData, null, 2));

    const medication = await Medication.create(medicationData);

    console.log('[ADD_MEDICATION] Medication created successfully:', medication.id);

    res.status(201).json(medication);
  } catch (error: any) {
    console.error('[ADD_MEDICATION] Error adding medication:', error);
    console.error('[ADD_MEDICATION] Error message:', error.message);
    console.error('[ADD_MEDICATION] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };

    // Convert empty strings to null for date fields
    if (sanitizedData.endDate === '') sanitizedData.endDate = null;
    if (sanitizedData.refillDate === '') sanitizedData.refillDate = null;

    // Convert empty strings to null for optional text fields
    if (sanitizedData.prescribedBy === '') sanitizedData.prescribedBy = null;
    if (sanitizedData.timeOfDay === '') sanitizedData.timeOfDay = null;
    if (sanitizedData.instructions === '') sanitizedData.instructions = null;
    if (sanitizedData.sideEffects === '') sanitizedData.sideEffects = null;
    if (sanitizedData.purpose === '') sanitizedData.purpose = null;
    if (sanitizedData.pharmacy === '') sanitizedData.pharmacy = null;
    if (sanitizedData.pharmacyPhone === '') sanitizedData.pharmacyPhone = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;

    await medication.update(sanitizedData);

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
    const { scheduledTime, status, takenTime, notes } = req.body;

    const medication = await Medication.findOne({
      where: { id, userId }
    });

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Create medication log entry
    const log = await MedicationLog.create({
      userId,
      medicationId: parseInt(id),
      scheduledTime: scheduledTime || new Date(),
      takenTime: status === 'taken' ? (takenTime || new Date()) : null,
      status: status || 'taken',
      notes,
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error logging dose:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/medications/logs - Get medication logs for a date range
export const getMedicationLogs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, medicationId, status } = req.query;

    const where: any = { userId };

    if (medicationId) {
      where.medicationId = medicationId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.scheduledTime = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    } else if (startDate) {
      where.scheduledTime = {
        [Op.gte]: new Date(startDate as string)
      };
    } else if (endDate) {
      where.scheduledTime = {
        [Op.lte]: new Date(endDate as string)
      };
    }

    const logs = await MedicationLog.findAll({
      where,
      include: [{
        model: Medication,
        as: 'medication',
        attributes: ['id', 'name', 'dosage', 'frequency']
      }],
      order: [['scheduledTime', 'ASC']]
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching medication logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/medications/logs/:logId - Update a medication log
export const updateMedicationLog = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const userId = req.user?.id;
    const { status, takenTime, notes } = req.body;

    const log = await MedicationLog.findOne({
      where: { id: logId, userId }
    });

    if (!log) {
      return res.status(404).json({ error: 'Medication log not found' });
    }

    await log.update({
      status,
      takenTime: status === 'taken' ? (takenTime || new Date()) : null,
      notes,
    });

    res.json(log);
  } catch (error) {
    console.error('Error updating medication log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
