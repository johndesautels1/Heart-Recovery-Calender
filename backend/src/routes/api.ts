import { Router } from 'express';
import * as eventsController from '../controllers/calendarController';
import * as mealsController from '../controllers/mealController';
import * as calendarsController from '../controllers/calendarsController';

const router = Router();

router.get('/events', eventsController.getEvents);
router.post('/events', eventsController.createEvent);

router.get('/meals', mealsController.getMeals);
router.post('/meals', mealsController.addMeal);

router.get('/calendars', calendarsController.getCalendars);
router.post('/calendars', calendarsController.createCalendar);

export default router;