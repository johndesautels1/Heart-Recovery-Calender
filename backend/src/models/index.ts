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
import MedicationLog from './MedicationLog';
import Patient from './Patient';
import Exercise from './Exercise';
import ExercisePrescription from './ExercisePrescription';
import ExerciseLog from './ExerciseLog';
import SleepLog from './SleepLog';
import HydrationLog from './HydrationLog';
import DailyScore from './DailyScore';
import EventTemplate from './EventTemplate';
import DeviceConnection from './DeviceConnection';
import DeviceSyncLog from './DeviceSyncLog';

// Create models object
const models = {
  User,
  Calendar,
  CalendarEvent,
  EventTemplate,
  MealEntry,
  VitalsSample,
  Medication,
  MedicationLog,
  TherapyGoal,
  Alert,
  PhysicalTherapyPhase,
  TherapyRoutine,
  Activity,
  FoodCategory,
  FoodItem,
  MealItemEntry,
  Patient,
  Exercise,
  ExercisePrescription,
  ExerciseLog,
  SleepLog,
  HydrationLog,
  DailyScore,
  DeviceConnection,
  DeviceSyncLog,
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
