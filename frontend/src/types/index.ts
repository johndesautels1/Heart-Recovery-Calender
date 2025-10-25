export interface User {
  id: number;
  email: string;
  name: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
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
