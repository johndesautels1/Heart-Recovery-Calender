import { Request, Response } from 'express';
import ExercisePrescription from '../models/ExercisePrescription';
import Exercise from '../models/Exercise';
import Patient from '../models/Patient';
import ExerciseLog from '../models/ExerciseLog';
import { Op } from 'sequelize';

// GET /api/exercise-prescriptions - Get all prescriptions with filters
export const getPrescriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { patientId, status, active } = req.query;

    const where: any = {};

    // If patient role, only show their own prescriptions
    if (userRole === 'patient') {
      // For patients, we would need to link user to patient
      // For now, assuming userId matches patientId or there's a mapping
      where.patientId = userId;
    }

    // If therapist, they can see all their patients' prescriptions or filter by patient
    if (userRole === 'therapist' && patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    // Filter for active prescriptions (not ended or status is active)
    if (active === 'true') {
      where.status = 'active';
      where[Op.or] = [
        { endDate: null },
        { endDate: { [Op.gte]: new Date() } },
      ];
    }

    const prescriptions = await ExercisePrescription.findAll({
      where,
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: Patient,
          as: 'patient',
        },
      ],
      order: [['startDate', 'DESC']],
    });

    res.json({ data: prescriptions });
  } catch (error) {
    console.error('Error fetching exercise prescriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-prescriptions/:id - Get specific prescription
export const getPrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prescription = await ExercisePrescription.findByPk(id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: Patient,
          as: 'patient',
        },
      ],
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Exercise prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Error fetching exercise prescription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/exercise-prescriptions - Create new prescription (therapists only)
export const createPrescription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only therapists can create prescriptions
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can create exercise prescriptions' });
    }

    const prescriptionData = {
      ...req.body,
      prescribedBy: userId,
      status: 'active',
    };

    const prescription = await ExercisePrescription.create(prescriptionData);

    // Load full prescription with assoCAItions
    const fullPrescription = await ExercisePrescription.findByPk(prescription.id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: Patient,
          as: 'patient',
        },
      ],
    });

    res.status(201).json(fullPrescription);
  } catch (error) {
    console.error('Error creating exercise prescription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/exercise-prescriptions/:id - Update prescription (therapists only)
export const updatePrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists can update prescriptions
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can update exercise prescriptions' });
    }

    const prescription = await ExercisePrescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Exercise prescription not found' });
    }

    await prescription.update(req.body);

    // Load full prescription with assoCAItions
    const fullPrescription = await ExercisePrescription.findByPk(prescription.id, {
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
        {
          model: Patient,
          as: 'patient',
        },
      ],
    });

    res.json(fullPrescription);
  } catch (error) {
    console.error('Error updating exercise prescription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/exercise-prescriptions/:id - Delete prescription (therapists only)
export const deletePrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists can delete prescriptions
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can delete exercise prescriptions' });
    }

    const prescription = await ExercisePrescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Exercise prescription not found' });
    }

    await prescription.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting exercise prescription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/exercise-prescriptions/:id/status - Update prescription status
export const updatePrescriptionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = (req as any).user.role;

    if (!status || !['active', 'completed', 'discontinued'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const prescription = await ExercisePrescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Exercise prescription not found' });
    }

    // Only therapists can change status
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can update prescription status' });
    }

    await prescription.update({ status });

    res.json(prescription);
  } catch (error) {
    console.error('Error updating prescription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-prescriptions/patient/:patientId - Get prescriptions for specific patient
export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const userRole = (req as any).user.role;

    // Only therapists can view patient prescriptions
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can view patient prescriptions' });
    }

    const prescriptions = await ExercisePrescription.findAll({
      where: { patientId },
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
      ],
      order: [
        ['status', 'ASC'], // active first
        ['startDate', 'DESC'],
      ],
    });

    res.json({ data: prescriptions });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-prescriptions/:id/logs - Get exercise logs for a prescription
export const getPrescriptionLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const prescription = await ExercisePrescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Exercise prescription not found' });
    }

    const where: any = { prescriptionId: id };

    if (startDate) {
      where.completedAt = { [Op.gte]: new Date(startDate as string) };
    }

    if (endDate) {
      where.completedAt = {
        ...where.completedAt,
        [Op.lte]: new Date(endDate as string),
      };
    }

    const logs = await ExerciseLog.findAll({
      where,
      order: [['completedAt', 'DESC']],
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching prescription logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/exercise-prescriptions/stats - Get prescription statistics
export const getPrescriptionStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only therapists can view stats
    if (userRole !== 'therapist') {
      return res.status(403).json({ error: 'Only therapists can view prescription statistics' });
    }

    const totalActive = await ExercisePrescription.count({
      where: {
        prescribedBy: userId,
        status: 'active'
      },
    });

    const totalCompleted = await ExercisePrescription.count({
      where: {
        prescribedBy: userId,
        status: 'completed'
      },
    });

    const totalDiscontinued = await ExercisePrescription.count({
      where: {
        prescribedBy: userId,
        status: 'discontinued'
      },
    });

    const byPatient = await ExercisePrescription.findAll({
      attributes: [
        'patientId',
        [ExercisePrescription.sequelize!.fn('COUNT', ExercisePrescription.sequelize!.col('id')), 'count'],
      ],
      where: {
        prescribedBy: userId,
        status: 'active'
      },
      group: ['patientId'],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['name'],
        },
      ],
    });

    res.json({
      totalActive,
      totalCompleted,
      totalDiscontinued,
      byPatient,
    });
  } catch (error) {
    console.error('Error fetching prescription stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
