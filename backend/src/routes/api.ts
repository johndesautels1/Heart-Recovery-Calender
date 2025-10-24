import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as calendarsController from '../controllers/calendarsController';
import * as eventsController from '../controllers/calendarController';
import * as mealsController from '../controllers/mealController';
import * as vitalsController from '../controllers/vitalsController';
import * as medicationsController from '../controllers/medicationsController';

const router = Router();

// ========== AUTH ROUTES (PUBLIC) ==========
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// All routes below require authentication
router.use(authenticateToken);

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
router.post('/medications', medicationsController.addMedication);
router.get('/medications/schedule', medicationsController.getSchedule);
router.get('/medications/:id', medicationsController.getMedication);
router.put('/medications/:id', medicationsController.updateMedication);
router.delete('/medications/:id', medicationsController.deleteMedication);
router.patch('/medications/:id/toggle-active', medicationsController.toggleActive);
router.post('/medications/:id/log-dose', medicationsController.logDose);

export default router;
