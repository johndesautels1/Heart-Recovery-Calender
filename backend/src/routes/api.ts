import { Router } from 'express';
import { authenticateToken, requirePatientProfile } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as calendarsController from '../controllers/calendarsController';
import * as eventsController from '../controllers/calendarController';
import * as mealsController from '../controllers/mealController';
import * as vitalsController from '../controllers/vitalsController';
import * as medicationsController from '../controllers/medicationsController';
import * as therapyGoalsController from '../controllers/therapyGoalsController';
import * as goalTemplatesController from '../controllers/goalTemplatesController';
import * as alertsController from '../controllers/alertsController';
import * as foodCategoriesController from '../controllers/foodCategoriesController';
import * as foodItemsController from '../controllers/foodItemsController';
import * as patientsController from '../controllers/patientsController';
import * as providersController from '../controllers/providersController';
import * as exercisesController from '../controllers/exercisesController';
import * as exercisePrescriptionsController from '../controllers/exercisePrescriptionsController';
import * as eventTemplatesController from '../controllers/eventTemplatesController';
import * as sleepLogsController from '../controllers/sleepLogsController';
import * as exerciseLogsController from '../controllers/exerciseLogsController';
import * as hydrationLogsController from '../controllers/hydrationLogsController';
import * as dailyScoresController from '../controllers/dailyScoresController';
import * as caloriesController from '../controllers/caloriesController';
import uploadRoutes from './upload';
import devicesRoutes from './devices';
import stravaRoutes from './strava';
// import polarRoutes from './polar';
// import samsungRoutes from './samsung';

const router = Router();

// ========== AUTH ROUTES (PUBLIC) ==========

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 * @body    { email, password, name, role }
 */
router.post('/auth/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive JWT authentication token
 * @access  Public
 * @body    { email, password }
 * @returns { token, user }
 */
router.post('/auth/login', authController.login);
// ========== STRAVA OAUTH CALLBACK (PUBLIC) ==========
// Strava routes must be registered before authenticateToken middleware
// because Strava's OAuth callback comes from their servers (no auth token)
// Note: /strava/auth route has its own authenticateToken middleware
router.use('/strava', stravaRoutes);

// All routes below require authentication
router.use(authenticateToken);

// ========== AUTH ROUTES (PROTECTED) ==========

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's information
 * @access  Private (requires JWT token)
 * @returns { user }
 */
router.get('/auth/me', authController.getCurrentUser);

// Allow profile completion without patient record

/**
 * @route   POST /api/patients/complete-profile
 * @desc    Complete patient profile after registration
 * @access  Private (requires JWT token)
 * @body    { dateOfBirth, gender, phoneNumber, emergencyContact, etc. }
 */
router.post('/patients/complete-profile', patientsController.completeProfile);

// All routes below require patient profile for patient-role users
router.use(requirePatientProfile);

// ========== USER ROUTES ==========

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile information
 * @access  Private
 */
router.get('/users/profile', userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile information
 * @access  Private
 * @body    { name, email, phoneNumber, etc. }
 */
router.put('/users/profile', userController.updateProfile);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/users/account', userController.deleteAccount);

// ========== CALENDARS ROUTES ==========

/** @route GET /api/calendars - @desc Get all calendars for the user - @access Private */
router.get('/calendars', calendarsController.getCalendars);

/** @route POST /api/calendars - @desc Create a new calendar - @access Private */
router.post('/calendars', calendarsController.createCalendar);

/** @route GET /api/calendars/:id - @desc Get a specific calendar by ID - @access Private */
router.get('/calendars/:id', calendarsController.getCalendar);

/** @route PUT /api/calendars/:id - @desc Update calendar settings - @access Private */
router.put('/calendars/:id', calendarsController.updateCalendar);

/** @route DELETE /api/calendars/:id - @desc Delete a calendar - @access Private */
router.delete('/calendars/:id', calendarsController.deleteCalendar);

// ========== EVENTS ROUTES ==========

/** @route GET /api/events - @desc Get all events (supports filters: startDate, endDate) - @access Private */
router.get('/events', eventsController.getEvents);

/** @route POST /api/events - @desc Create a new calendar event - @access Private */
router.post('/events', eventsController.createEvent);

/** @route GET /api/events/pending-invitations - @desc Get pending event invitations - @access Private */
router.get('/events/pending-invitations', eventsController.getPendingInvitations);

/** @route GET /api/events/stats/monthly - @desc Get monthly event statistics - @access Private */
router.get('/events/stats/monthly', eventsController.getMonthlyStats);

/** @route DELETE /api/events/today - @desc Delete all events for today - @access Private */
router.delete('/events/today', eventsController.deleteTodayEvents);

/** @route DELETE /api/events/history - @desc Delete historic events (older than X days) - @access Private */
router.delete('/events/history', eventsController.deleteHistoricEvents);

/** @route GET /api/events/:id - @desc Get a specific event by ID - @access Private */
router.get('/events/:id', eventsController.getEvent);

/** @route PUT /api/events/:id - @desc Update an event - @access Private */
router.put('/events/:id', eventsController.updateEvent);

/** @route DELETE /api/events/:id - @desc Delete an event - @access Private */
router.delete('/events/:id', eventsController.deleteEvent);

/** @route PATCH /api/events/:id/status - @desc Update event status (completed, cancelled, etc.) - @access Private */
router.patch('/events/:id/status', eventsController.updateEventStatus);

/** @route PATCH /api/events/:id/invitation-status - @desc Accept/decline event invitation - @access Private */
router.patch('/events/:id/invitation-status', eventsController.updateInvitationStatus);

/** @route POST /api/events/:id/instances - @desc Get instances of a recurring event - @access Private */
router.post('/events/:id/instances', eventsController.getEventInstances);

// ========== MEALS ROUTES ==========

/** @route GET /api/meals - @desc Get all meals (supports filters: startDate, endDate) - @access Private */
router.get('/meals', mealsController.getMeals);

/** @route POST /api/meals - @desc Log a new meal - @access Private */
router.post('/meals', mealsController.addMeal);

/** @route GET /api/meals/daily-summary - @desc Get daily meal summary (calories, macros) - @access Private */
router.get('/meals/daily-summary', mealsController.getDailySummary);

/** @route GET /api/meals/compliance - @desc Get meal plan compliance statistics - @access Private */
router.get('/meals/compliance', mealsController.getCompliance);

/** @route GET /api/meals/:id - @desc Get a specific meal by ID - @access Private */
router.get('/meals/:id', mealsController.getMeal);

/** @route PUT /api/meals/:id - @desc Update a meal entry - @access Private */
router.put('/meals/:id', mealsController.updateMeal);

/** @route DELETE /api/meals/:id - @desc Delete a meal entry - @access Private */
router.delete('/meals/:id', mealsController.deleteMeal);

// ========== VITALS ROUTES ==========

/** @route GET /api/vitals - @desc Get all vital sign records - @access Private */
router.get('/vitals', vitalsController.getVitals);

/** @route POST /api/vitals - @desc Record new vital signs (BP, HR, weight, O2, temp) - @access Private */
router.post('/vitals', vitalsController.addVital);

/** @route GET /api/vitals/latest - @desc Get most recent vital signs - @access Private */
router.get('/vitals/latest', vitalsController.getLatestVital);

/** @route GET /api/vitals/trends - @desc Get vital signs trends over time - @access Private */
router.get('/vitals/trends', vitalsController.getTrends);

/** @route GET /api/vitals/:id - @desc Get a specific vital sign record by ID - @access Private */
router.get('/vitals/:id', vitalsController.getVital);

/** @route PUT /api/vitals/:id - @desc Update a vital sign record - @access Private */
router.put('/vitals/:id', vitalsController.updateVital);

/** @route DELETE /api/vitals/:id - @desc Delete a vital sign record - @access Private */
router.delete('/vitals/:id', vitalsController.deleteVital);

// ========== MEDICATIONS ROUTES ==========

/** @route GET /api/medications - @desc Get all medications for the patient - @access Private */
router.get('/medications', medicationsController.getMedications);

/** @route POST /api/medications - @desc Add a new medication to the patient's regimen - @access Private */
router.post('/medications', medicationsController.addMedication);

/** @route GET /api/medications/schedule - @desc Get medication schedule/calendar - @access Private */
router.get('/medications/schedule', medicationsController.getSchedule);

/** @route GET /api/medications/logs - @desc Get medication dose logs (adherence tracking) - @access Private */
router.get('/medications/logs', medicationsController.getMedicationLogs);

/** @route GET /api/medications/:id - @desc Get a specific medication by ID - @access Private */
router.get('/medications/:id', medicationsController.getMedication);

/** @route PUT /api/medications/:id - @desc Update medication details - @access Private */
router.put('/medications/:id', medicationsController.updateMedication);

/** @route DELETE /api/medications/:id - @desc Delete a medication - @access Private */
router.delete('/medications/:id', medicationsController.deleteMedication);

/** @route PATCH /api/medications/:id/toggle-active - @desc Toggle medication active/inactive status - @access Private */
router.patch('/medications/:id/toggle-active', medicationsController.toggleActive);

/** @route POST /api/medications/:id/log-dose - @desc Log that a medication dose was taken - @access Private */
router.post('/medications/:id/log-dose', medicationsController.logDose);

/** @route PUT /api/medications/logs/:logId - @desc Update a medication dose log - @access Private */
router.put('/medications/logs/:logId', medicationsController.updateMedicationLog);

// ========== THERAPY GOALS ROUTES ==========

/** @route GET /api/therapy-goals - @desc Get all therapy goals for the patient - @access Private */
router.get('/therapy-goals', therapyGoalsController.getTherapyGoals);

/** @route POST /api/therapy-goals - @desc Create a new therapy goal - @access Private */
router.post('/therapy-goals', therapyGoalsController.createTherapyGoal);

/** @route GET /api/therapy-goals/:id - @desc Get a specific therapy goal by ID - @access Private */
router.get('/therapy-goals/:id', therapyGoalsController.getTherapyGoal);

/** @route PUT /api/therapy-goals/:id - @desc Update a therapy goal - @access Private */
router.put('/therapy-goals/:id', therapyGoalsController.updateTherapyGoal);

/** @route DELETE /api/therapy-goals/:id - @desc Delete a therapy goal - @access Private */
router.delete('/therapy-goals/:id', therapyGoalsController.deleteTherapyGoal);

/** @route PUT /api/therapy-goals/:id/progress - @desc Update goal progress percentage - @access Private */
router.put('/therapy-goals/:id/progress', therapyGoalsController.updateGoalProgress);
/** @route GET /api/goal-templates - @desc Get all goal templates - @access Private */
router.get('/goal-templates', goalTemplatesController.getGoalTemplates);

/** @route GET /api/goal-templates/:id - @desc Get a specific goal template - @access Private */
router.get('/goal-templates/:id', goalTemplatesController.getGoalTemplateById);

/** @route POST /api/goal-templates - @desc Create a new goal template - @access Private */
router.post('/goal-templates', goalTemplatesController.createGoalTemplate);

/** @route PUT /api/goal-templates/:id - @desc Update a goal template - @access Private */
router.put('/goal-templates/:id', goalTemplatesController.updateGoalTemplate);

/** @route DELETE /api/goal-templates/:id - @desc Delete (deactivate) a goal template - @access Private */
router.delete('/goal-templates/:id', goalTemplatesController.deleteGoalTemplate);
router.put('/therapy-goals/:id/progress', therapyGoalsController.updateGoalProgress);

// ========== ALERTS ROUTES ==========

/** @route GET /api/alerts - @desc Get all alerts (vitals warnings, medication reminders, etc.) - @access Private */
router.get('/alerts', alertsController.getAlerts);

/** @route POST /api/alerts - @desc Create a new alert - @access Private */
router.post('/alerts', alertsController.createAlert);

/** @route GET /api/alerts/stats - @desc Get alert statistics (count by type, severity) - @access Private */
router.get('/alerts/stats', alertsController.getAlertStats);

/** @route GET /api/alerts/:id - @desc Get a specific alert by ID - @access Private */
router.get('/alerts/:id', alertsController.getAlert);

/** @route PUT /api/alerts/:id - @desc Update an alert - @access Private */
router.put('/alerts/:id', alertsController.updateAlert);

/** @route DELETE /api/alerts/:id - @desc Delete an alert - @access Private */
router.delete('/alerts/:id', alertsController.deleteAlert);

/** @route PUT /api/alerts/:id/resolve - @desc Mark an alert as resolved - @access Private */
router.put('/alerts/:id/resolve', alertsController.resolveAlert);

/** @route PUT /api/alerts/:id/unresolve - @desc Mark an alert as unresolved - @access Private */
router.put('/alerts/:id/unresolve', alertsController.unresolveAlert);

/** @route PUT /api/alerts/:id/mark-notified - @desc Mark that user was notified about alert - @access Private */
router.put('/alerts/:id/mark-notified', alertsController.markNotified);

// ========== FOOD CATEGORIES ROUTES ==========

/** @route GET /api/food-categories - @desc Get all food categories - @access Private */
router.get('/food-categories', foodCategoriesController.getFoodCategories);

/** @route POST /api/food-categories - @desc Create a new food category - @access Private */
router.post('/food-categories', foodCategoriesController.createFoodCategory);

/** @route GET /api/food-categories/:id - @desc Get a specific food category by ID - @access Private */
router.get('/food-categories/:id', foodCategoriesController.getFoodCategoryById);

/** @route PUT /api/food-categories/:id - @desc Update a food category - @access Private */
router.put('/food-categories/:id', foodCategoriesController.updateFoodCategory);

/** @route DELETE /api/food-categories/:id - @desc Delete a food category - @access Private */
router.delete('/food-categories/:id', foodCategoriesController.deleteFoodCategory);

// ========== FOOD ITEMS ROUTES ==========

/** @route GET /api/food-items - @desc Get all food items - @access Private */
router.get('/food-items', foodItemsController.getFoodItems);

/** @route POST /api/food-items - @desc Create a new food item - @access Private */
router.post('/food-items', foodItemsController.createFoodItem);

/** @route GET /api/food-items/search - @desc Search food items by name - @access Private */
router.get('/food-items/search', foodItemsController.searchFoodItems);

/** @route GET /api/food-items/stats - @desc Get food item statistics - @access Private */
router.get('/food-items/stats', foodItemsController.getFoodStats);

/** @route GET /api/food-items/category/:categoryId - @desc Get food items by category - @access Private */
router.get('/food-items/category/:categoryId', foodItemsController.getFoodItemsByCategory);

/** @route GET /api/food-items/rating/:rating - @desc Get food items by health rating - @access Private */
router.get('/food-items/rating/:rating', foodItemsController.getFoodItemsByHealthRating);

/** @route GET /api/food-items/:id - @desc Get a specific food item by ID - @access Private */
router.get('/food-items/:id', foodItemsController.getFoodItemById);

/** @route PUT /api/food-items/:id - @desc Update a food item - @access Private */
router.put('/food-items/:id', foodItemsController.updateFoodItem);

/** @route DELETE /api/food-items/:id - @desc Delete a food item - @access Private */
router.delete('/food-items/:id', foodItemsController.deleteFoodItem);

// ========== PATIENTS ROUTES ==========

/** @route GET /api/patients - @desc Get all patients (therapist only) - @access Private (Therapist) */
router.get('/patients', patientsController.getPatients);

/** @route POST /api/patients - @desc Add a new patient (therapist only) - @access Private (Therapist) */
router.post('/patients', patientsController.addPatient);

/** @route GET /api/patients/:id - @desc Get a specific patient's full profile - @access Private */
router.get('/patients/:id', patientsController.getPatient);

/** @route PUT /api/patients/:id - @desc Update patient information - @access Private */
router.put('/patients/:id', patientsController.updatePatient);

/** @route DELETE /api/patients/:id - @desc Delete a patient - @access Private (Therapist) */
router.delete('/patients/:id', patientsController.deletePatient);

/** @route PATCH /api/patients/:id/toggle-active - @desc Toggle patient active/inactive status - @access Private */
router.patch('/patients/:id/toggle-active', patientsController.toggleActive);

/** @route GET /api/patients/:id/post-op-week - @desc Get current post-op week number - @access Private */
router.get('/patients/:id/post-op-week', patientsController.getPostOpWeek);

/** @route GET /api/patients/:id/metrics - @desc Get patient health metrics and trends - @access Private */
router.get('/patients/:id/metrics', patientsController.getPatientMetrics);

// ========== PROVIDERS ROUTES ==========

/** @route GET /api/providers - @desc Get all healthcare providers for the patient - @access Private */
router.get('/providers', providersController.getProviders);

/** @route POST /api/providers - @desc Add a new healthcare provider - @access Private */
router.post('/providers', providersController.addProvider);

/** @route GET /api/providers/upcoming - @desc Get upcoming provider appointments - @access Private */
router.get('/providers/upcoming', providersController.getUpcomingAppointments);

/** @route GET /api/providers/:id - @desc Get a specific provider by ID - @access Private */
router.get('/providers/:id', providersController.getProvider);

/** @route PUT /api/providers/:id - @desc Update provider information - @access Private */
router.put('/providers/:id', providersController.updateProvider);

/** @route DELETE /api/providers/:id - @desc Delete a provider - @access Private */
router.delete('/providers/:id', providersController.deleteProvider);

// ========== EXERCISES ROUTES ==========

/** @route GET /api/exercises - @desc Get all exercise definitions - @access Private */
router.get('/exercises', exercisesController.getExercises);

/** @route POST /api/exercises - @desc Create a new exercise definition - @access Private */
router.post('/exercises', exercisesController.createExercise);

/** @route GET /api/exercises/categories/list - @desc Get list of exercise categories - @access Private */
router.get('/exercises/categories/list', exercisesController.getCategories);

/** @route GET /api/exercises/stats - @desc Get exercise statistics - @access Private */
router.get('/exercises/stats', exercisesController.getExerciseStats);

/** @route GET /api/exercises/:id - @desc Get a specific exercise by ID - @access Private */
router.get('/exercises/:id', exercisesController.getExercise);

/** @route PUT /api/exercises/:id - @desc Update an exercise definition - @access Private */
router.put('/exercises/:id', exercisesController.updateExercise);

/** @route DELETE /api/exercises/:id - @desc Delete an exercise - @access Private */
router.delete('/exercises/:id', exercisesController.deleteExercise);

/** @route PATCH /api/exercises/:id/toggle-active - @desc Toggle exercise active/inactive status - @access Private */
router.patch('/exercises/:id/toggle-active', exercisesController.toggleActive);

// ========== EXERCISE PRESCRIPTIONS ROUTES ==========

/** @route GET /api/exercise-prescriptions - @desc Get all exercise prescriptions - @access Private */
router.get('/exercise-prescriptions', exercisePrescriptionsController.getPrescriptions);

/** @route POST /api/exercise-prescriptions - @desc Create a new exercise prescription - @access Private */
router.post('/exercise-prescriptions', exercisePrescriptionsController.createPrescription);

/** @route GET /api/exercise-prescriptions/stats - @desc Get prescription statistics - @access Private */
router.get('/exercise-prescriptions/stats', exercisePrescriptionsController.getPrescriptionStats);

/** @route GET /api/exercise-prescriptions/patient/:patientId - @desc Get all prescriptions for a patient - @access Private */
router.get('/exercise-prescriptions/patient/:patientId', exercisePrescriptionsController.getPatientPrescriptions);

/** @route GET /api/exercise-prescriptions/:id - @desc Get a specific prescription by ID - @access Private */
router.get('/exercise-prescriptions/:id', exercisePrescriptionsController.getPrescription);

/** @route PUT /api/exercise-prescriptions/:id - @desc Update an exercise prescription - @access Private */
router.put('/exercise-prescriptions/:id', exercisePrescriptionsController.updatePrescription);

/** @route DELETE /api/exercise-prescriptions/:id - @desc Delete an exercise prescription - @access Private */
router.delete('/exercise-prescriptions/:id', exercisePrescriptionsController.deletePrescription);

/** @route PATCH /api/exercise-prescriptions/:id/status - @desc Update prescription status - @access Private */
router.patch('/exercise-prescriptions/:id/status', exercisePrescriptionsController.updatePrescriptionStatus);

/** @route GET /api/exercise-prescriptions/:id/logs - @desc Get completion logs for a prescription - @access Private */
router.get('/exercise-prescriptions/:id/logs', exercisePrescriptionsController.getPrescriptionLogs);

// ========== EVENT TEMPLATES ROUTES ==========

/** @route GET /api/event-templates - @desc Get all event templates - @access Private */
router.get('/event-templates', eventTemplatesController.getEventTemplates);

/** @route POST /api/event-templates - @desc Create a new event template - @access Private */
router.post('/event-templates', eventTemplatesController.createEventTemplate);

/** @route GET /api/event-templates/categories/list - @desc Get list of template categories - @access Private */
router.get('/event-templates/categories/list', eventTemplatesController.getCategories);

/** @route GET /api/event-templates/stats - @desc Get event template statistics - @access Private */
router.get('/event-templates/stats', eventTemplatesController.getEventTemplateStats);

/** @route GET /api/event-templates/:id - @desc Get a specific event template by ID - @access Private */
router.get('/event-templates/:id', eventTemplatesController.getEventTemplate);

/** @route PUT /api/event-templates/:id - @desc Update an event template - @access Private */
router.put('/event-templates/:id', eventTemplatesController.updateEventTemplate);

/** @route DELETE /api/event-templates/:id - @desc Delete an event template - @access Private */
router.delete('/event-templates/:id', eventTemplatesController.deleteEventTemplate);

/** @route PATCH /api/event-templates/:id/toggle-active - @desc Toggle template active/inactive - @access Private */
router.patch('/event-templates/:id/toggle-active', eventTemplatesController.toggleActive);

// ========== SLEEP LOGS ROUTES ==========

/** @route GET /api/sleep-logs - @desc Get all sleep logs - @access Private */
router.get('/sleep-logs', sleepLogsController.getSleepLogs);

/** @route POST /api/sleep-logs - @desc Log sleep data (hours, quality, interruptions) - @access Private */
router.post('/sleep-logs', sleepLogsController.addSleepLog);

/** @route GET /api/sleep-logs/stats - @desc Get sleep statistics (avg hours, quality trends) - @access Private */
router.get('/sleep-logs/stats', sleepLogsController.getSleepStats);

/** @route GET /api/sleep-logs/date/:date - @desc Get sleep log for a specific date - @access Private */
router.get('/sleep-logs/date/:date', sleepLogsController.getSleepLogByDate);

/** @route GET /api/sleep-logs/:id - @desc Get a specific sleep log by ID - @access Private */
router.get('/sleep-logs/:id', sleepLogsController.getSleepLog);

/** @route PUT /api/sleep-logs/:id - @desc Update a sleep log - @access Private */
router.put('/sleep-logs/:id', sleepLogsController.updateSleepLog);

/** @route DELETE /api/sleep-logs/:id - @desc Delete a sleep log - @access Private */
router.delete('/sleep-logs/:id', sleepLogsController.deleteSleepLog);

// ========== EXERCISE LOGS ROUTES ==========

/** @route GET /api/exercise-logs - @desc Get all exercise logs - @access Private */
router.get('/exercise-logs', exerciseLogsController.getExerciseLogs);

/** @route POST /api/exercise-logs - @desc Log an exercise session (duration, intensity, HR) - @access Private */
router.post('/exercise-logs', exerciseLogsController.createExerciseLog);

/** @route GET /api/exercise-logs/stats - @desc Get exercise log statistics - @access Private */
router.get('/exercise-logs/stats', exerciseLogsController.getExerciseLogStats);

/** @route GET /api/exercise-logs/:id - @desc Get a specific exercise log by ID - @access Private */
router.get('/exercise-logs/:id', exerciseLogsController.getExerciseLog);

/** @route PUT /api/exercise-logs/:id - @desc Update an exercise log - @access Private */
router.put('/exercise-logs/:id', exerciseLogsController.updateExerciseLog);

/** @route DELETE /api/exercise-logs/:id - @desc Delete an exercise log - @access Private */
router.delete('/exercise-logs/:id', exerciseLogsController.deleteExerciseLog);

// ========== CALORIES / ENERGY BALANCE ROUTES ==========

/** @route GET /api/calories/summary - @desc Get calorie summary (intake vs. burned) - @access Private */
router.get('/calories/summary', caloriesController.getCalorieSummary);

/** @route GET /api/calories/daily - @desc Get daily calorie data - @access Private */
router.get('/calories/daily', caloriesController.getDailyCalories);

/** @route GET /api/calories/weight-correlation - @desc Get calorie intake vs. weight correlation - @access Private */
router.get('/calories/weight-correlation', caloriesController.getWeightCorrelation);

// ========== HYDRATION LOGS ROUTES ==========

/** @route GET /api/hydration-logs - @desc Get all hydration logs - @access Private */
router.get('/hydration-logs', hydrationLogsController.getHydrationLogs);

/** @route POST /api/hydration-logs - @desc Log water intake - @access Private */
router.post('/hydration-logs', hydrationLogsController.createHydrationLog);

/** @route GET /api/hydration-logs/stats - @desc Get hydration statistics (daily avg, trends) - @access Private */
router.get('/hydration-logs/stats', hydrationLogsController.getHydrationStats);

/** @route GET /api/hydration-logs/date/:date - @desc Get hydration log for a specific date - @access Private */
router.get('/hydration-logs/date/:date', hydrationLogsController.getHydrationLogByDate);

/** @route GET /api/hydration-logs/:id - @desc Get a specific hydration log by ID - @access Private */
router.get('/hydration-logs/:id', hydrationLogsController.getHydrationLog);

/** @route PUT /api/hydration-logs/:id - @desc Update a hydration log - @access Private */
router.put('/hydration-logs/:id', hydrationLogsController.updateHydrationLog);

/** @route DELETE /api/hydration-logs/:id - @desc Delete a hydration log - @access Private */
router.delete('/hydration-logs/:id', hydrationLogsController.deleteHydrationLog);

// ========== DAILY SCORES ROUTES ==========

/** @route GET /api/daily-scores - @desc Get all daily health scores - @access Private */
router.get('/daily-scores', dailyScoresController.getDailyScores);

/** @route POST /api/daily-scores - @desc Create or update daily health score - @access Private */
router.post('/daily-scores', dailyScoresController.createOrUpdateDailyScore);

/** @route GET /api/daily-scores/stats - @desc Get daily score statistics - @access Private */
router.get('/daily-scores/stats', dailyScoresController.getDailyScoreStats);

/** @route GET /api/daily-scores/trends - @desc Get daily score trends over time - @access Private */
router.get('/daily-scores/trends', dailyScoresController.getTrends);

/** @route GET /api/daily-scores/date/:date - @desc Get daily score for a specific date - @access Private */
router.get('/daily-scores/date/:date', dailyScoresController.getDailyScoreByDate);

/** @route GET /api/daily-scores/:id - @desc Get a specific daily score by ID - @access Private */
router.get('/daily-scores/:id', dailyScoresController.getDailyScore);

/** @route DELETE /api/daily-scores/:id - @desc Delete a daily score - @access Private */
router.delete('/daily-scores/:id', dailyScoresController.deleteDailyScore);

// ========== UPLOAD ROUTES ==========

/**
 * @route   /api/upload/*
 * @desc    File upload endpoints (profile pictures, documents)
 * @access  Private
 * @see     ./upload.ts for detailed routes
 */
router.use('/upload', uploadRoutes);

// ========== DEVICE INTEGRATION ROUTES ==========

/**
 * @route   /api/devices/*
 * @desc    Device connection status and management
 * @access  Private
 * @see     ./devices.ts for detailed routes
 */
router.use('/devices', devicesRoutes);

/**
 * @route   /api/strava/*
 * @desc    Strava API integration for heart rate and exercise data sync
 * @access  Mixed (OAuth callback is public, others are private)
 * @see     ./strava.ts for detailed routes
 * @note    CRITICAL for patient heart rate monitoring
 */
router.use('/strava', stravaRoutes);

// router.use('/polar', polarRoutes);  // Keep disabled for now
// router.use('/samsung', samsungRoutes);  // Keep disabled for now

export default router;
