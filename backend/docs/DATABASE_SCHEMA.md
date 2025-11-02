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

### Overview

The Heart Recovery Calendar uses **Sequelize migrations** to manage database schema changes in a version-controlled, repeatable manner.

**Migration System:** Sequelize CLI + Umzug
**Location:** `backend/src/migrations/`
**Total Migrations:** 42 migration files (as of Nov 2025)
**Status:** ✅ Fully implemented and actively used

### Current Migrations

The project includes comprehensive migrations covering:

| Date Range | Count | Purpose |
|------------|-------|---------|
| Oct 24, 2025 | 10 | Initial schema (Users, Calendars, Events, Meals, Vitals, Medications, Therapy, Food) |
| Oct 25-26, 2025 | 8 | Patient system, Exercises, Sleep logs, Hydration |
| Oct 27-29, 2025 | 10 | Patient enhancements, Exercise metrics, Event tracking |
| Oct 30, 2025 | 10 | Post-surgery tracking, Device integrations, Daily scores |
| Oct 31, 2025 | 4 | Provider system, Device sync enhancements |

**Key Migration Examples:**
- `20251024000001-create-users.js` - User authentication system
- `20251024000009-create-therapy-system.js` - Physical therapy management (14KB)
- `20251024000010-create-food-system.js` - Nutrition tracking (29KB)
- `20251030115540-add-vitals-and-metrics-to-exercise-logs.js` - Exercise health metrics
- `20251030115600-create-device-connections.js` - Strava/Polar/Samsung integration

### Running Migrations

**Standard Workflow (Sequelize CLI):**
```bash
# Create a new migration
npx sequelize-cli migration:generate --name description-of-changes

# Run all pending migrations
npx sequelize-cli db:migrate

# Check migration status
npx sequelize-cli db:migrate:status

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations (DANGEROUS)
npx sequelize-cli db:migrate:undo:all
```

**Alternative: Manual Migration Script**
The project also includes `run-migration.js` for custom migration workflows:
```bash
node run-migration.js
```

### Migration Naming Convention

```
YYYYMMDDHHMMSS-description-of-change.js
```

**Examples:**
- `20251024000001-create-users.js` - Clear purpose (create users table)
- `20251030115540-add-vitals-and-metrics-to-exercise-logs.js` - Descriptive enhancement

### Best Practices

✅ **DO:**
- Use timestamps in migration filenames (YYYYMMDDHHMMSS)
- Include both `up` and `down` methods for reversibility
- Add `IF NOT EXISTS` / `IF EXISTS` clauses for idempotency
- Test migrations in development before production
- Keep migrations atomic (one logical change per file)
- Add database comments for complex columns

❌ **DON'T:**
- Modify existing migration files after they've been deployed
- Delete migration files from the migrations folder
- Run migrations manually in production (use CI/CD)
- Mix schema changes with data migrations in the same file

### Migration Template

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_name', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      // ... other columns
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('table_name', ['column_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_name');
  }
};
```

### Production Deployment

**Migration Checklist:**
1. ✅ Test migration in local development
2. ✅ Test rollback (`db:migrate:undo`) works
3. ✅ Review migration file for SQL injection risks
4. ✅ Backup database before running migrations
5. ✅ Run migrations during maintenance window
6. ✅ Verify migration completed successfully
7. ✅ Monitor application for errors post-migration

**Automated Deployment:**
```bash
# Example CI/CD pipeline step
npm run migrate:production
```

### Migration Backfill Test Procedure

**What is a Backfill Migration?**

A backfill migration is a database migration that:
1. Adds a new column to an existing table
2. Populates (backfills) that column with calculated or default values for existing rows
3. May add constraints (NOT NULL, UNIQUE, etc.) after backfilling

Backfill migrations are common when adding required fields to tables that already contain data.

**When to Use Backfill Migrations:**

- Adding a new required column (`NOT NULL`) to a populated table
- Migrating data from one column format to another
- Computing derived values from existing data
- Normalizing data (splitting columns, creating lookup tables)
- Adding audit fields (`createdBy`, `lastModifiedAt`) to existing records

**Why Testing is Critical:**

❌ **Risks of Untested Backfills:**
- Migration fails mid-execution on large tables (millions of rows)
- Backfill logic has bugs, corrupting existing data
- Performance issues cause application downtime
- Memory exhaustion on large datasets
- Deadlocks with concurrent transactions

✅ **Benefits of Proper Testing:**
- Verify backfill logic is correct before production
- Identify performance bottlenecks
- Validate rollback procedures work
- Ensure data integrity constraints are met

---

### Backfill Testing Procedure

#### Step 1: Create a Realistic Test Dataset

**Generate test data that mirrors production:**

```bash
# Connect to development database
psql -U postgres -d heartbeat_calendar_dev

# Check current production data volume
SELECT
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL SELECT 'vitals_samples', COUNT(*) FROM vitals_samples;
```

**Seed test data (if needed):**

```javascript
// backend/src/scripts/seed-test-data.js
const { CalendarEvent } = require('../models');

async function seedTestData() {
  const testEvents = [];

  // Create 10,000 test events (adjust to match production scale)
  for (let i = 0; i < 10000; i++) {
    testEvents.push({
      calendarId: Math.floor(Math.random() * 100) + 1,
      title: `Test Event ${i}`,
      startTime: new Date(2025, 0, 1 + (i % 365)),
      endTime: new Date(2025, 0, 1 + (i % 365)),
      status: 'scheduled'
    });
  }

  await CalendarEvent.bulkCreate(testEvents);
  console.log(`Created ${testEvents.length} test events`);
}

seedTestData();
```

#### Step 2: Write the Backfill Migration

**Example: Adding `privacyLevel` to CalendarEvent**

```javascript
// backend/src/migrations/20251102000001-add-privacy-level-to-calendar-events.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Step 1: Add column (nullable first)
      await queryInterface.addColumn(
        'calendar_events',
        'privacyLevel',
        {
          type: Sequelize.ENUM('private', 'shared', 'clinical'),
          allowNull: true, // Allow null during backfill
          comment: 'Privacy level: private (patient only), shared (with therapist), clinical (medical records)'
        },
        { transaction }
      );

      // Step 2: Backfill existing records
      // Strategy: Use batching to avoid memory issues
      const BATCH_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      console.log('Starting backfill of privacyLevel...');

      while (hasMore) {
        const result = await queryInterface.sequelize.query(
          `
          UPDATE calendar_events
          SET "privacyLevel" = CASE
            WHEN "createdBy" IS NOT NULL THEN 'clinical'  -- Therapist-created events
            WHEN "patientId" IS NOT NULL THEN 'shared'    -- Patient-assigned events
            ELSE 'private'                                 -- Default to private
          END
          WHERE id IN (
            SELECT id FROM calendar_events
            WHERE "privacyLevel" IS NULL
            ORDER BY id
            LIMIT :batchSize
          )
          `,
          {
            replacements: { batchSize: BATCH_SIZE },
            transaction
          }
        );

        const rowsAffected = result[1].rowCount || 0;
        console.log(`Backfilled ${rowsAffected} rows (offset: ${offset})`);

        if (rowsAffected < BATCH_SIZE) {
          hasMore = false;
        }

        offset += BATCH_SIZE;
      }

      // Step 3: Add NOT NULL constraint (after backfill complete)
      await queryInterface.changeColumn(
        'calendar_events',
        'privacyLevel',
        {
          type: Sequelize.ENUM('private', 'shared', 'clinical'),
          allowNull: false,
          defaultValue: 'private'
        },
        { transaction }
      );

      console.log('Backfill migration completed successfully');
      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      console.error('Backfill migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('calendar_events', 'privacyLevel');
  }
};
```

#### Step 3: Test the Migration in Development

**Run migration and validate:**

```bash
# Backup development database first
pg_dump -U postgres heartbeat_calendar_dev > backup_before_backfill.sql

# Run the migration
cd backend
npx sequelize-cli db:migrate

# Verify backfill results
psql -U postgres -d heartbeat_calendar_dev << EOF
-- Check all rows were backfilled
SELECT COUNT(*) as total_rows FROM calendar_events;
SELECT COUNT(*) as backfilled_rows FROM calendar_events WHERE "privacyLevel" IS NOT NULL;

-- Validate backfill logic
SELECT
  CASE
    WHEN "createdBy" IS NOT NULL THEN 'Should be clinical'
    WHEN "patientId" IS NOT NULL THEN 'Should be shared'
    ELSE 'Should be private'
  END as expected_privacy,
  "privacyLevel" as actual_privacy,
  COUNT(*) as count
FROM calendar_events
GROUP BY expected_privacy, actual_privacy
ORDER BY expected_privacy, actual_privacy;

-- Check for null values (should be 0)
SELECT COUNT(*) as null_count FROM calendar_events WHERE "privacyLevel" IS NULL;
EOF
```

#### Step 4: Test Rollback

**Verify the down migration works:**

```bash
# Undo the migration
npx sequelize-cli db:migrate:undo

# Verify column was removed
psql -U postgres -d heartbeat_calendar_dev -c "\d calendar_events"

# Restore from backup if needed
psql -U postgres heartbeat_calendar_dev < backup_before_backfill.sql

# Re-run migration
npx sequelize-cli db:migrate
```

#### Step 5: Performance Testing

**Test with production-scale data:**

```bash
# Measure migration time
time npx sequelize-cli db:migrate

# Monitor database performance during migration
psql -U postgres -d heartbeat_calendar_dev << EOF
-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check table locks
SELECT * FROM pg_locks WHERE relation::regclass::text = 'calendar_events';
EOF
```

**Expected Performance Benchmarks:**

| Rows | Batch Size | Expected Time | Memory Usage |
|------|------------|---------------|--------------|
| 1,000 | 1000 | < 1 second | < 10 MB |
| 10,000 | 1000 | < 10 seconds | < 50 MB |
| 100,000 | 1000 | < 2 minutes | < 100 MB |
| 1,000,000 | 1000 | < 20 minutes | < 500 MB |

**If performance is poor:**
- Reduce batch size (500 or 250)
- Add temporary index on columns used in WHERE clause
- Run during low-traffic hours
- Consider application-level backfill instead

#### Step 6: Validate Data Integrity

**Check constraints and indexes:**

```sql
-- Verify NOT NULL constraint was added
SELECT
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND column_name = 'privacyLevel';

-- Check ENUM values
SELECT
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'enum_calendar_events_privacyLevel';

-- Verify referential integrity (if foreign keys involved)
SELECT COUNT(*) FROM calendar_events WHERE "privacyLevel" NOT IN ('private', 'shared', 'clinical');
```

#### Step 7: Document the Migration

**Add comments to migration file:**

```javascript
/**
 * Migration: Add privacyLevel to CalendarEvent
 *
 * BACKFILL STRATEGY:
 * - Batched updates (1000 rows at a time) to prevent memory issues
 * - Uses CASE statement for conditional backfill logic
 * - Therapist-created events → 'clinical'
 * - Patient-assigned events → 'shared'
 * - Other events → 'private'
 *
 * TESTING NOTES:
 * - Tested with 50,000 rows in development
 * - Migration completed in 45 seconds
 * - All rows successfully backfilled
 * - Rollback verified working
 *
 * PRODUCTION ESTIMATE:
 * - Expected rows: ~100,000
 * - Estimated time: 90 seconds
 * - Maintenance window: Not required (non-blocking migration)
 */
```

---

### Common Backfill Patterns

#### Pattern 1: Simple Default Value

```javascript
// Add column with default value for all existing rows
await queryInterface.addColumn('users', 'accountStatus', {
  type: Sequelize.ENUM('active', 'inactive', 'suspended'),
  allowNull: false,
  defaultValue: 'active'  // Postgres will backfill automatically
});
```

#### Pattern 2: Computed Value from Existing Columns

```javascript
// Calculate value from other columns
await queryInterface.sequelize.query(
  `
  UPDATE calendar_events
  SET "durationMinutes" = EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60
  WHERE "durationMinutes" IS NULL
  `
);
```

#### Pattern 3: Lookup from Related Table

```javascript
// Backfill from joined table
await queryInterface.sequelize.query(
  `
  UPDATE calendar_events e
  SET "therapistId" = c."ownerId"
  FROM calendars c
  WHERE e."calendarId" = c.id
    AND c."ownerType" = 'therapist'
    AND e."therapistId" IS NULL
  `
);
```

#### Pattern 4: Incremental Backfill (Large Tables)

```javascript
// For tables with millions of rows
let lastProcessedId = 0;
const BATCH_SIZE = 5000;

while (true) {
  const result = await queryInterface.sequelize.query(
    `
    UPDATE large_table
    SET "newColumn" = 'calculated_value'
    WHERE id > :lastId
      AND id <= (SELECT MIN(id) + :batchSize FROM large_table WHERE id > :lastId)
      AND "newColumn" IS NULL
    RETURNING id
    `,
    { replacements: { lastId: lastProcessedId, batchSize: BATCH_SIZE } }
  );

  if (result[0].length === 0) break;

  lastProcessedId = result[0][result[0].length - 1].id;
  console.log(`Processed up to ID: ${lastProcessedId}`);

  // Pause between batches to avoid overwhelming database
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

---

### Backfill Migration Checklist

**Before Writing Migration:**
- [ ] Identify all affected tables and row counts
- [ ] Determine backfill strategy (default, computed, lookup)
- [ ] Estimate migration time based on data volume
- [ ] Plan for transaction batching if > 10,000 rows

**During Development:**
- [ ] Write migration with both `up` and `down` methods
- [ ] Add column as nullable initially
- [ ] Implement batched updates (1000-5000 rows per batch)
- [ ] Add progress logging
- [ ] Wrap in transaction for atomicity
- [ ] Add NOT NULL constraint after backfill complete

**Testing:**
- [ ] Seed realistic test data (match production scale)
- [ ] Run migration in development
- [ ] Validate backfill logic with SQL queries
- [ ] Test rollback (`db:migrate:undo`)
- [ ] Measure performance and memory usage
- [ ] Check for NULL values after backfill

**Production Deployment:**
- [ ] Document expected migration time
- [ ] Schedule during maintenance window (if > 5 minutes)
- [ ] Backup database before migration
- [ ] Monitor migration progress (check logs)
- [ ] Verify data integrity post-migration
- [ ] Monitor application errors for 24 hours

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
