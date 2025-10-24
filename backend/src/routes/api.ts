import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  apiLimiter,
  authLimiter,
  exportLimiter,
  notificationTestLimiter,
  syncLimiter,
  createUpdateLimiter
} from '../middleware/rateLimiter';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as calendarsController from '../controllers/calendarsController';
import * as eventsController from '../controllers/calendarController';
import * as mealsController from '../controllers/mealController';
import * as vitalsController from '../controllers/vitalsController';
import * as medicationsController from '../controllers/medicationsController';
import * as reportsController from '../controllers/reportsController';
import * as notificationsController from '../controllers/notificationsController';
import * as googleCalendarController from '../controllers/googleCalendarController';
import * as appleCalendarController from '../controllers/appleCalendarController';

const router = Router();

// ========== AUTH ROUTES (PUBLIC) ==========
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);

// All routes below require authentication
router.use(authenticateToken);
router.use(apiLimiter); // Apply general rate limiting to all authenticated routes

// ========== AUTH ROUTES (PROTECTED) ==========
router.get('/auth/me', authController.getCurrentUser);

// ========== USER ROUTES ==========
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', userController.updateProfile);
router.delete('/users/account', userController.deleteAccount);

// ========== CALENDARS ROUTES ==========
router.get('/calendars', calendarsController.getCalendars);
router.post('/calendars', calendarsController.createCalendar);
router.get('/calendars/:id', calendarsController.getCalendar);
router.put('/calendars/:id', calendarsController.updateCalendar);
router.delete('/calendars/:id', calendarsController.deleteCalendar);

// ========== EVENTS ROUTES ==========
router.get('/events', eventsController.getEvents);
router.post('/events', eventsController.createEvent);
router.get('/events/:id', eventsController.getEvent);
router.put('/events/:id', eventsController.updateEvent);
router.delete('/events/:id', eventsController.deleteEvent);
router.patch('/events/:id/status', eventsController.updateEventStatus);
router.post('/events/:id/instances', eventsController.getEventInstances);

// ========== MEALS ROUTES ==========
router.get('/meals', mealsController.getMeals);
router.post('/meals', mealsController.addMeal);
router.get('/meals/daily-summary', mealsController.getDailySummary);
router.get('/meals/compliance', mealsController.getCompliance);
router.get('/meals/:id', mealsController.getMeal);
router.put('/meals/:id', mealsController.updateMeal);
router.delete('/meals/:id', mealsController.deleteMeal);

// ========== VITALS ROUTES ==========
router.get('/vitals', vitalsController.getVitals);
router.post('/vitals', vitalsController.addVital);
router.get('/vitals/latest', vitalsController.getLatestVital);
router.get('/vitals/trends', vitalsController.getTrends);
router.get('/vitals/:id', vitalsController.getVital);
router.put('/vitals/:id', vitalsController.updateVital);
router.delete('/vitals/:id', vitalsController.deleteVital);

// ========== MEDICATIONS ROUTES ==========
router.get('/medications', medicationsController.getMedications);
router.post('/medications', createUpdateLimiter, medicationsController.addMedication);
router.get('/medications/schedule', medicationsController.getSchedule);
router.get('/medications/:id', medicationsController.getMedication);
router.put('/medications/:id', createUpdateLimiter, medicationsController.updateMedication);
router.delete('/medications/:id', medicationsController.deleteMedication);
router.patch('/medications/:id/toggle-active', medicationsController.toggleActive);
router.post('/medications/:id/log-dose', medicationsController.logDose);

// ========== REPORTS ROUTES ==========
router.get('/reports/health-summary', reportsController.getHealthSummary);
router.get('/reports/compliance', reportsController.getComplianceAnalytics);
router.get('/reports/export/pdf', exportLimiter, reportsController.exportPDF);
router.get('/reports/export/csv', exportLimiter, reportsController.exportCSV);

// ========== NOTIFICATIONS ROUTES ==========
router.post('/notifications/test', notificationTestLimiter, notificationsController.testNotification);
router.get('/notifications/preferences', notificationsController.getNotificationPreferences);
router.put('/notifications/preferences', notificationsController.updateNotificationPreferences);

// ========== GOOGLE CALENDAR INTEGRATION ROUTES ==========
router.get('/integrations/google/auth', googleCalendarController.initiateGoogleAuth);
router.get('/integrations/google/oauth/callback', googleCalendarController.handleGoogleCallback);
router.post('/integrations/google/sync', syncLimiter, googleCalendarController.syncFromGoogle);
router.post('/integrations/google/export', syncLimiter, googleCalendarController.exportToGoogle);
router.delete('/integrations/google/disconnect', googleCalendarController.disconnectGoogle);
router.get('/integrations/google/status', googleCalendarController.getGoogleStatus);

// ========== APPLE CALENDAR INTEGRATION ROUTES ==========
router.get('/integrations/apple/export', exportLimiter, appleCalendarController.exportToAppleCalendar);
router.post('/integrations/apple/import', syncLimiter, appleCalendarController.importFromAppleCalendar);
router.get('/integrations/apple/subscribe', appleCalendarController.getSubscriptionUrl);
router.get('/integrations/apple/feed/:token', appleCalendarController.getCalendarFeed);
router.get('/integrations/apple/status', appleCalendarController.getAppleStatus);

export default router;
