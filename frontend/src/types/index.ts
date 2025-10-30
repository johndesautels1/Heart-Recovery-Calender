export interface User {
  id: number;
  email: string;
  name: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  profilePhoto?: string;
  timezone: string;
  role?: 'patient' | 'therapist' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Calendar {
  id: number;
  userId: number;
  name: string;
  type: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'general';
  color?: string;
  isSharedWithDoctor: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  calendarId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  recurrenceRule?: string;
  reminderMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
  sleepHours?: number;
  exerciseId?: number;
  performanceScore?: number;
  exerciseIntensity?: number; // 1-10 scale
  distanceMiles?: number;
  laps?: number;
  steps?: number;
  elevationFeet?: number;
  durationMinutes?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  caloriesBurned?: number;
  exerciseNotes?: string;
  createdAt: string;
  updatedAt: string;
  calendar?: Calendar;  // Optional joined data
}

export interface MealEntry {
  id: number;
  userId: number;
  timestamp: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems: string;
  calories?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  totalFat?: number;
  fiber?: number;
  sugar?: number;
  protein?: number;
  carbohydrates?: number;
  withinSpec: boolean;
  notes?: string;
  satisfactionRating?: number; // NEW: 1-5 scale for how satisfying the meal was
  createdAt: string;
  updatedAt: string;
}

export interface VitalsSample {
  id: number;
  userId: number;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  heartRateVariability?: number;  // API returns this name
  weight?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  hydrationStatus?: number;
  cholesterolTotal?: number;      // API returns this name
  cholesterolLDL?: number;        // API returns this name
  cholesterolHDL?: number;        // API returns this name
  triglycerides?: number;
  respiratoryRate?: number;
  notes?: string;
  symptoms?: string;
  medicationsTaken: boolean;
  source: 'manual' | 'device' | 'import';
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: number;
  userId: number;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  timeOfDay?: string;
  instructions?: string;
  sideEffects?: string;
  isActive: boolean;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper types
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Form types for creating/updating entities
export interface CreateCalendarInput {
  name: string;
  type: Calendar['type'];
  color?: string;
  description?: string;
  isSharedWithDoctor?: boolean;
}

export interface CreateEventInput {
  calendarId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  location?: string;
  recurrenceRule?: string;
  reminderMinutes?: number;
  notes?: string;
  sleepHours?: number;
}

export interface CreateMealInput {
  timestamp?: string;
  mealType: MealEntry['mealType'];
  foodItems: string;
  calories?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  totalFat?: number;
  fiber?: number;
  sugar?: number;
  protein?: number;
  carbohydrates?: number;
  notes?: string;
}

export interface CreateVitalsInput {
  timestamp?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  heartRateVariability?: number;
  weight?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  hydrationStatus?: number;
  cholesterolTotal?: number;
  cholesterolLDL?: number;
  cholesterolHDL?: number;
  triglycerides?: number;
  respiratoryRate?: number;
  notes?: string;
  symptoms?: string;
  medicationsTaken?: boolean;
  source?: VitalsSample['source'];
  deviceId?: string;
}

export interface CreateMedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  timeOfDay?: string;
  instructions?: string;
  sideEffects?: string;
  isActive?: boolean;
  reminderEnabled?: boolean;
}

// Dietary compliance limits
export const DIETARY_LIMITS = {
  calories: 2000,
  sodium: 2300,
  cholesterol: 300,
  saturatedFat: 20,
} as const;

// Calendar type colors
export const CALENDAR_COLORS = {
  medications: '#9c27b0',
  appointments: '#2196f3',
  exercise: '#4caf50',
  vitals: '#f44336',
  diet: '#ff9800',
  general: '#607d8b',
} as const;

// Food database types
export interface FoodCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  foodItems?: FoodItem[];
}

export interface FoodItem {
  id: number;
  categoryId: number;
  name: string;
  healthRating: 'green' | 'yellow' | 'red';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  cholesterol?: number;
  sugar?: number;
  servingSize?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  category?: FoodCategory;
}

export interface MealItemEntry {
  id: number;
  mealEntryId: number;
  foodItemId: number;
  portionSize: 'small' | 'medium' | 'large';
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  foodItem?: FoodItem;
}

export interface FoodStats {
  totalItems: number;
  totalCategories: number;
  healthRatingBreakdown: {
    green: number;
    yellow: number;
    red: number;
  };
  itemsByCategory: Array<{
    categoryId: number;
    categoryName: string;
    icon?: string;
    itemCount: number;
  }>;
}

// Patient management (therapist view)
export interface Patient {
  id: number;
  therapistId: number;
  userId?: number;  // Link to patient's user account
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  zoomHandle?: string;
  surgeryDate?: string;
  notes?: string;
  isActive: boolean;
  height?: number;          // Height in inches or cm
  heightUnit?: 'in' | 'cm'; // Unit of measurement
  startingWeight?: number;  // Weight at start of therapy
  currentWeight?: number;   // Most recent weight
  targetWeight?: number;    // Goal weight
  weightUnit?: 'kg' | 'lbs'; // Unit of measurement
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  zoomHandle?: string;
  surgeryDate?: string;
  notes?: string;
  isActive?: boolean;
}

export interface PostOpWeekResponse {
  postOpWeek: number | null;
  daysSinceSurgery: number | null;
  surgeryDate?: string;
  isPreSurgery: boolean;
}

export interface SleepLog {
  id: number;
  userId: number;
  date: string;
  hoursSlept: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
  bedTime?: string;
  wakeTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSleepLogInput {
  date: string;
  hoursSlept: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
  bedTime?: string;
  wakeTime?: string;
}

export interface SleepStats {
  totalLogs: number;
  averageHours: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  startDate?: string;
  endDate?: string;
}

export interface MedicationLog {
  id: number;
  userId: number;
  medicationId: number;
  scheduledTime: string;
  takenTime?: string;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  medication?: Medication;
}

export interface CreateMedicationLogInput {
  medicationId: number;
  scheduledTime: string;
  takenTime?: string;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
  notes?: string;
}

export interface MedicationStats {
  totalLogs: number;
  adherenceRate: number; // 0-100
  statusDistribution: {
    taken: number;
    missed: number;
    skipped: number;
    scheduled: number;
  };
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  startDate?: string;
  endDate?: string;
}

// ==================== EXERCISE LOGS ====================
export interface ExerciseLog {
  id: number;
  prescriptionId: number;
  patientId: number;
  completedAt: string;
  postSurgeryDay?: number;
  startedAt?: string;

  // Pre-exercise vitals
  preBpSystolic?: number;
  preBpDiastolic?: number;
  preHeartRate?: number;
  preOxygenSat?: number;

  // During exercise vitals
  duringHeartRateAvg?: number;
  duringHeartRateMax?: number;
  duringBpSystolic?: number;
  duringBpDiastolic?: number;

  // Post-exercise vitals
  postBpSystolic?: number;
  postBpDiastolic?: number;
  postHeartRate?: number;
  postOxygenSat?: number;

  // Activity metrics
  distanceMiles?: number;
  laps?: number;
  steps?: number;
  elevationFeet?: number;
  caloriesBurned?: number;

  // Subjective
  perceivedExertion?: number; // 1-10 RPE scale
  performanceScore?: number; // 0-4-6-8 scale
  exerciseIntensity?: 'low' | 'moderate' | 'high' | 'very-high';
  durationMinutes?: number;
  notes?: string;

  createdAt: string;
  updatedAt: string;
  exercise?: any; // TODO: Define Exercise type
  user?: User;
}

export interface CreateExerciseLogInput {
  prescriptionId: number;
  patientId?: number;
  completedAt?: string;
  startedAt?: string;

  // Pre-exercise vitals
  preBpSystolic?: number;
  preBpDiastolic?: number;
  preHeartRate?: number;
  preOxygenSat?: number;

  // During exercise vitals
  duringHeartRateAvg?: number;
  duringHeartRateMax?: number;
  duringBpSystolic?: number;
  duringBpDiastolic?: number;

  // Post-exercise vitals
  postBpSystolic?: number;
  postBpDiastolic?: number;
  postHeartRate?: number;
  postOxygenSat?: number;

  // Activity metrics
  distanceMiles?: number;
  laps?: number;
  steps?: number;
  elevationFeet?: number;
  caloriesBurned?: number;

  // Subjective
  perceivedExertion?: number;
  performanceScore?: number;
  exerciseIntensity?: 'low' | 'moderate' | 'high' | 'very-high';
  durationMinutes?: number;
  notes?: string;
}

export interface ExerciseLogStats {
  totalLogs: number;
  avgPerformanceScore: number;
  avgDuration: number;
  totalDistance: number;
  totalCalories: number;
  byExerciseType: any[];
  scoreDistribution: any[];
}

// ==================== HYDRATION LOGS ====================
export interface HydrationLog {
  id: number;
  userId: number;
  date: string;
  totalOunces: number;
  targetOunces?: number;
  postSurgeryDay?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface CreateHydrationLogInput {
  userId?: number;
  date: string;
  totalOunces: number;
  targetOunces?: number;
  notes?: string;
}

export interface HydrationStats {
  totalLogs: number;
  avgDailyIntake: number;
  avgDailyTarget: number;
  daysMetTarget: number;
  complianceRate: number;
  totalOunces: number;
}

// ==================== DAILY SCORES ====================
export interface DailyScore {
  id: number;
  userId: number;
  scoreDate: string;
  postSurgeryDay?: number;

  // Category scores (0-100)
  exerciseScore?: number;
  nutritionScore?: number;
  medicationScore?: number;
  sleepScore?: number;
  vitalsScore?: number;
  hydrationScore?: number;

  // Auto-calculated
  totalDailyScore: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface CreateDailyScoreInput {
  userId?: number;
  scoreDate: string;
  exerciseScore?: number;
  nutritionScore?: number;
  medicationScore?: number;
  sleepScore?: number;
  vitalsScore?: number;
  hydrationScore?: number;
  notes?: string;
}

export interface DailyScoreStats {
  totalDays: number;
  averageScores: {
    exercise: number;
    nutrition: number;
    medication: number;
    sleep: number;
    vitals: number;
    hydration: number;
    total: number;
  };
  scoreDistribution: {
    excellent: number; // >= 80
    good: number; // 60-79
    fair: number; // 40-59
    poor: number; // < 40
  };
}

export interface DailyScoreTrends {
  data: Array<{
    date?: string;
    period?: string;
    exerciseScore?: number;
    nutritionScore?: number;
    medicationScore?: number;
    sleepScore?: number;
    vitalsScore?: number;
    hydrationScore?: number;
    totalDailyScore?: number;
    postSurgeryDay?: number;
    avgExercise?: number;
    avgNutrition?: number;
    avgMedication?: number;
    avgSleep?: number;
    avgVitals?: number;
    avgHydration?: number;
    avgTotal?: number;
    daysLogged?: number;
  }>;
}
