import { Op } from 'sequelize';
import { format, parseISO, addMinutes, isBefore } from 'date-fns';
import logger from '../config/logger';
import {
  sendMedicationReminderEmail,
  sendMedicationReminderSMS,
  sendGoalReminderEmail,
  sendGoalReminderSMS,
  isEmailConfigured,
  isSMSConfigured
} from './notificationService';
import Medication from '../models/Medication';
import TherapyGoal from '../models/TherapyGoal';
import User from '../models/User';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * How often to check for reminders (in milliseconds)
 * Default: Every 5 minutes
 */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * How far in advance to send medication reminders (in minutes)
 * Default: 30 minutes before scheduled time
 */
const MEDICATION_REMINDER_ADVANCE_MINUTES = 30;

// ============================================================================
// MEDICATION REMINDERS
// ============================================================================

/**
 * Check for upcoming medication reminders and send notifications
 */
export const checkMedicationReminders = async (): Promise<void> => {
  try {
    logger.info('🔔 Checking medication reminders...');

    // Find all medications with reminders enabled
    const medications = await Medication.findAll({
      where: {
        reminderEnabled: true,
        timeOfDay: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'phoneNumber', 'preferences']
        }
      ]
    });

    if (medications.length === 0) {
      logger.info('✅ No medications with reminders enabled');
      return;
    }

    logger.info(`📋 Found ${medications.length} medications with reminders enabled`);

    const now = new Date();
    let remindersSent = 0;

    for (const medication of medications) {
      try {
        // Parse the time of day (format: "08:00 AM" or "20:00")
        const timeOfDay = medication.timeOfDay;
        if (!timeOfDay) continue;

        // Get today's date and combine with medication time
        const today = format(now, 'yyyy-MM-dd');
        let medicationTimeStr: string;

        // Handle both 12-hour and 24-hour formats
        if (timeOfDay.includes('AM') || timeOfDay.includes('PM')) {
          medicationTimeStr = `${today} ${timeOfDay}`;
        } else {
          medicationTimeStr = `${today}T${timeOfDay}:00`;
        }

        const medicationTime = parseISO(medicationTimeStr);
        const reminderTime = addMinutes(medicationTime, -MEDICATION_REMINDER_ADVANCE_MINUTES);

        // Check if we should send a reminder now
        // Send if: reminderTime <= now < medicationTime
        if (isBefore(reminderTime, now) && isBefore(now, medicationTime)) {
          // Check if we already sent a reminder today
          // (Simple check: if last update was today, we probably sent it)
          const lastUpdate = medication.updatedAt;
          const lastUpdateDate = format(lastUpdate, 'yyyy-MM-dd');
          const todayDate = format(now, 'yyyy-MM-dd');

          if (lastUpdateDate === todayDate) {
            // Already sent today, skip
            continue;
          }

          // Send reminder
          const user = medication.user;
          if (!user) {
            logger.warn(`⚠️ Medication ${medication.id} has no associated user`);
            continue;
          }

          logger.info(`📨 Sending reminder for: ${medication.name} to ${user.email}`);

          // Determine notification preference
          const preferences = user.preferences as any;
          const notificationMethod = preferences?.notificationMethod || 'email';

          let sent = false;

          // Send email if configured and preferred
          if ((notificationMethod === 'email' || notificationMethod === 'both') && isEmailConfigured()) {
            sent = await sendMedicationReminderEmail(
              user.email,
              medication.name,
              medication.dosage || 'As prescribed',
              timeOfDay
            );
          }

          // Send SMS if configured and preferred
          if ((notificationMethod === 'sms' || notificationMethod === 'both') && isSMSConfigured() && user.phoneNumber) {
            const smsSent = await sendMedicationReminderSMS(
              user.phoneNumber,
              medication.name,
              medication.dosage || 'As prescribed',
              timeOfDay
            );
            sent = sent || smsSent;
          }

          if (sent) {
            // Update medication to mark reminder as sent (update timestamp)
            await medication.update({ updatedAt: now });
            remindersSent++;
            logger.info(`✅ Reminder sent for: ${medication.name}`);
          }
        }
      } catch (error) {
        logger.error(`❌ Error processing medication ${medication.id}:`, error);
      }
    }

    logger.info(`✅ Medication reminders check complete. Sent: ${remindersSent}`);
  } catch (error) {
    logger.error('❌ Error checking medication reminders:', error);
  }
};

// ============================================================================
// THERAPY GOAL REMINDERS
// ============================================================================

/**
 * Check for therapy goal reminders and send notifications
 */
export const checkGoalReminders = async (): Promise<void> => {
  try {
    logger.info('🔔 Checking therapy goal reminders...');

    // Find all goals with reminders enabled
    const goals = await TherapyGoal.findAll({
      where: {
        reminderEnabled: true,
        status: {
          [Op.ne]: 'completed'
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'phoneNumber', 'preferences']
        }
      ]
    });

    if (goals.length === 0) {
      logger.info('✅ No goals with reminders enabled');
      return;
    }

    logger.info(`📋 Found ${goals.length} goals with reminders enabled`);

    const now = new Date();
    let remindersSent = 0;

    for (const goal of goals) {
      try {
        const frequency = goal.reminderFrequency;
        const lastReminded = goal.lastReminded;

        if (!frequency) continue;

        // Check if we should send a reminder based on frequency
        let shouldSend = false;

        if (!lastReminded) {
          // Never sent a reminder, send now
          shouldSend = true;
        } else {
          const daysSinceLastReminder = Math.floor(
            (now.getTime() - new Date(lastReminded).getTime()) / (1000 * 60 * 60 * 24)
          );

          switch (frequency) {
            case 'daily':
              shouldSend = daysSinceLastReminder >= 1;
              break;
            case 'weekly':
              shouldSend = daysSinceLastReminder >= 7;
              break;
            case 'biweekly':
              shouldSend = daysSinceLastReminder >= 14;
              break;
            case 'monthly':
              shouldSend = daysSinceLastReminder >= 30;
              break;
          }
        }

        if (shouldSend) {
          const user = goal.user;
          if (!user) {
            logger.warn(`⚠️ Goal ${goal.id} has no associated user`);
            continue;
          }

          logger.info(`📨 Sending goal reminder for: ${goal.title} to ${user.email}`);

          // Determine notification preference
          const preferences = user.preferences as any;
          const notificationMethod = preferences?.notificationMethod || 'email';

          let sent = false;

          // Send email if configured and preferred
          if ((notificationMethod === 'email' || notificationMethod === 'both') && isEmailConfigured()) {
            sent = await sendGoalReminderEmail(
              user.email,
              goal.title,
              goal.description || '',
              goal.targetDate ? format(parseISO(goal.targetDate), 'MMM dd, yyyy') : 'No target date'
            );
          }

          // Send SMS if configured and preferred
          if ((notificationMethod === 'sms' || notificationMethod === 'both') && isSMSConfigured() && user.phoneNumber) {
            const smsSent = await sendGoalReminderSMS(
              user.phoneNumber,
              goal.title,
              goal.targetDate ? format(parseISO(goal.targetDate), 'MMM dd, yyyy') : 'No target date'
            );
            sent = sent || smsSent;
          }

          if (sent) {
            // Update goal to mark reminder as sent
            await goal.update({ lastReminded: now });
            remindersSent++;
            logger.info(`✅ Goal reminder sent for: ${goal.title}`);
          }
        }
      } catch (error) {
        logger.error(`❌ Error processing goal ${goal.id}:`, error);
      }
    }

    logger.info(`✅ Goal reminders check complete. Sent: ${remindersSent}`);
  } catch (error) {
    logger.error('❌ Error checking goal reminders:', error);
  }
};

// ============================================================================
// SCHEDULER
// ============================================================================

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the notification scheduler
 * Runs checks at configured interval
 */
export const startNotificationScheduler = (): void => {
  if (schedulerInterval) {
    logger.warn('⚠️ Notification scheduler already running');
    return;
  }

  logger.info(`🚀 Starting notification scheduler (checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes)`);

  // Run checks immediately on startup
  checkMedicationReminders();
  checkGoalReminders();

  // Then run periodically
  schedulerInterval = setInterval(async () => {
    await checkMedicationReminders();
    await checkGoalReminders();
  }, CHECK_INTERVAL_MS);

  logger.info('✅ Notification scheduler started successfully');
};

/**
 * Stop the notification scheduler
 */
export const stopNotificationScheduler = (): void => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('✅ Notification scheduler stopped');
  }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = () => {
  return {
    running: schedulerInterval !== null,
    checkIntervalMinutes: CHECK_INTERVAL_MS / 1000 / 60,
    medicationReminderAdvanceMinutes: MEDICATION_REMINDER_ADVANCE_MINUTES,
    emailConfigured: isEmailConfigured(),
    smsConfigured: isSMSConfigured()
  };
};
