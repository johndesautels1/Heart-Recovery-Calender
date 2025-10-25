// Type definitions for Heart Recovery Calendar

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'requested' | 'to-request' | 'urgent';
  colorTag?: string;
  description?: string;
  location?: string;
  recurrenceRule?: string;
  reminderMinutes?: number;
  notes?: string;
};

export type MealEntry = {
  id: string;
  userId: string;
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
};

export type VitalSign = {
  id: string;
  userId: string;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  heartRateVariability?: number;
  weight?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  respiratoryRate?: number;
  notes?: string;
  symptoms?: string;
  medicationsTaken: boolean;
  source: 'manual' | 'device' | 'import';
};

export type Medication = {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  purpose?: string;
  sideEffects?: string;
  instructions?: string;
  isActive: boolean;
  refillDate?: string;
  remainingRefills?: number;
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  timezone?: string;
};

export type Calendar = {
  id: string;
  userId: string;
  name: string;
  type: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'symptoms' | 'general';
  color: string;
  isSharedWithDoctor: boolean;
  isActive: boolean;
  description?: string;
};

export type ComplianceReport = {
  date: string;
  meals: { compliant: number; total: number; percentage: number };
  medications: { taken: number; scheduled: number; percentage: number };
  exercise: { completed: number; planned: number; minutes: number };
  vitals: {
    bloodPressure: { readings: number; inRange: number };
    heartRate: { readings: number; inRange: number };
  };
  overallScore: number;
};

export type NotificationType =
  | 'medication_reminder'
  | 'vitals_alert'
  | 'appointment_reminder'
  | 'exercise_reminder'
  | 'emergency_alert'
  | 'compliance_report';

export type NotificationPreferences = {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  quietHours: {
    start: string;
    end: string;
  };
  medicationReminders: {
    enabled: boolean;
    advanceMinutes: number;
  };
  emergencyOverrideQuietHours: boolean;
};