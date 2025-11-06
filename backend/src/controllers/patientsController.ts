import { Request, Response } from 'express';
import Patient from '../models/Patient';
import User from '../models/User';
import CalendarEvent from '../models/CalendarEvent';
import Calendar from '../models/Calendar';
import MedicationLog from '../models/MedicationLog';
import sequelize from '../models/database';
import { Op, QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';

// GET /api/patients - Get all patients for the logged-in therapist, or own record if patient
export const getPatients = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { active, userId: queryUserId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = {};

    // If userId query parameter is provided (patient querying their own record)
    if (queryUserId) {
      where.userId = parseInt(queryUserId as string);
    } else {
      // Otherwise, filter by therapistId (therapist querying their patients)
      where.therapistId = userId;
    }

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
    delete sanitizedData.therapistId; // Don't allow client to override therapistId

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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can view any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only view their own patients
      where.therapistId = userId;
    } else if (userRole === 'patient') {
      // Patients can only view their own record
      where.userId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can update any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only update their own patients
      where.therapistId = userId;
    } else if (userRole === 'patient') {
      // Patients can only update their own record
      where.userId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

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
    delete sanitizedData.therapistId; // Don't allow client to override therapistId

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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can delete any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only delete their own patients
      where.therapistId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can toggle any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only toggle their own patients
      where.therapistId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can view any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only view their own patients
      where.therapistId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

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

// POST /api/patients/complete-profile - Patient completes their profile (creates patient record)
export const completeProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.name;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if patient record already exists
    const existingPatient = await Patient.findOne({ where: { userId } });
    if (existingPatient) {
      return res.json(existingPatient); // Already has profile
    }

    // Extract required fields from request
    const { surgeryDate, height, heightUnit, startingWeight, weightUnit, therapistId } = req.body;

    if (!surgeryDate) {
      return res.status(400).json({ error: 'Surgery date is required' });
    }

    // Create patient record linked to user account
    const patientData = {
      userId,
      therapistId: therapistId || 1, // Default therapist or provided
      name: userName || 'Patient',
      email: userEmail,
      surgeryDate,
      height: height || null,
      heightUnit: heightUnit || 'in',
      startingWeight: startingWeight || null,
      currentWeight: startingWeight || null,
      weightUnit: weightUnit || 'lbs',
      isActive: true
    };

    const patient = await Patient.create(patientData);

    console.log(`[COMPLETE_PROFILE] Created patient record ${patient.id} for user ${userId}`);

    res.status(201).json(patient);
  } catch (error: any) {
    console.error('Error completing patient profile:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET /api/patients/:id/metrics - Get patient compliance metrics
export const getPatientMetrics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause based on user role
    const where: any = { id };

    if (userRole === 'admin') {
      // Admins can view any patient record - no additional where clause needed
    } else if (userRole === 'therapist') {
      // Therapists can only view their own patients
      where.therapistId = userId;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const patient = await Patient.findOne({ where });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // CRITICAL FIX: Auto-link patient to user if missing
    // In this system, users and patients are the SAME entity
    let patientUserId = patient.userId;
    console.log(`[METRICS] Patient ${patient.id} (${patient.name}) - userId: ${patientUserId}, email: ${patient.email}`);

    if (!patientUserId) {
      console.log(`[METRICS] Patient ${patient.id} (${patient.name}) has no userId - attempting auto-link`);

      // Try to find matching user by email or name
      const User = (await import('../models/User')).default;
      let matchingUser = null;

      if (patient.email) {
        matchingUser = await User.findOne({ where: { email: patient.email } });
      }

      // If patient email matches current user, link to current user
      if (!matchingUser && patient.email === req.user?.email) {
        patientUserId = userId;
        console.log(`[METRICS] Linking patient ${patient.id} to current user ${userId}`);
      }
      // If found matching user by email, link to that user
      else if (matchingUser) {
        patientUserId = matchingUser.id;
        console.log(`[METRICS] Linking patient ${patient.id} to user ${matchingUser.id} via email match`);
      }

      // If we found a user to link, update the patient record
      if (patientUserId) {
        await patient.update({ userId: patientUserId });
        console.log(`[METRICS] Successfully linked patient ${patient.id} to userId ${patientUserId}`);
      } else {
        // No matching user found - return unknown status
        console.log(`[METRICS] No matching user found for patient ${patient.id}`);
        return res.json({
          complianceStatus: 'unknown',
          completionRate: 0,
          recentEvents: 0,
          message: 'Patient does not have a linked user account'
        });
      }
    }

    // Calculate metrics based on last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log(`[METRICS] Querying events for userId ${patientUserId} since ${thirtyDaysAgo.toISOString()}`);

    // Use raw SQL queries to bypass TypeScript/Sequelize type limitations
    // Count total events in last 30 days
    const totalEventsResult = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM calendar_events ce
       INNER JOIN calendars c ON ce."calendarId" = c.id
       WHERE c."userId" = :userId
         AND ce."startTime" >= :thirtyDaysAgo`,
      {
        replacements: { userId: patientUserId, thirtyDaysAgo },
        type: QueryTypes.SELECT
      }
    );

    // Count completed events in last 30 days
    const completedEventsResult = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM calendar_events ce
       INNER JOIN calendars c ON ce."calendarId" = c.id
       WHERE c."userId" = :userId
         AND ce."startTime" >= :thirtyDaysAgo
         AND ce."status" = 'completed'`,
      {
        replacements: { userId: patientUserId, thirtyDaysAgo },
        type: QueryTypes.SELECT
      }
    );

    // Count recent events (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEventsResult = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM calendar_events ce
       INNER JOIN calendars c ON ce."calendarId" = c.id
       WHERE c."userId" = :userId
         AND ce."startTime" >= :sevenDaysAgo`,
      {
        replacements: { userId: patientUserId, sevenDaysAgo },
        type: QueryTypes.SELECT
      }
    );

    // Extract count values from query results
    const totalEventsCount = parseInt(totalEventsResult[0]?.count || '0', 10);
    const completedEventsCount = parseInt(completedEventsResult[0]?.count || '0', 10);
    const recentEventsCount = parseInt(recentEventsResult[0]?.count || '0', 10);

    console.log(`[METRICS] Patient ${patient.id} results - Total: ${totalEventsCount}, Completed: ${completedEventsCount}, Recent: ${recentEventsCount}`);

    let completionRate = 0;
    if (totalEventsCount > 0) {
      completionRate = Math.round((completedEventsCount / totalEventsCount) * 100);
    }

    // Determine compliance status based on completion rate
    let complianceStatus: 'excellent' | 'warning' | 'poor' | 'unknown';
    if (totalEventsCount === 0) {
      complianceStatus = 'unknown';
    } else if (completionRate >= 85) {
      complianceStatus = 'excellent';
    } else if (completionRate >= 60) {
      complianceStatus = 'warning';
    } else {
      complianceStatus = 'poor';
    }

    res.json({
      complianceStatus,
      completionRate,
      recentEvents: recentEventsCount,
      totalEvents: totalEventsCount,
      completedEvents: completedEventsCount,
      calculationPeriod: '30 days'
    });
  } catch (error) {
    console.error('Error calculating patient metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
