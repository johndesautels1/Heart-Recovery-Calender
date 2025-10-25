import sequelize from './database';

// Import all models
import User from './User';
import Calendar from './Calendar';
import CalendarEvent from './CalendarEvent';
import MealEntry from './MealEntry';
import VitalsSample from './VitalsSample';
import Medication from './Medication';
import TherapyGoal from './TherapyGoal';
import Alert from './Alert';
import PhysicalTherapyPhase from './PhysicalTherapyPhase';
import TherapyRoutine from './TherapyRoutine';
import Activity from './Activity';
import FoodCategory from './FoodCategory';
import FoodItem from './FoodItem';
import MealItemEntry from './MealItemEntry';

// Create models object
const models = {
  User,
  Calendar,
  CalendarEvent,
  MealEntry,
  VitalsSample,
  Medication,
  TherapyGoal,
  Alert,
  PhysicalTherapyPhase,
  TherapyRoutine,
  Activity,
  FoodCategory,
  FoodItem,
  MealItemEntry,
};

// Call associate methods for all models
console.log('[MODELS] Setting up model associations...');
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    console.log(`[MODELS] Calling associate() for ${model.name}`);
    model.associate(models);
  }
});
console.log('[MODELS] Model associations setup complete');

export default sequelize;
export { models };
