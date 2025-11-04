import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import logger from '../config/logger';

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

/**
 * Check if email service is configured
 */
export const isEmailConfigured = (): boolean => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

/**
 * Check if SMS service is configured
 */
export const isSMSConfigured = (): boolean => {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
};

/**
 * Check if push notification service is configured
 */
export const isPushConfigured = (): boolean => {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
};

// Initialize Twilio client only if configured
let twilioClient: twilio.Twilio | null = null;
if (isSMSConfigured()) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    logger.info('✅ Twilio SMS service initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize Twilio:', error);
  }
} else {
  logger.warn('⚠️ Twilio SMS not configured - SMS notifications disabled');
}

// Initialize Firebase Admin only if configured
let firebaseInitialized = false;
if (isPushConfigured()) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
      }),
    });
    firebaseInitialized = true;
    logger.info('✅ Firebase push notification service initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase:', error);
  }
} else {
  logger.warn('⚠️ Firebase not configured - Push notifications disabled');
}

// ============================================================================
// EMAIL NOTIFICATION SERVICE
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email notification
 * @param options Email configuration
 * @returns Success status
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  if (!isEmailConfigured()) {
    logger.warn('⚠️ Email not configured - Skipping email to:', options.to);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Heart Recovery Calendar" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    logger.info(`✅ Email sent successfully to: ${options.to}`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to send email:', error);
    return false;
  }
};

/**
 * Send medication reminder email
 */
export const sendMedicationReminderEmail = async (
  userEmail: string,
  medicationName: string,
  dosage: string,
  timeOfDay: string
): Promise<boolean> => {
  const subject = `💊 Medication Reminder: ${medicationName}`;
  const text = `Hi there!\n\nThis is a reminder to take your medication:\n\nMedication: ${medicationName}\nDosage: ${dosage}\nTime: ${timeOfDay}\n\nStay on track with your recovery!\n\nBest regards,\nHeart Recovery Calendar Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
      <div style="background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #667eea; margin-bottom: 20px;">💊 Medication Reminder</h2>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi there!</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">This is a reminder to take your medication:</p>
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 5px 0;"><strong>Medication:</strong> ${medicationName}</p>
          <p style="margin: 5px 0;"><strong>Dosage:</strong> ${dosage}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${timeOfDay}</p>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Stay on track with your recovery!</p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br><strong>Heart Recovery Calendar Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Send therapy goal reminder email
 */
export const sendGoalReminderEmail = async (
  userEmail: string,
  goalTitle: string,
  goalDescription: string,
  targetDate: string
): Promise<boolean> => {
  const subject = `🎯 Goal Reminder: ${goalTitle}`;
  const text = `Hi there!\n\nThis is a reminder about your therapy goal:\n\nGoal: ${goalTitle}\nDescription: ${goalDescription}\nTarget Date: ${targetDate}\n\nKeep up the great work!\n\nBest regards,\nHeart Recovery Calendar Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px;">
      <div style="background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #f5576c; margin-bottom: 20px;">🎯 Goal Reminder</h2>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi there!</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">This is a reminder about your therapy goal:</p>
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
          <p style="margin: 5px 0;"><strong>Goal:</strong> ${goalTitle}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${goalDescription}</p>
          <p style="margin: 5px 0;"><strong>Target Date:</strong> ${targetDate}</p>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Keep up the great work!</p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br><strong>Heart Recovery Calendar Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
};

// ============================================================================
// SMS NOTIFICATION SERVICE
// ============================================================================

/**
 * Send an SMS notification
 * @param phone Phone number (E.164 format: +1234567890)
 * @param message SMS message content
 * @returns Success status
 */
export const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  if (!isSMSConfigured() || !twilioClient) {
    logger.warn('⚠️ SMS not configured - Skipping SMS to:', phone);
    return false;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone
    });

    logger.info(`✅ SMS sent successfully to: ${phone}`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to send SMS:', error);
    return false;
  }
};

/**
 * Send medication reminder SMS
 */
export const sendMedicationReminderSMS = async (
  phone: string,
  medicationName: string,
  dosage: string,
  timeOfDay: string
): Promise<boolean> => {
  const message = `💊 Medication Reminder: Take ${medicationName} (${dosage}) at ${timeOfDay}. Stay on track with your recovery! - Heart Recovery Calendar`;
  return sendSMS(phone, message);
};

/**
 * Send therapy goal reminder SMS
 */
export const sendGoalReminderSMS = async (
  phone: string,
  goalTitle: string,
  targetDate: string
): Promise<boolean> => {
  const message = `🎯 Goal Reminder: "${goalTitle}" - Target: ${targetDate}. Keep up the great work! - Heart Recovery Calendar`;
  return sendSMS(phone, message);
};

// ============================================================================
// PUSH NOTIFICATION SERVICE
// ============================================================================

/**
 * Send a push notification
 * @param deviceToken FCM device token
 * @param title Notification title
 * @param body Notification body
 * @returns Success status
 */
export const sendPush = async (
  deviceToken: string,
  title: string,
  body: string
): Promise<boolean> => {
  if (!isPushConfigured() || !firebaseInitialized) {
    logger.warn('⚠️ Push notifications not configured - Skipping push to:', deviceToken);
    return false;
  }

  try {
    await admin.messaging().send({
      token: deviceToken,
      notification: {
        title,
        body,
      },
    });

    logger.info(`✅ Push notification sent successfully to: ${deviceToken}`);
    return true;
  } catch (error) {
    logger.error('❌ Failed to send push notification:', error);
    return false;
  }
};

/**
 * Send medication reminder push notification
 */
export const sendMedicationReminderPush = async (
  deviceToken: string,
  medicationName: string,
  dosage: string,
  timeOfDay: string
): Promise<boolean> => {
  return sendPush(
    deviceToken,
    '💊 Medication Reminder',
    `Take ${medicationName} (${dosage}) at ${timeOfDay}`
  );
};

/**
 * Send therapy goal reminder push notification
 */
export const sendGoalReminderPush = async (
  deviceToken: string,
  goalTitle: string,
  targetDate: string
): Promise<boolean> => {
  return sendPush(
    deviceToken,
    '🎯 Goal Reminder',
    `"${goalTitle}" - Target: ${targetDate}`
  );
};