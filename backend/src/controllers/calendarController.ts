import { Request, Response } from 'express';
import CalendarEvent from '../models/CalendarEvent';
import Calendar from '../models/Calendar';
import EventTemplate from '../models/EventTemplate';
import Exercise from '../models/Exercise';
import User from '../models/User';
import ExerciseLog from '../models/ExerciseLog';
import ExercisePrescription from '../models/ExercisePrescription';
import Patient from '../models/Patient';
import { Op } from 'sequelize';

// GET /api/events - Get events with filters
export const getEvents = async (req: Request, res: Response) => {
  try {
    const { calendarId, start, end, status, patientId, invitationStatus, includeRelations } = req.query;
    const where: any = {};

    if (calendarId) {
      where.calendarId = calendarId;
    }

    if (start || end) {
      where.startTime = {};
      if (start) where.startTime[Op.gte] = new Date(start as string);
      if (end) where.startTime[Op.lte] = new Date(end as string);
    }

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (invitationStatus) {
      where.invitationStatus = invitationStatus;
    }

    const queryOptions: any = {
      where,
      order: [['startTime', 'ASC']],
    };

    // Optionally include related data
    if (includeRelations === 'true') {
      queryOptions.include = [
        { model: EventTemplate, as: 'template' },
        { model: Exercise, as: 'exercise' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'patient', attributes: ['id', 'name', 'email'] },
      ];
    }

    const events = await CalendarEvent.findAll(queryOptions);

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/events - Create new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Prepare event data
    const eventData: any = { ...req.body };

    // Set createdBy for therapists/admins
    if (userRole === 'therapist' || userRole === 'admin') {
      eventData.createdBy = userId;
    }

    // If event has a patientId and requires acceptance, set initial invitation status
    if (eventData.patientId && eventData.eventTemplateId) {
      const template = await EventTemplate.findByPk(eventData.eventTemplateId);
      if (template?.requiresPatientAcceptance && !eventData.invitationStatus) {
        eventData.invitationStatus = 'pending';
      }
    }

    // CRITICAL FIX: Ensure calendarId exists - find or create a calendar for the patient
    if (!eventData.calendarId) {
      const targetUserId = eventData.patientId || userId;

      // Try to find an existing general calendar for this user
      let calendar = await Calendar.findOne({
        where: {
          userId: targetUserId,
          type: 'general',
          isActive: true
        }
      });

      // If no calendar exists, create one
      if (!calendar) {
        calendar = await Calendar.create({
          userId: targetUserId,
          name: 'My Calendar',
          type: 'general',
          color: '#3f51b5',
          isActive: true,
          isSharedWithDoctor: true
        });
      }

      eventData.calendarId = calendar.id;
    }

    const event = await CalendarEvent.create(eventData);

    // Fetch with relations if needed
    const createdEvent = await CalendarEvent.findByPk(event.id, {
      include: [
        { model: EventTemplate, as: 'template' },
        { model: Exercise, as: 'exercise' },
      ],
    });

    res.status(201).json(createdEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/events/:id - Get specific event
export const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/events/:id - Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update(req.body);

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/:id - Delete event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/today - Delete all events for today
export const deleteTodayEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's calendar IDs
    const userCalendars = await Calendar.findAll({
      where: { userId },
      attributes: ['id'],
    });
    const calendarIds = userCalendars.map(cal => cal.id);

    if (calendarIds.length === 0) {
      return res.json({ deletedCount: 0, message: 'No events found' });
    }

    // Delete events from user's calendars for today
    const result = await CalendarEvent.destroy({
      where: {
        calendarId: {
          [Op.in]: calendarIds,
        },
        startTime: {
          [Op.gte]: today.toISOString(),
          [Op.lt]: tomorrow.toISOString(),
        },
      },
    });

    res.json({ deletedCount: result, message: `Deleted ${result} event(s) from today` });
  } catch (error) {
    console.error('Error deleting today\'s events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/events/history - Delete all historic events
export const deleteHistoricEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user's calendar IDs
    const userCalendars = await Calendar.findAll({
      where: { userId },
      attributes: ['id'],
    });
    const calendarIds = userCalendars.map(cal => cal.id);

    if (calendarIds.length === 0) {
      return res.json({ deletedCount: 0, message: 'No events found' });
    }

    // Delete events from user's calendars that ended before today
    const result = await CalendarEvent.destroy({
      where: {
        calendarId: {
          [Op.in]: calendarIds,
        },
        endTime: {
          [Op.lt]: today.toISOString(),
        },
      },
    });

    res.json({ deletedCount: result, message: `Deleted ${result} historic event(s)` });
  } catch (error) {
    console.error('Error deleting historic events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/events/:id/status - Update event status
export const updateEventStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update({ status });

    res.json(event);
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/events/:id/instances - Get instances of recurring event
export const getEventInstances = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.recurrenceRule) {
      return res.status(400).json({ error: 'Event is not recurring' });
    }

    // TODO: Implement recurrence rule parsing using recurrenceService
    // For now, return empty array
    const instances: any[] = [];

    res.json({ instances });
  } catch (error) {
    console.error('Error fetching event instances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/events/:id/invitation-status - Update invitation status (patients only)
export const updateInvitationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { invitationStatus } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (!invitationStatus || !['accepted', 'declined', 'pending'].includes(invitationStatus)) {
      return res.status(400).json({ error: 'Valid invitationStatus is required (accepted, declined, or pending)' });
    }

    const event = await CalendarEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only the assigned patient can update invitation status
    if (userRole === 'patient' && event.patientId !== userId) {
      return res.status(403).json({ error: 'You can only update invitation status for events assigned to you' });
    }

    // Therapists can also update invitation status for their patients
    if (userRole !== 'therapist' && userRole !== 'patient' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only patients and therapists can update invitation status' });
    }

    await event.update({ invitationStatus });

    const updatedEvent = await CalendarEvent.findByPk(id, {
      include: [
        { model: EventTemplate, as: 'template' },
        { model: Exercise, as: 'exercise' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'patient', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating invitation status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/events/pending-invitations - Get all pending event invitations for current patient
export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Only patients can access this endpoint
    if (userRole !== 'patient') {
      return res.status(403).json({ error: 'Only patients can view pending invitations' });
    }

    const events = await CalendarEvent.findAll({
      where: {
        patientId: userId,
        invitationStatus: 'pending',
      },
      include: [
        { model: EventTemplate, as: 'template' },
        { model: Exercise, as: 'exercise' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
      ],
      order: [['startTime', 'ASC']],
    });

    res.json({ data: events });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/events/stats/monthly - Get monthly performance statistics from calendar events
export const getMonthlyStats = async (req: Request, res: Response) => {
  try {
    const { patientId, year, month } = req.query;

    if (!patientId || !year || !month) {
      return res.status(400).json({ error: 'patientId, year, and month are required' });
    }

    // IMPORTANT: Frontend passes patient.id, but CalendarEvent.patientId references users.id
    // while ExerciseLog.patientId references patients.id. We need to handle this difference.

    // Get the patient record to find the userId
    const patient = await Patient.findByPk(Number(patientId));
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const userId = patient.userId; // Get the user ID from the patient record

    // Calculate date range for the month
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

    // Query calendar_events using userId (since CalendarEvent.patientId references users.id)
    const events = await CalendarEvent.findAll({
      where: {
        patientId: userId, // Use userId for calendar_events
        exerciseId: { [Op.not]: null }, // Only exercise events
        performanceScore: { [Op.not]: null }, // Only events with scores
        startTime: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: Exercise,
          as: 'exercise',
        },
      ],
      order: [['startTime', 'DESC']],
    });

    // Calculate total sessions and scores
    const totalSessions = events.length;
    const totalScore = events.reduce((sum, event) => sum + (event.performanceScore || 0), 0);

    // Calculate percentage based on number of sessions
    let maxPoints: number;
    let bonusPoints: number;
    let pointsPerSession: number;

    if (totalSessions === 0) {
      maxPoints = 0;
      bonusPoints = 0;
      pointsPerSession = 8;
    } else if (totalSessions <= 12) {
      // 12 sessions: each worth 8 points = 96 points + 4 bonus = 100
      pointsPerSession = 8;
      maxPoints = totalSessions * 8;
      bonusPoints = Math.min(4, Math.round((totalScore / (totalSessions * 8)) * 4));
    } else {
      // 13-15 sessions: each worth 6 points = 90 points + 10 bonus = 100
      pointsPerSession = 6;
      maxPoints = totalSessions * 6;
      bonusPoints = Math.min(10, Math.round((totalScore / (totalSessions * 6)) * 10));
    }

    const finalScore = Math.min(100, totalScore + bonusPoints);
    const percentageScore = maxPoints > 0 ? Math.round((finalScore / 100) * 100) : 0;

    // Group by performance level
    const performanceBreakdown = {
      noShow: events.filter(e => e.performanceScore === 0).length,
      completed: events.filter(e => e.performanceScore === 4).length,
      metGoals: events.filter(e => e.performanceScore === 6).length,
      exceededGoals: events.filter(e => e.performanceScore === 8).length,
    };

    // Calculate weekly breakdown
    const weeklyStats = events.reduce((acc, event) => {
      const week = Math.ceil(new Date(event.startTime).getDate() / 7);
      if (!acc[week]) {
        acc[week] = { sessions: 0, score: 0 };
      }
      acc[week].sessions++;
      acc[week].score += event.performanceScore || 0;
      return acc;
    }, {} as Record<number, { sessions: number; score: number }>);

    // ALSO fetch exercise logs for the same period (for charts that need actual duration data)
    const exerciseLogs = await ExerciseLog.findAll({
      where: {
        patientId: Number(patientId),
        completedAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: ExercisePrescription,
          as: 'prescription',
          include: [
            {
              model: Exercise,
              as: 'exercise',
            },
          ],
        },
      ],
      order: [['completedAt', 'DESC']],
    });

    // ========== MET CALCULATION LOGIC ==========
    // Calculate patient age and max heart rate for MET calculations
    let patientAge = null;
    let maxHeartRate = null;
    let restingHeartRate = patient.restingHeartRate || null;
    let targetHeartRateMin = patient.targetHeartRateMin || null;
    let targetHeartRateMax = patient.targetHeartRateMax || null;

    // Calculate age from date of birth
    if (patient.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(patient.dateOfBirth);
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
    }

    // Calculate max heart rate (use patient's custom value or 220 - age)
    if (patient.maxHeartRate) {
      maxHeartRate = patient.maxHeartRate;
    } else if (patientAge) {
      maxHeartRate = 220 - patientAge;
    }

    // Function to calculate MET using Heart Rate Reserve method
    const calculateMET = (duringHR: number, restingHR: number, maxHR: number): number => {
      if (!duringHR || !restingHR || !maxHR || maxHR <= restingHR) {
        return 0;
      }
      // METs = [(HR_during - HR_rest) / (HR_max - HR_rest)] × 9 + 1
      const hrReserve = maxHR - restingHR;
      const hrWorking = duringHR - restingHR;
      const mets = (hrWorking / hrReserve) * 9 + 1;

      // Clamp METs to reasonable range (1-20)
      return Math.max(1, Math.min(20, mets));
    };

    // Transform exercise logs to match the format expected by frontend charts
    const logsForCharts = exerciseLogs.map((log: any) => {
      // Calculate actual MET if we have heart rate data
      let actualMET = null;
      let targetMETMin = null;
      let targetMETMax = null;

      // Use preHeartRate from the log if available, otherwise use patient's baseline
      const effectiveRestingHR = log.preHeartRate || restingHeartRate;

      if (log.duringHeartRateAvg && effectiveRestingHR && maxHeartRate) {
        actualMET = calculateMET(log.duringHeartRateAvg, effectiveRestingHR, maxHeartRate);
      }

      // Calculate target MET range based on patient's target heart rate zones
      if (targetHeartRateMin && effectiveRestingHR && maxHeartRate) {
        targetMETMin = calculateMET(targetHeartRateMin, effectiveRestingHR, maxHeartRate);
      }
      if (targetHeartRateMax && effectiveRestingHR && maxHeartRate) {
        targetMETMax = calculateMET(targetHeartRateMax, effectiveRestingHR, maxHeartRate);
      }

      return {
        id: log.id,
        startTime: log.startTime || log.completedAt,
        completedAt: log.completedAt,
        actualDuration: log.actualDuration,
        distanceMiles: log.distanceMiles || 0,
        caloriesBurned: log.caloriesBurned,
        performanceScore: log.performanceLevel === 'exceeded_goals' ? 8
          : log.performanceLevel === 'met_goals' ? 6
          : log.performanceLevel === 'completed' ? 4
          : 0,
        performanceLevel: log.performanceLevel,
        // Heart rate data
        preHeartRate: log.preHeartRate,
        duringHeartRateAvg: log.duringHeartRateAvg,
        duringHeartRateMax: log.duringHeartRateMax,
        postHeartRate: log.postHeartRate,
        heartRateAvg: log.duringHeartRateAvg || 0, // Alias for chart compatibility
        // MET calculations
        actualMET: actualMET ? Number(actualMET.toFixed(2)) : null,
        targetMETMin: targetMETMin ? Number(targetMETMin.toFixed(2)) : null,
        targetMETMax: targetMETMax ? Number(targetMETMax.toFixed(2)) : null,
      };
    });

    // Merge calendar events and exercise logs for the "logs" field
    const allLogs = [
      ...events.map((e: any) => {
        // Calculate calories burned based on duration and performance score
        const duration = e.durationMinutes || 0;
        const score = e.performanceScore || 0;

        // Intensity multiplier based on performance score
        let intensityMultiplier = 0;
        if (score === 0) intensityMultiplier = 0; // no show
        else if (score === 4) intensityMultiplier = 0.8; // completed (lighter effort)
        else if (score === 6) intensityMultiplier = 1.0; // met goals (moderate effort)
        else if (score === 8) intensityMultiplier = 1.2; // exceeded goals (higher effort)

        // Base rate: ~5 calories per minute for cardiac exercise
        const caloriesBurned = Math.round(duration * 5 * intensityMultiplier);

        return {
          id: e.id,
          startTime: e.startTime,
          completedAt: e.startTime, // calendar events don't have completedAt
          actualDuration: duration,
          distanceMiles: e.distanceMiles || 0,
          caloriesBurned,
          performanceScore: score,
          heartRateAvg: e.heartRateAvg || 0,
        };
      }),
      ...logsForCharts,
    ].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    res.json({
      month: Number(month),
      year: Number(year),
      totalSessions,
      totalScore,
      bonusPoints,
      finalScore,
      percentageScore,
      maxPossibleScore: 100,
      pointsPerSession,
      performanceBreakdown,
      weeklyStats,
      events,
      exerciseLogs, // NEW: raw exercise logs
      logs: allLogs, // NEW: merged logs for charts
      // Patient cardiac baseline data for MET calculations and chart reference
      patientCardiacBaseline: {
        age: patientAge,
        dateOfBirth: patient.dateOfBirth,
        restingHeartRate: restingHeartRate,
        maxHeartRate: maxHeartRate,
        targetHeartRateMin: targetHeartRateMin,
        targetHeartRateMax: targetHeartRateMax,
        ejectionFraction: patient.ejectionFraction,
        medicationsAffectingHR: patient.medicationsAffectingHR,
      },
    });
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
