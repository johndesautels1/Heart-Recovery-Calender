import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as calendarsController from '../controllers/calendarsController';
import * as eventsController from '../controllers/calendarController';
import * as mealsController from '../controllers/mealController';
import * as vitalsController from '../controllers/vitalsController';
import * as medicationsController from '../controllers/medicationsController';
import * as therapyGoalsController from '../controllers/therapyGoalsController';
import * as alertsController from '../controllers/alertsController';
import * as foodCategoriesController from '../controllers/foodCategoriesController';
import * as foodItemsController from '../controllers/foodItemsController';
import * as patientsController from '../controllers/patientsController';

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
router.get('/medications/logs', medicationsController.getMedicationLogs);
router.get('/medications/:id', medicationsController.getMedication);
router.put('/medications/:id', medicationsController.updateMedication);
router.delete('/medications/:id', medicationsController.deleteMedication);
router.patch('/medications/:id/toggle-active', medicationsController.toggleActive);
router.post('/medications/:id/log-dose', medicationsController.logDose);
router.put('/medications/logs/:logId', medicationsController.updateMedicationLog);

// ========== THERAPY GOALS ROUTES ==========
router.get('/therapy-goals', therapyGoalsController.getTherapyGoals);
router.post('/therapy-goals', therapyGoalsController.createTherapyGoal);
router.get('/therapy-goals/:id', therapyGoalsController.getTherapyGoal);
router.put('/therapy-goals/:id', therapyGoalsController.updateTherapyGoal);
router.delete('/therapy-goals/:id', therapyGoalsController.deleteTherapyGoal);
router.put('/therapy-goals/:id/progress', therapyGoalsController.updateGoalProgress);

// ========== ALERTS ROUTES ==========
router.get('/alerts', alertsController.getAlerts);
router.post('/alerts', alertsController.createAlert);
router.get('/alerts/stats', alertsController.getAlertStats);
router.get('/alerts/:id', alertsController.getAlert);
router.put('/alerts/:id', alertsController.updateAlert);
router.delete('/alerts/:id', alertsController.deleteAlert);
router.put('/alerts/:id/resolve', alertsController.resolveAlert);
router.put('/alerts/:id/unresolve', alertsController.unresolveAlert);
router.put('/alerts/:id/mark-notified', alertsController.markNotified);

// ========== FOOD CATEGORIES ROUTES ==========
router.get('/food-categories', foodCategoriesController.getFoodCategories);
router.post('/food-categories', foodCategoriesController.createFoodCategory);
router.get('/food-categories/:id', foodCategoriesController.getFoodCategoryById);
router.put('/food-categories/:id', foodCategoriesController.updateFoodCategory);
router.delete('/food-categories/:id', foodCategoriesController.deleteFoodCategory);

// ========== FOOD ITEMS ROUTES ==========
router.get('/food-items', foodItemsController.getFoodItems);
router.post('/food-items', foodItemsController.createFoodItem);
router.get('/food-items/search', foodItemsController.searchFoodItems);
router.get('/food-items/stats', foodItemsController.getFoodStats);
router.get('/food-items/category/:categoryId', foodItemsController.getFoodItemsByCategory);
router.get('/food-items/rating/:rating', foodItemsController.getFoodItemsByHealthRating);
router.get('/food-items/:id', foodItemsController.getFoodItemById);
router.put('/food-items/:id', foodItemsController.updateFoodItem);
router.delete('/food-items/:id', foodItemsController.deleteFoodItem);

// ========== PATIENTS ROUTES ==========
router.get('/patients', patientsController.getPatients);
router.post('/patients', patientsController.addPatient);
router.get('/patients/:id', patientsController.getPatient);
router.put('/patients/:id', patientsController.updatePatient);
router.delete('/patients/:id', patientsController.deletePatient);
router.patch('/patients/:id/toggle-active', patientsController.toggleActive);
router.get('/patients/:id/post-op-week', patientsController.getPostOpWeek);

export default router;
