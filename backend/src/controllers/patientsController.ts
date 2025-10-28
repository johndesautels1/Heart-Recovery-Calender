import { Request, Response } from 'express';
import Patient from '../models/Patient';
import User from '../models/User';
import bcrypt from 'bcrypt';

// GET /api/patients - Get all patients for the logged-in therapist
export const getPatients = async (req: Request, res: Response) => {
  try {
    const therapistId = req.user?.id;
    const { active } = req.query;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = { therapistId };

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const patients = await Patient.findAll({
      where,
      order: [['name', 'ASC']],
    });

    res.json({ data: patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/patients - Add a new patient
export const addPatient = async (req: Request, res: Response) => {
  try {
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };
    const createUserAccount = sanitizedData.createUserAccount;
    const password = sanitizedData.password;

    // Remove fields that shouldn't be in patient data
    delete sanitizedData.createUserAccount;
    delete sanitizedData.password;

    if (sanitizedData.email === '') sanitizedData.email = null;
    if (sanitizedData.phone === '') sanitizedData.phone = null;
    if (sanitizedData.address === '') sanitizedData.address = null;
    if (sanitizedData.zoomHandle === '') sanitizedData.zoomHandle = null;
    if (sanitizedData.surgeryDate === '') sanitizedData.surgeryDate = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;
    if (sanitizedData.height === '') sanitizedData.height = null;
    if (sanitizedData.heightUnit === '') sanitizedData.heightUnit = null;
    if (sanitizedData.startingWeight === '') sanitizedData.startingWeight = null;
    if (sanitizedData.currentWeight === '') sanitizedData.currentWeight = null;
    if (sanitizedData.targetWeight === '') sanitizedData.targetWeight = null;
    if (sanitizedData.weightUnit === '') sanitizedData.weightUnit = null;

    let userId = null;

    // If therapist wants to create a user account for this patient
    if (createUserAccount && password && sanitizedData.email) {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: sanitizedData.email } });

      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      // Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: sanitizedData.email,
        password: hashedPassword,
        name: sanitizedData.name,
        phoneNumber: sanitizedData.phone || undefined,
        role: 'patient',
        timezone: 'America/New_York'
      });

      userId = user.id;
      console.log(`[ADD_PATIENT] Created user account ${user.id} for patient ${sanitizedData.name}`);
    }

    const patientData = {
      therapistId,
      userId,
      ...sanitizedData,
    };

    const patient = await Patient.create(patientData);

    res.status(201).json(patient);
  } catch (error: any) {
    console.error('Error adding patient:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET /api/patients/:id - Get a specific patient
export const getPatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await Patient.findOne({
      where: { id, therapistId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/patients/:id - Update a patient
export const updatePatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await Patient.findOne({
      where: { id, therapistId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Sanitize empty strings to null for optional fields
    const sanitizedData = { ...req.body };
    const createUserAccount = sanitizedData.createUserAccount;
    const password = sanitizedData.password;

    // Remove fields that shouldn't be in patient data
    delete sanitizedData.createUserAccount;
    delete sanitizedData.password;

    if (sanitizedData.email === '') sanitizedData.email = null;
    if (sanitizedData.phone === '') sanitizedData.phone = null;
    if (sanitizedData.address === '') sanitizedData.address = null;
    if (sanitizedData.zoomHandle === '') sanitizedData.zoomHandle = null;
    if (sanitizedData.surgeryDate === '') sanitizedData.surgeryDate = null;
    if (sanitizedData.notes === '') sanitizedData.notes = null;
    if (sanitizedData.height === '') sanitizedData.height = null;
    if (sanitizedData.heightUnit === '') sanitizedData.heightUnit = null;
    if (sanitizedData.startingWeight === '') sanitizedData.startingWeight = null;
    if (sanitizedData.currentWeight === '') sanitizedData.currentWeight = null;
    if (sanitizedData.targetWeight === '') sanitizedData.targetWeight = null;
    if (sanitizedData.weightUnit === '') sanitizedData.weightUnit = null;

    // If therapist wants to create a user account for this patient (and patient doesn't have one)
    if (createUserAccount && password && sanitizedData.email && !patient.userId) {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: sanitizedData.email } });

      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      // Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: sanitizedData.email,
        password: hashedPassword,
        name: sanitizedData.name,
        phoneNumber: sanitizedData.phone || undefined,
        role: 'patient',
        timezone: 'America/New_York'
      });

      sanitizedData.userId = user.id;
      console.log(`[UPDATE_PATIENT] Created user account ${user.id} for patient ${patient.id}`);
    }

    await patient.update(sanitizedData);

    res.json(patient);
  } catch (error: any) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// DELETE /api/patients/:id - Delete a patient
export const deletePatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await Patient.findOne({
      where: { id, therapistId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await patient.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/patients/:id/toggle-active - Toggle patient active status
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await Patient.findOne({
      where: { id, therapistId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await patient.update({ isActive: !patient.isActive });

    res.json(patient);
  } catch (error) {
    console.error('Error toggling patient status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/patients/:id/post-op-week - Calculate current post-op week for a patient
export const getPostOpWeek = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const therapistId = req.user?.id;

    if (!therapistId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await Patient.findOne({
      where: { id, therapistId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (!patient.surgeryDate) {
      return res.json({
        postOpWeek: null,
        daysSinceSurgery: null,
        message: 'Surgery date not set'
      });
    }

    const surgeryDate = new Date(patient.surgeryDate);
    const today = new Date();
    const daysSinceSurgery = Math.floor((today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));
    const postOpWeek = Math.floor(daysSinceSurgery / 7) + 1;

    res.json({
      postOpWeek,
      daysSinceSurgery,
      surgeryDate: patient.surgeryDate,
      isPreSurgery: daysSinceSurgery < 0,
    });
  } catch (error) {
    console.error('Error calculating post-op week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
