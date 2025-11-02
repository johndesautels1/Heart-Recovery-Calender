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
  userId: number;  // User who created the event
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
  carbs?: number;  // Alias for carbohydrates
  withinSpec: boolean;
  heartHealthRating?: 'red' | 'yellow' | 'green';  // Heart health rating for the meal
  notes?: string;
  satisfactionRating?: number; // NEW: 1-5 scale for how satisfying the meal was
  postSurgeryDay?: number;  // Days since surgery
  createdAt: string;
  updatedAt: string;
}

export interface VitalsSample {
  id: number;
  userId: number;
  timestamp: string;
  recordedAt?: string;  // Alias for timestamp (some API responses use this)
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
  postSurgeryDay?: number;  // Days since surgery
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
  refillDate?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  timeOfDay?: string;
  instructions?: string;
  sideEffects?: string;
  isActive: boolean;
  reminderEnabled: boolean;
  isOTC?: boolean;  // Over-the-counter flag
  effectiveness?: number;  // 1-10 rating for how effective the medication is
  monthlyCost?: number;  // Monthly cost for cost tracking
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
  userId: number;  // Link to patient's user account (required)
  
  // Name fields
  name: string;
  firstName?: string;
  lastName?: string;
  
  // Demographics
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  
  // Primary Contact
  email?: string;
  phone?: string;  // Legacy field
  primaryPhone?: string;
  primaryPhoneType?: 'mobile' | 'home' | 'work';
  alternatePhone?: string;
  preferredContactMethod?: 'phone' | 'email' | 'text';
  bestTimeToContact?: 'morning' | 'afternoon' | 'evening';
  
  // Mailing Address
  address?: string;  // Legacy field
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  
  // Emergency Contact #1
  emergencyContact1Name?: string;
  emergencyContact1Relationship?: string;
  emergencyContact1Phone?: string;
  emergencyContact1AlternatePhone?: string;
  emergencyContact1Email?: string;
  emergencyContact1SameAddress?: boolean;
  
  // Emergency Contact #2
  emergencyContact2Name?: string;
  emergencyContact2Relationship?: string;
  emergencyContact2Phone?: string;
  emergencyContact2AlternatePhone?: string;
  emergencyContact2Email?: string;
  emergencyContact2SameAddress?: boolean;
  
  // Physical Measurements
  height?: number;
  heightUnit?: 'in' | 'cm';
  startingWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  weightUnit?: 'kg' | 'lbs';
  race?: string;
  nationality?: string;
  
  // Prior Surgical Procedures
  priorSurgicalProcedures?: string[];
  devicesImplanted?: string[];
  priorSurgeryNotes?: string;
  hospitalName?: string;
  surgeonName?: string;
  surgeryDate?: string;
  dischargeDate?: string;
  dischargeInstructions?: string;
  
  // Medical History
  priorHealthConditions?: string[];
  currentConditions?: string[];
  nonCardiacMedications?: string;
  allergies?: string;
  
  // Heart Condition
  diagnosisDate?: string;
  heartConditions?: string[];
  currentTreatmentProtocol?: string[];
  recommendedTreatments?: string[];
  
  // Cardiac Vitals
  restingHeartRate?: number;
  maxHeartRate?: number;
  targetHeartRateMin?: number;
  targetHeartRateMax?: number;
  baselineBpSystolic?: number;
  baselineBpDiastolic?: number;
  ejectionFraction?: number;
  cardiacDiagnosis?: string[];
  medicationsAffectingHR?: string[];
  activityRestrictions?: string;
  
  // Device Integration
  polarDeviceId?: string;
  samsungHealthAccount?: string;
  preferredDataSource?: 'polar' | 'samsung' | 'manual';
  
  // Other
  zoomHandle?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProviderType = 'cardiothoracic_surgeon' | 'cardiologist' | 'electrophysiologist' | 'general_practitioner' | 'physical_therapist' | 'pharmacy' | 'hospital' | 'other';
export type PreferredContactMethod = 'phone' | 'email' | 'portal' | 'any';

export interface Provider {
  id: number;
  userId: number;
  name: string;
  specialty?: string;
  providerType?: ProviderType;
  phone?: string;
  email?: string;
  address?: string;
  nextAppointment?: string;
  notes?: string;
  isPrimary: boolean;
  officeHours?: string;
  faxNumber?: string;
  patientPortalUrl?: string;
  preferredContactMethod?: PreferredContactMethod;
  acceptedInsurance?: string;
  lastVisitDate?: string;
  isEmergencyContact: boolean;
  pharmacyLicenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  sentAt?: string;
  readAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SendTestNotificationInput {
  type?: NotificationType;
}

export interface CreateProviderInput {
  name: string;
  specialty?: string;
  providerType?: ProviderType;
  phone?: string;
  email?: string;
  address?: string;
  nextAppointment?: string;
  notes?: string;
  isPrimary?: boolean;
  officeHours?: string;
  faxNumber?: string;
  patientPortalUrl?: string;
  preferredContactMethod?: PreferredContactMethod;
  acceptedInsurance?: string;
  lastVisitDate?: string;
  isEmergencyContact?: boolean;
  pharmacyLicenseNumber?: string;
}

// Provider type labels and utilities
export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  cardiothoracic_surgeon: 'Cardiothoracic Surgeon',
  cardiologist: 'Cardiologist',
  electrophysiologist: 'Electrophysiologist',
  general_practitioner: 'General Practitioner',
  physical_therapist: 'Physical Therapist',
  pharmacy: 'Pharmacy',
  hospital: 'Hospital',
  other: 'Other',
} as const;

export const CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  phone: 'Phone',
  email: 'Email',
  portal: 'Patient Portal',
  any: 'Any Method',
} as const;

export const PROVIDER_TYPE_ICONS: Record<ProviderType, string> = {
  cardiothoracic_surgeon: '🫀',
  cardiologist: '❤️',
  electrophysiologist: '⚡',
  general_practitioner: '🩺',
  physical_therapist: '🏃',
  pharmacy: '💊',
  hospital: '🏥',
  other: '👨‍⚕️',
} as const;

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
  postSurgeryDay?: number;  // Days since surgery
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

// ==================== EXERCISE PRESCRIPTIONS ====================
export type ExercisePrescriptionStatus = 'active' | 'completed' | 'discontinued';

export interface ExercisePrescription {
  id: number;
  patientId: number;
  exerciseId: number;
  prescribedBy: number; // therapist user ID
  startDate: string;
  endDate?: string;
  sets?: number;
  reps?: number;
  duration?: number; // in minutes
  frequency: string; // e.g., "daily", "3x/week", "Mon/Wed/Fri"
  notes?: string;
  status: ExercisePrescriptionStatus;
  createdAt: string;
  updatedAt: string;
}

// ==================== ACTIVITIES ====================
export type ActivityType = 'adl' | 'mobility' | 'recreational' | 'social' | 'exercise';
export type ActivityStatus = 'accomplished' | 'caution' | 'not_to_do' | 'issue';

export interface Activity {
  id: number;
  userId: number;
  activityType: ActivityType;
  activityName: string;
  activityCategory?: string;
  activityDate: string;
  activityTime?: string;
  status: ActivityStatus;
  duration?: number;
  notes?: string;
  symptoms?: string[];
  heartRate?: number;
  bloodPressure?: string;
  painLevel?: number;
  fatigueLevel?: number;
  assistanceRequired: boolean;
  milestone: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== ALERTS ====================
export type AlertType = 'medication_missed' | 'activity_issue' | 'vital_concern' | 'goal_overdue' | 'routine_skipped' | 'other';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: number;
  userId: number;
  therapistId?: number;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionTaken?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: number;
  notificationSent: boolean;
  notificationMethods?: string[];
  createdAt: string;
  updatedAt: string;
}

// ==================== THERAPY GOALS ====================
export type TherapyGoalType = 'exercise' | 'activity' | 'mobility' | 'medication_adherence' | 'diet' | 'vitals' | 'other';
export type TherapyGoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'modified' | 'abandoned';
export type TherapyGoalPriority = 'low' | 'medium' | 'high';

export interface TherapyGoal {
  id: number;
  userId: number;
  therapistId: number;
  goalTitle: string;
  goalDescription: string;
  goalType: TherapyGoalType;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  targetDate?: string;
  status: TherapyGoalStatus;
  progressPercentage: number;
  milestones?: any;
  notes?: string;
  achievedAt?: string;
  priority: TherapyGoalPriority;
  recurring: boolean;
  frequency?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== PHYSICAL THERAPY PHASES ====================
export type TherapyIntensityLevel = 'very_light' | 'light' | 'moderate' | 'vigorous';

export interface PhysicalTherapyPhase {
  id: number;
  phaseNumber: number;
  phaseName: string;
  weekStart: number;
  weekEnd: number;
  description: string;
  focusAreas: string[];
  restrictions: string[];
  exerciseLibrary: any;
  targetHeartRate?: string;
  intensityLevel: TherapyIntensityLevel;
  createdAt: string;
  updatedAt: string;
}

// ==================== THERAPY ROUTINES ====================
export type TherapyRoutineStatus = 'scheduled' | 'completed' | 'skipped' | 'issue';

export interface TherapyRoutine {
  id: number;
  userId: number;
  therapistId: number;
  phaseId: number;
  routineName: string;
  exercises: any;
  scheduledDate: string;
  scheduledTime?: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  status: TherapyRoutineStatus;
  completionNotes?: string;
  painLevel?: number;
  fatigueLevel?: number;
  heartRateData?: any;
  createdAt: string;
  updatedAt: string;
}

// ==================== CALORIES / ENERGY BALANCE ====================
export interface CalorieSummary {
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  status: 'deficit' | 'neutral' | 'surplus';
}

export interface DailyCalories {
  date: string;
  consumed: number;
  burned: number;
  net: number;
}

export interface WeightCorrelation {
  currentWeight?: number;
  targetWeight?: number;
  startingWeight?: number;
  weightUnit: string;
  surgeryDate?: string;
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

// ==================== DEVICE CONNECTIONS ====================
export interface DeviceConnection {
  id: number;
  userId: number;
  deviceType: 'polar' | 'samsung_health' | 'health_connect' | 'strava';
  deviceName: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  polarUserId?: number;
  samsungUserId?: string;
  stravaAthleteId?: string;
  lastSyncedAt?: string;
  syncStatus: 'active' | 'error' | 'disconnected';
  syncError?: string;
  autoSync: boolean;
  syncExercises: boolean;
  syncHeartRate: boolean;
  syncSteps: boolean;
  syncCalories: boolean;
  webhookSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSyncLog {
  id: number;
  deviceConnectionId: number;
  syncType: 'manual' | 'scheduled' | 'webhook';
  dataType: 'all' | 'exercise' | 'heart_rate' | 'steps' | 'calories' | 'sleep';
  status: 'pending' | 'in_progress' | 'success' | 'error';
  startedAt: string;
  completedAt?: string;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsSkipped?: number;
  errorMessage?: string;
  errorDetails?: string;
  externalIds?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeviceSettingsInput {
  autoSync?: boolean;
  syncExercises?: boolean;
  syncHeartRate?: boolean;
  syncSteps?: boolean;
  syncCalories?: boolean;
}

export interface TriggerSyncInput {
  dataType?: 'all' | 'exercise' | 'heart_rate' | 'steps' | 'calories' | 'sleep';
}
