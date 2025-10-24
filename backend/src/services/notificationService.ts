import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
});

export const sendEmail = async (userEmail: string, message: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your-user',
      pass: process.env.SMTP_PASS || 'your-pass'
    }
  });

  await transporter.sendMail({
    from: `"Heartbeat Calendar" <heartbeat@yourdomain.com>`,
    to: userEmail,
    subject: 'Notification from Heartbeat Calendar',
    text: message
  });
};

export const sendSMS = async (phone: string, message: string) => {
  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
};

export const sendPush = async (deviceToken: string, message: string) => {
  await admin.messaging().send({
    token: deviceToken,
    notification: {
      title: 'Heartbeat Calendar',
      body: message,
    },
  });
};