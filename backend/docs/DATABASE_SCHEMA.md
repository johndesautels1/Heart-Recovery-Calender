# Database Schema Documentation

**Heart Recovery Calendar** - PostgreSQL Database Schema

**Last Updated:** November 1, 2025
**ORM:** Sequelize
**Database:** PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Core User & Authentication](#core-user--authentication)
3. [Patient Management](#patient-management)
4. [Health Tracking](#health-tracking)
5. [Calendar & Events](#calendar--events)
6. [Food & Nutrition](#food--nutrition)
7. [Exercise & Physical Therapy](#exercise--physical-therapy)
8. [Device Integration](#device-integration)
9. [Relationships](#relationships)
10. [Indexes](#indexes)

---

## Overview

The Heart Recovery Calendar database consists of **27 tables** organized into functional domains:

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Authentication** | Users | User accounts and authentication |
| **Patient Management** | Patients, Providers | Patient profiles and healthcare providers |
| **Health Tracking** | VitalsSamples, Medications, MedicationLogs, Alerts | Vital signs, medication tracking, health alerts |
| **Calendar & Scheduling** | Calendars, CalendarEvents, EventTemplates | Calendar management and event scheduling |
| **Food & Nutrition** | FoodCategories, FoodItems, MealEntries, MealItemEntries | Meal logging and nutrition tracking |
| **Exercise & Therapy** | Exercises, ExercisePrescriptions, ExerciseLogs, PhysicalTherapyPhases, TherapyRoutines, Activities | Physical therapy and exercise tracking |
| **Sleep & Wellness** | SleepLogs, HydrationLogs, DailyScores | Sleep quality, hydration, daily health scores |
| **Device Integration** | DeviceConnections, DeviceSyncLogs | Fitness device integration (Strava, Polar, Samsung) |
| **Goals & Monitoring** | TherapyGoals | Patient therapy goals and progress |

---

## Core User & Authentication

### Users Table

**Purpose:** Stores user account information for patients, therapists, and admins.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | AUTO | Primary key |
| `email` | STRING | No | - | Unique email address for login |
| `password` | STRING | Yes | - | Hashed password (bcrypt) |
| `name` | STRING | No | - | User's full name |
| `phoneNumber` | STRING | Yes | - | Primary phone number |
| `emergencyContact` | STRING | Yes | - | Emergency contact name |
| `emergencyPhone` | STRING | Yes | - | Emergency contact phone |
| `doctorName` | STRING | Yes | - | Primary doctor's name |
| `doctorPhone` | STRING | Yes | - | Primary doctor's phone |
| `profilePhoto` | STRING | Yes | - | URL to profile photo |
| `timezone` | STRING | Yes | 'America/New_York' | User's timezone |
| `role` | ENUM | Yes | 'patient' | Role: 'patient', 'therapist', 'admin' |
| `createdAt` | DATE | No | NOW() | Account creation timestamp |
| `updatedAt` | DATE | No | NOW() | Last update timestamp |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE (email)`

**Notes:**
- Password is never returned in JSON responses (excluded via `toJSON()` method)
- OAuth users may not have a password field

---

## Patient Management

### Patients Table

**Purpose:** Detailed patient profiles managed by therapists.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `therapistId` | INTEGER | No | FK to Users (therapist) |
| `userId` | INTEGER | Yes | FK to Users (patient account) |
| `firstName` | STRING | Yes | Patient's first name |
| `lastName` | STRING | Yes | Patient's last name |
| `name` | STRING | No | Full name (backward compatibility) |
| `dateOfBirth` | DATE | Yes | Date of birth |
| `gender` | ENUM | Yes | 'male', 'female', 'other' |
| `age` | INTEGER | Yes | Auto-calculated from DOB |
| `email` | STRING | Yes | Patient email |
| `primaryPhone` | STRING | Yes | Primary contact number |
| `primaryPhoneType` | ENUM | Yes | 'mobile', 'home', 'work' |
| `alternatePhone` | STRING | Yes | Alternate contact number |
| `preferredContactMethod` | ENUM | Yes | 'phone', 'email', 'text' |
| `bestTimeToContact` | ENUM | Yes | 'morning', 'afternoon', 'evening' |
| `streetAddress` | STRING | Yes | Street address |
| `city` | STRING | Yes | City |
| `state` | STRING | Yes | State/Province |
| `postalCode` | STRING | Yes | ZIP/Postal code |
| `country` | STRING | Yes | Country |
| `emergencyContact1Name` | STRING | Yes | Emergency contact #1 name |
| `emergencyContact1Relationship` | STRING | Yes | Relationship to patient |
| `emergencyContact1Phone` | STRING | Yes | Emergency contact #1 phone |
| `emergencyContact2Name` | STRING | Yes | Emergency contact #2 name |
| `emergencyContact2Phone` | STRING | Yes | Emergency contact #2 phone |
| `surgeryDate` | DATE | Yes | Date of heart surgery |
| `postOpWeek` | INTEGER | Yes | Current post-op week number |
| `surgeryType` | STRING | Yes | Type of surgery performed |
| `dischargeSummary` | TEXT | Yes | Hospital discharge notes |
| `medicationAllergies` | STRING | Yes | Known medication allergies |
| `otherAllergies` | STRING | Yes | Other allergies |
| `chronicConditions` | STRING | Yes | Pre-existing conditions |
| `smokingStatus` | ENUM | Yes | 'never', 'former', 'current' |
| `alcoholUse` | ENUM | Yes | 'none', 'occasional', 'moderate', 'heavy' |
| `occupation` | STRING | Yes | Patient's occupation |
| `education` | STRING | Yes | Education level |
| `livingSituation` | STRING | Yes | Living arrangement |
| `primaryCaregiver` | STRING | Yes | Primary caregiver name |
| `insuranceProvider` | STRING | Yes | Health insurance provider |
| `insurancePolicyNumber` | STRING | Yes | Policy number |
| `insuranceGroupNumber` | STRING | Yes | Group number |
| `preferredPharmacy` | STRING | Yes | Preferred pharmacy name |
| `pharmacyPhone` | STRING | Yes | Pharmacy phone number |
| `currentStage` | STRING | Yes | Current recovery stage |
| `targetHeartRate` | INTEGER | Yes | Target HR for exercise (BPM) |
| `maxHeartRate` | INTEGER | Yes | Maximum allowed HR (BPM) |
| `restingHeartRate` | INTEGER | Yes | Resting HR baseline (BPM) |
| `bloodPressureGoal` | STRING | Yes | Target BP (e.g., "120/80") |
| `weightGoal` | FLOAT | Yes | Target weight (lbs) |
| `notes` | TEXT | Yes | General therapist notes |
| `isActive` | BOOLEAN | Yes | Patient is active in system |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { as: 'therapist', foreignKey: 'therapistId' })`
- `belongsTo(User, { as: 'user', foreignKey: 'userId' })`

**Notes:**
- Extremely comprehensive patient profile for cardiac rehabilitation
- Supports both patients with user accounts and those managed by therapists

---

### Providers Table

**Purpose:** Healthcare providers associated with patients.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users (patient) |
| `name` | STRING | No | Provider's full name |
| `specialty` | STRING | Yes | Medical specialty |
| `phone` | STRING | Yes | Provider's phone number |
| `email` | STRING | Yes | Provider's email |
| `address` | STRING | Yes | Office address |
| `notes` | TEXT | Yes | Additional notes |
| `nextAppointment` | DATE | Yes | Next scheduled appointment |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

---

## Health Tracking

### VitalsSamples Table

**Purpose:** Patient vital sign measurements (BP, HR, weight, oxygen saturation, temperature).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `systolicBP` | INTEGER | Yes | Systolic blood pressure (mmHg) |
| `diastolicBP` | INTEGER | Yes | Diastolic blood pressure (mmHg) |
| `heartRate` | INTEGER | Yes | Heart rate (BPM) |
| `weight` | FLOAT | Yes | Weight (lbs) |
| `oxygenSaturation` | INTEGER | Yes | SpO2 percentage (%) |
| `temperature` | FLOAT | Yes | Body temperature (°F) |
| `recordedAt` | DATE | No | When vitals were measured |
| `notes` | TEXT | Yes | Additional notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

**Notes:**
- Critical for monitoring post-surgical cardiac patients
- Used to generate trend charts and trigger alerts

---

### Medications Table

**Purpose:** Patient medication regimen.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `name` | STRING | No | Medication name |
| `dosage` | STRING | Yes | Dosage amount (e.g., "10mg") |
| `frequency` | STRING | Yes | How often taken |
| `timeOfDay` | STRING | Yes | When to take (e.g., "morning") |
| `startDate` | DATE | Yes | When medication started |
| `endDate` | DATE | Yes | When medication ends (if applicable) |
| `prescribedBy` | STRING | Yes | Prescribing doctor |
| `purpose` | STRING | Yes | Reason for medication |
| `sideEffects` | STRING | Yes | Known side effects |
| `instructions` | TEXT | Yes | Special instructions |
| `isActive` | BOOLEAN | Yes | Medication is currently active |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`
- `hasMany(MedicationLog, { foreignKey: 'medicationId' })`

---

### MedicationLogs Table

**Purpose:** Tracks when patients take their medications (adherence tracking).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `medicationId` | INTEGER | No | FK to Medications |
| `userId` | INTEGER | No | FK to Users |
| `takenAt` | DATE | No | When dose was taken |
| `dosageTaken` | STRING | Yes | Amount taken |
| `notes` | TEXT | Yes | Notes about this dose |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(Medication, { foreignKey: 'medicationId' })`
- `belongsTo(User, { foreignKey: 'userId' })`

**Notes:**
- Used to track medication adherence
- Important for cardiac patients to maintain consistent medication schedules

---

### Alerts Table

**Purpose:** Health alerts triggered by abnormal vitals or missed medications.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `type` | STRING | No | Alert type (e.g., 'vital', 'medication') |
| `severity` | ENUM | Yes | 'low', 'medium', 'high', 'critical' |
| `title` | STRING | No | Alert title |
| `message` | TEXT | Yes | Alert message |
| `isResolved` | BOOLEAN | Yes | Alert has been resolved |
| `resolvedAt` | DATE | Yes | When alert was resolved |
| `notified` | BOOLEAN | Yes | User has been notified |
| `createdAt` | DATE | No | When alert was created |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

**Notes:**
- Critical for patient safety monitoring
- Can trigger email/SMS notifications

---

## Calendar & Events

### Calendars Table

**Purpose:** User-specific calendars for organizing events.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `name` | STRING | No | Calendar name |
| `color` | STRING | Yes | Display color (hex) |
| `description` | TEXT | Yes | Calendar description |
| `isDefault` | BOOLEAN | Yes | Default calendar for user |
| `isVisible` | BOOLEAN | Yes | Calendar is visible |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`
- `hasMany(CalendarEvent, { foreignKey: 'calendarId' })`

---

### CalendarEvents Table

**Purpose:** Individual calendar events (appointments, medication reminders, exercise sessions).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `calendarId` | INTEGER | No | FK to Calendars |
| `userId` | INTEGER | No | FK to Users |
| `title` | STRING | No | Event title |
| `description` | TEXT | Yes | Event description |
| `startTime` | DATE | No | Event start time |
| `endTime` | DATE | Yes | Event end time |
| `isAllDay` | BOOLEAN | Yes | All-day event flag |
| `location` | STRING | Yes | Event location |
| `category` | STRING | Yes | Event category |
| `status` | ENUM | Yes | 'pending', 'completed', 'cancelled' |
| `recurrenceRule` | STRING | Yes | Recurrence pattern (iCal RRule format) |
| `recurrenceException` | TEXT | Yes | Dates to exclude from recurrence |
| `parentEventId` | INTEGER | Yes | FK to parent event (for recurring instances) |
| `color` | STRING | Yes | Event color override |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(Calendar, { foreignKey: 'calendarId' })`
- `belongsTo(User, { foreignKey: 'userId' })`
- `belongsTo(CalendarEvent, { as: 'parentEvent', foreignKey: 'parentEventId' })`

**Notes:**
- Supports recurring events via RRule (RFC 5545)
- Used for appointments, medication reminders, exercise schedules

---

### EventTemplates Table

**Purpose:** Reusable event templates for common activities.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | Yes | FK to Users (null for system templates) |
| `name` | STRING | No | Template name |
| `description` | TEXT | Yes | Template description |
| `category` | STRING | Yes | Template category |
| `duration` | INTEGER | Yes | Default duration (minutes) |
| `color` | STRING | Yes | Default color |
| `isActive` | BOOLEAN | Yes | Template is active |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

---

## Food & Nutrition

### FoodCategories Table

**Purpose:** Food classification categories.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `name` | STRING | No | Category name |
| `description` | TEXT | Yes | Category description |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `hasMany(FoodItem, { foreignKey: 'categoryId' })`

---

### FoodItems Table

**Purpose:** Individual food items with nutritional information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `categoryId` | INTEGER | Yes | FK to FoodCategories |
| `name` | STRING | No | Food item name |
| `servingSize` | STRING | Yes | Serving size (e.g., "1 cup") |
| `calories` | INTEGER | Yes | Calories per serving |
| `protein` | FLOAT | Yes | Protein (g) |
| `carbs` | FLOAT | Yes | Carbohydrates (g) |
| `fat` | FLOAT | Yes | Fat (g) |
| `fiber` | FLOAT | Yes | Fiber (g) |
| `sodium` | INTEGER | Yes | Sodium (mg) |
| `healthRating` | INTEGER | Yes | Heart-health rating (1-5) |
| `notes` | TEXT | Yes | Additional notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(FoodCategory, { foreignKey: 'categoryId' })`
- `hasMany(MealItemEntry, { foreignKey: 'foodItemId' })`

---

### MealEntries Table

**Purpose:** Individual meal logs.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `mealType` | ENUM | Yes | 'breakfast', 'lunch', 'dinner', 'snack' |
| `mealTime` | DATE | No | When meal was consumed |
| `totalCalories` | INTEGER | Yes | Total calories for meal |
| `totalProtein` | FLOAT | Yes | Total protein (g) |
| `totalCarbs` | FLOAT | Yes | Total carbs (g) |
| `totalFat` | FLOAT | Yes | Total fat (g) |
| `notes` | TEXT | Yes | Meal notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`
- `hasMany(MealItemEntry, { foreignKey: 'mealEntryId' })`

---

### MealItemEntries Table

**Purpose:** Junction table linking meals to food items.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `mealEntryId` | INTEGER | No | FK to MealEntries |
| `foodItemId` | INTEGER | Yes | FK to FoodItems |
| `quantity` | FLOAT | Yes | Quantity consumed |
| `customFoodName` | STRING | Yes | Custom food name (if not in FoodItems) |
| `customCalories` | INTEGER | Yes | Custom calories |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(MealEntry, { foreignKey: 'mealEntryId' })`
- `belongsTo(FoodItem, { foreignKey: 'foodItemId' })`

---

## Exercise & Physical Therapy

### Exercises Table

**Purpose:** Exercise definitions/library.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `name` | STRING | No | Exercise name |
| `category` | STRING | Yes | Exercise category |
| `description` | TEXT | Yes | Exercise description |
| `instructions` | TEXT | Yes | How to perform |
| `videoUrl` | STRING | Yes | Instructional video URL |
| `imageUrl` | STRING | Yes | Exercise image URL |
| `difficulty` | ENUM | Yes | 'beginner', 'intermediate', 'advanced' |
| `targetMuscles` | STRING | Yes | Muscles targeted |
| `equipment` | STRING | Yes | Equipment needed |
| `isActive` | BOOLEAN | Yes | Exercise is active |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `hasMany(ExercisePrescription, { foreignKey: 'exerciseId' })`
- `hasMany(ExerciseLog, { foreignKey: 'exerciseId' })`

---

### ExercisePrescriptions Table

**Purpose:** Therapist-prescribed exercise plans for patients.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `patientId` | INTEGER | No | FK to Patients |
| `exerciseId` | INTEGER | No | FK to Exercises |
| `sets` | INTEGER | Yes | Number of sets |
| `reps` | INTEGER | Yes | Reps per set |
| `duration` | INTEGER | Yes | Duration (minutes) |
| `frequency` | STRING | Yes | How often (e.g., "3x per week") |
| `intensity` | STRING | Yes | Exercise intensity |
| `startDate` | DATE | Yes | When prescription starts |
| `endDate` | DATE | Yes | When prescription ends |
| `status` | ENUM | Yes | 'active', 'completed', 'discontinued' |
| `notes` | TEXT | Yes | Therapist notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(Patient, { foreignKey: 'patientId' })`
- `belongsTo(Exercise, { foreignKey: 'exerciseId' })`
- `hasMany(ExerciseLog, { foreignKey: 'prescriptionId' })`

---

### ExerciseLogs Table

**Purpose:** Patient exercise completion logs.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `exerciseId` | INTEGER | Yes | FK to Exercises |
| `prescriptionId` | INTEGER | Yes | FK to ExercisePrescriptions |
| `duration` | INTEGER | Yes | Duration (minutes) |
| `distance` | FLOAT | Yes | Distance (miles) |
| `calories` | INTEGER | Yes | Calories burned |
| `avgHeartRate` | INTEGER | Yes | Average heart rate (BPM) |
| `maxHeartRate` | INTEGER | Yes | Max heart rate (BPM) |
| `intensity` | STRING | Yes | Perceived intensity |
| `completedAt` | DATE | No | When exercise was completed |
| `notes` | TEXT | Yes | Exercise notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`
- `belongsTo(Exercise, { foreignKey: 'exerciseId' })`
- `belongsTo(ExercisePrescription, { foreignKey: 'prescriptionId' })`

**Notes:**
- Can be manually logged or synced from devices (Strava, Polar, Samsung)

---

### PhysicalTherapyPhases Table

**Purpose:** Cardiac rehabilitation phase definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `name` | STRING | No | Phase name |
| `weekStart` | INTEGER | No | Starting week post-op |
| `weekEnd` | INTEGER | No | Ending week post-op |
| `description` | TEXT | Yes | Phase description |
| `goals` | TEXT | Yes | Phase goals |
| `restrictions` | TEXT | Yes | Activity restrictions |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `hasMany(TherapyRoutine, { foreignKey: 'phaseId' })`

---

### TherapyRoutines Table

**Purpose:** Therapy routine definitions for specific phases.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `phaseId` | INTEGER | No | FK to PhysicalTherapyPhases |
| `name` | STRING | No | Routine name |
| `description` | TEXT | Yes | Routine description |
| `frequency` | STRING | Yes | How often to perform |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(PhysicalTherapyPhase, { foreignKey: 'phaseId' })`
- `hasMany(Activity, { foreignKey: 'routineId' })`

---

### Activities Table

**Purpose:** Individual activities within a therapy routine.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `routineId` | INTEGER | No | FK to TherapyRoutines |
| `name` | STRING | No | Activity name |
| `description` | TEXT | Yes | Activity description |
| `duration` | INTEGER | Yes | Duration (minutes) |
| `order` | INTEGER | Yes | Display order in routine |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(TherapyRoutine, { foreignKey: 'routineId' })`

---

### TherapyGoals Table

**Purpose:** Patient therapy goals and progress tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `title` | STRING | No | Goal title |
| `description` | TEXT | Yes | Goal description |
| `category` | STRING | Yes | Goal category |
| `targetDate` | DATE | Yes | Target completion date |
| `progress` | INTEGER | Yes | Progress percentage (0-100) |
| `status` | ENUM | Yes | 'pending', 'in-progress', 'completed', 'cancelled' |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

---

## Device Integration

### DeviceConnections Table

**Purpose:** Connected fitness devices (Strava, Polar, Samsung Health).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `deviceType` | ENUM | No | 'strava', 'polar', 'samsung' |
| `deviceName` | STRING | Yes | Device display name |
| `accessToken` | STRING | Yes | OAuth access token (encrypted) |
| `refreshToken` | STRING | Yes | OAuth refresh token (encrypted) |
| `tokenExpiry` | DATE | Yes | When access token expires |
| `isActive` | BOOLEAN | Yes | Connection is active |
| `lastSyncAt` | DATE | Yes | Last successful sync timestamp |
| `syncFrequency` | STRING | Yes | Auto-sync frequency |
| `settings` | JSON | Yes | Device-specific settings |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`
- `hasMany(DeviceSyncLog, { foreignKey: 'deviceConnectionId' })`

**Notes:**
- CRITICAL for heart rate monitoring from wearables
- Tokens should be encrypted at rest
- Used to automatically sync exercise data and heart rate

---

### DeviceSyncLogs Table

**Purpose:** Logs of device data synchronization attempts.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `deviceConnectionId` | INTEGER | No | FK to DeviceConnections |
| `syncStartedAt` | DATE | No | When sync started |
| `syncCompletedAt` | DATE | Yes | When sync completed |
| `status` | ENUM | Yes | 'pending', 'success', 'failed' |
| `recordsSynced` | INTEGER | Yes | Number of records synced |
| `errorMessage` | TEXT | Yes | Error message if failed |
| `createdAt` | DATE | No | Record creation timestamp |

**Relationships:**
- `belongsTo(DeviceConnection, { foreignKey: 'deviceConnectionId' })`

---

## Sleep & Wellness

### SleepLogs Table

**Purpose:** Sleep quality tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `sleepDate` | DATE | No | Date of sleep |
| `bedtime` | DATE | Yes | When went to bed |
| `wakeTime` | DATE | Yes | When woke up |
| `totalHours` | FLOAT | Yes | Total sleep duration (hours) |
| `quality` | INTEGER | Yes | Sleep quality rating (1-5) |
| `interruptions` | INTEGER | Yes | Number of wake-ups |
| `notes` | TEXT | Yes | Sleep notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

**Notes:**
- Important for cardiac recovery monitoring
- Poor sleep can affect heart health

---

### HydrationLogs Table

**Purpose:** Daily water intake tracking.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `logDate` | DATE | No | Date of log |
| `amountOz` | FLOAT | No | Water consumed (ounces) |
| `goalOz` | FLOAT | Yes | Daily goal (ounces) |
| `notes` | TEXT | Yes | Hydration notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

---

### DailyScores Table

**Purpose:** Overall daily health score aggregation.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | No | Primary key |
| `userId` | INTEGER | No | FK to Users |
| `date` | DATE | No | Date of score |
| `overallScore` | INTEGER | Yes | Overall health score (0-100) |
| `exerciseScore` | INTEGER | Yes | Exercise component score |
| `nutritionScore` | INTEGER | Yes | Nutrition component score |
| `sleepScore` | INTEGER | Yes | Sleep component score |
| `medicationScore` | INTEGER | Yes | Medication adherence score |
| `vitalsScore` | INTEGER | Yes | Vitals within range score |
| `notes` | TEXT | Yes | Daily notes |
| `createdAt` | DATE | No | Record creation timestamp |
| `updatedAt` | DATE | No | Last update timestamp |

**Relationships:**
- `belongsTo(User, { foreignKey: 'userId' })`

**Notes:**
- Provides at-a-glance view of patient health
- Useful for identifying trends and patterns

---

## Relationships

### Entity Relationship Diagram (Text)

```
Users (1) ----< (Many) Patients [therapist relationship]
Users (1) ----< (Many) Patients [patient user account]
Users (1) ----< (Many) VitalsSamples
Users (1) ----< (Many) Medications
Users (1) ----< (Many) Calendars
Users (1) ----< (Many) CalendarEvents
Users (1) ----< (Many) MealEntries
Users (1) ----< (Many) TherapyGoals
Users (1) ----< (Many) Alerts
Users (1) ----< (Many) Providers
Users (1) ----< (Many) ExerciseLogs
Users (1) ----< (Many) SleepLogs
Users (1) ----< (Many) HydrationLogs
Users (1) ----< (Many) DailyScores
Users (1) ----< (Many) DeviceConnections

Patients (1) ----< (Many) ExercisePrescriptions

Medications (1) ----< (Many) MedicationLogs

Calendars (1) ----< (Many) CalendarEvents

MealEntries (1) ----< (Many) MealItemEntries
FoodItems (1) ----< (Many) MealItemEntries
FoodCategories (1) ----< (Many) FoodItems

Exercises (1) ----< (Many) ExercisePrescriptions
Exercises (1) ----< (Many) ExerciseLogs
ExercisePrescriptions (1) ----< (Many) ExerciseLogs

PhysicalTherapyPhases (1) ----< (Many) TherapyRoutines
TherapyRoutines (1) ----< (Many) Activities

DeviceConnections (1) ----< (Many) DeviceSyncLogs
```

---

## Indexes

### Recommended Indexes for Performance

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Patients table
CREATE INDEX idx_patients_therapist ON patients(therapist_id);
CREATE INDEX idx_patients_user ON patients(user_id);
CREATE INDEX idx_patients_active ON patients(is_active);

-- VitalsSamples table
CREATE INDEX idx_vitals_user_date ON vitals_samples(user_id, recorded_at DESC);

-- Medications table
CREATE INDEX idx_medications_user ON medications(user_id);
CREATE INDEX idx_medications_active ON medications(is_active);

-- MedicationLogs table
CREATE INDEX idx_medication_logs_medication ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_user_date ON medication_logs(user_id, taken_at DESC);

-- CalendarEvents table
CREATE INDEX idx_events_user_date ON calendar_events(user_id, start_time);
CREATE INDEX idx_events_calendar ON calendar_events(calendar_id);
CREATE INDEX idx_events_status ON calendar_events(status);

-- MealEntries table
CREATE INDEX idx_meals_user_date ON meal_entries(user_id, meal_time DESC);

-- ExerciseLogs table
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, completed_at DESC);
CREATE INDEX idx_exercise_logs_prescription ON exercise_logs(prescription_id);

-- DeviceConnections table
CREATE INDEX idx_devices_user ON device_connections(user_id);
CREATE INDEX idx_devices_type_active ON device_connections(device_type, is_active);

-- Alerts table
CREATE INDEX idx_alerts_user_resolved ON alerts(user_id, is_resolved);
CREATE INDEX idx_alerts_severity ON alerts(severity);
```

---

## Database Migrations

**Location:** `backend/migrations/` (if using Sequelize migrations)

**Running Migrations:**
```bash
# Create a new migration
npx sequelize-cli migration:generate --name description-of-changes

# Run pending migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo
```

---

## Data Retention & Privacy

### HIPAA Considerations

This database stores Protected Health Information (PHI) and must comply with HIPAA regulations:

1. **Encryption at Rest:** Database should use encrypted storage
2. **Encryption in Transit:** Always use SSL/TLS for database connections
3. **Access Logging:** Enable PostgreSQL audit logging
4. **Backup Encryption:** Encrypted database backups
5. **Data Retention:** Implement retention policies as per organizational requirements
6. **User Deletion:** Soft delete with audit trail, or anonymize data

### Sensitive Fields Requiring Extra Protection

- `Users.password` - Hashed with bcrypt (never stored plain)
- `DeviceConnections.accessToken` - Should be encrypted at rest
- `DeviceConnections.refreshToken` - Should be encrypted at rest
- `Patients.*` - All patient data is PHI
- `VitalsSamples.*` - Health data is PHI

---

## Database Maintenance

### Regular Maintenance Tasks

1. **Vacuum:** Run `VACUUM ANALYZE` weekly to optimize query performance
2. **Index Maintenance:** Rebuild indexes monthly
3. **Backup:** Daily encrypted backups with 30-day retention
4. **Monitor Growth:** Track database size and table growth
5. **Connection Pooling:** Monitor connection pool usage and tune as needed

---

## For Developers

### Model Files Location

All Sequelize models are located in: `backend/src/models/`

### Adding a New Table

1. Create model file in `backend/src/models/NewTable.ts`
2. Define interface and model class
3. Add model to `backend/src/models/index.ts`
4. Define associations in `associate()` method
5. Create migration (if using migrations)
6. Update this documentation

### Common Queries

See `backend/src/controllers/` for example queries using these models.

---

**Document Version:** 1.0
**Last Updated:** November 1, 2025
**Contact:** For questions about the database schema, contact the development team.
