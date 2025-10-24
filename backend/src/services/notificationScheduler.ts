import cron from 'node-cron';
import Medication from '../models/Medication';
import CalendarEvent from '../models/CalendarEvent';
import User from '../models/User';
import { Op } from 'sequelize';

// Email service (placeholder - requires nodemailer configuration)
async function sendEmailNotification(user: any, subject: string, message: string) {
  console.log(`[EMAIL] To: ${user.email}, Subject: ${subject}, Message: ${message}`);
  // TODO: Implement with nodemailer
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({...});
}

// SMS service (placeholder - requires Twilio configuration)
async function sendSMSNotification(user: any, message: string) {
  if (!user.phoneNumber) return;
  console.log(`[SMS] To: ${user.phoneNumber}, Message: ${message}`);
  // TODO: Implement with Twilio
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({...});
}

// Push notification service (placeholder - requires Firebase configuration)
async function sendPushNotification(user: any, title: string, body: string) {
  console.log(`[PUSH] To User ${user.id}, Title: ${title}, Body: ${body}`);
  // TODO: Implement with Firebase Admin SDK
  // await admin.messaging().send({...});
}

// Check for medication reminders and send notifications
export async function checkMedicationReminders() {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find upcoming medication events in the next hour
    const upcomingMeds = await CalendarEvent.findAll({
      where: {
        eventType: 'medication',
        startTime: {
          [Op.between]: [now, oneHourFromNow]
        },
        status: { [Op.ne]: 'completed' }
      },
      include: [
        {
          association: 'calendar',
          include: [{ association: 'user' }]
        }
      ]
    });

    for (const event of upcomingMeds) {
      const user = event.calendar?.user;
      if (!user) continue;

      const timeUntil = Math.round((new Date(event.startTime).getTime() - now.getTime()) / (1000 * 60));
      const message = `Medication reminder: ${event.title} in ${timeUntil} minutes`;

      // Send via all enabled channels
      await sendEmailNotification(user, 'Medication Reminder', message);
      await sendSMSNotification(user, message);
      await sendPushNotification(user, 'Medication Reminder', message);
    }

    console.log(`[SCHEDULER] Checked medication reminders: ${upcomingMeds.length} notifications sent`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking medication reminders:', error);
  }
}

// Check for upcoming appointments and send reminders
export async function checkAppointmentReminders() {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find appointments in the next 24 hours
    const upcomingAppointments = await CalendarEvent.findAll({
      where: {
        eventType: 'appointment',
        startTime: {
          [Op.between]: [now, twentyFourHoursFromNow]
        },
        status: { [Op.ne]: 'completed' }
      },
      include: [
        {
          association: 'calendar',
          include: [{ association: 'user' }]
        }
      ]
    });

    for (const event of upcomingAppointments) {
      const user = event.calendar?.user;
      if (!user) continue;

      const hoursUntil = Math.round((new Date(event.startTime).getTime() - now.getTime()) / (1000 * 60 * 60));
      const message = `Appointment reminder: ${event.title} in ${hoursUntil} hours at ${event.location || 'TBD'}`;

      await sendEmailNotification(user, 'Appointment Reminder', message);
      await sendSMSNotification(user, message);
      await sendPushNotification(user, 'Appointment Reminder', message);
    }

    console.log(`[SCHEDULER] Checked appointment reminders: ${upcomingAppointments.length} notifications sent`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking appointment reminders:', error);
  }
}

// Check for medication refills needed
export async function checkMedicationRefills() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find medications that need refills in the next 7 days
    const medicationsNeedingRefill = await Medication.findAll({
      where: {
        isActive: true,
        refillDate: {
          [Op.between]: [now, sevenDaysFromNow]
        }
      },
      include: [{ association: 'user' }]
    });

    for (const medication of medicationsNeedingRefill) {
      const user = medication.user;
      if (!user) continue;

      const daysUntil = Math.round((new Date(medication.refillDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const message = `Refill reminder: ${medication.name} needs to be refilled in ${daysUntil} days. Pharmacy: ${medication.pharmacy || 'Not specified'}`;

      await sendEmailNotification(user, 'Medication Refill Reminder', message);
      await sendSMSNotification(user, message);
      await sendPushNotification(user, 'Refill Reminder', message);
    }

    console.log(`[SCHEDULER] Checked medication refills: ${medicationsNeedingRefill.length} reminders sent`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking medication refills:', error);
  }
}

// Check for vitals readings reminders (daily reminder if no reading today)
export async function checkVitalsReminders() {
  try {
    const users = await User.findAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const user of users) {
      // Check if user has recorded vitals today
      const todayVitals = await user.$get('vitalsSamples', {
        where: {
          timestamp: { [Op.gte]: today }
        }
      });

      if (todayVitals.length === 0) {
        const message = 'Daily reminder: Don\'t forget to record your vital signs today!';
        await sendPushNotification(user, 'Vitals Reminder', message);
      }
    }

    console.log(`[SCHEDULER] Checked vitals reminders for ${users.length} users`);
  } catch (error) {
    console.error('[SCHEDULER] Error checking vitals reminders:', error);
  }
}

// Initialize all scheduled tasks
export function initializeScheduler() {
  console.log('[SCHEDULER] Initializing notification scheduler...');

  // Check medication reminders every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    console.log('[SCHEDULER] Running medication reminder check...');
    checkMedicationReminders();
  });

  // Check appointment reminders every hour
  cron.schedule('0 * * * *', () => {
    console.log('[SCHEDULER] Running appointment reminder check...');
    checkAppointmentReminders();
  });

  // Check medication refills once daily at 9 AM
  cron.schedule('0 9 * * *', () => {
    console.log('[SCHEDULER] Running medication refill check...');
    checkMedicationRefills();
  });

  // Check vitals reminders once daily at 8 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[SCHEDULER] Running vitals reminder check...');
    checkVitalsReminders();
  });

  console.log('[SCHEDULER] All notification tasks scheduled successfully');
  console.log('[SCHEDULER] - Medication reminders: Every 15 minutes');
  console.log('[SCHEDULER] - Appointment reminders: Every hour');
  console.log('[SCHEDULER] - Refill reminders: Daily at 9 AM');
  console.log('[SCHEDULER] - Vitals reminders: Daily at 8 AM');
}

// Manual trigger for testing
export async function sendTestNotification(userId: number, type: string) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const message = `This is a test ${type} notification`;

    switch (type) {
      case 'email':
        await sendEmailNotification(user, 'Test Notification', message);
        break;
      case 'sms':
        await sendSMSNotification(user, message);
        break;
      case 'push':
        await sendPushNotification(user, 'Test Notification', message);
        break;
      default:
        await sendEmailNotification(user, 'Test Notification', message);
        await sendSMSNotification(user, message);
        await sendPushNotification(user, 'Test Notification', message);
    }

    return { success: true, message: 'Test notification sent' };
  } catch (error) {
    console.error('[SCHEDULER] Error sending test notification:', error);
    throw error;
  }
}
