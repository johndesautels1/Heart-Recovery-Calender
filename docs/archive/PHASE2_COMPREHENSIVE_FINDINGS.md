# Phase 2: Frontend Analysis & Architecture Planning - COMPLETE FINDINGS

**Date:** January 2025
**Project:** Heart Recovery Calendar
**Phase:** 2 - Frontend Exploration & Data Architecture Analysis

---

## Executive Summary

Phase 2 involved comprehensive analysis of the frontend application to understand:
1. Chart inventory and data visualization system (86 charts identified)
2. Existing data entry workflows and forms
3. Critical gaps in exercise vitals collection
4. Architecture needed for adaptive event completion forms
5. Dual storage strategy for calendar events + specialized log tables

### Key Discovery
**CRITICAL FINDING:** Exercise completion form exists in `CalendarPage.tsx` (lines 1624-1850) but:
- Stores data ONLY in `calendar_events` table
- Missing 13 of 20 Phase 1 vitals fields (no pre/during/post BP, HR, O2)
- Not connected to `exercise_logs` table
- Form is exercise-specific; need adaptive forms for all 7 event types

---

## 1. Chart Inventory (86 Charts Total)

### 1.1 VitalsPage.tsx - **7 Charts** ✅ FULLY FUNCTIONAL
**File:** `frontend/src/pages/VitalsPage.tsx` (1,134 lines)
**Status:** 100% wired to real API data
**API Integration:** `api.getVitals()`, `api.getLatestVital()`, `api.createVital()`

**Chart Breakdown:**
1. **Blood Pressure Dual-Area Chart** (line 450)
   - Systolic (red area) + Diastolic (blue area)
   - Reference lines for safe ranges (90-140 sys, 60-90 dia)
   - Data: `vitals.bloodPressureSystolic`, `vitals.bloodPressureDiastolic`

2. **Heart Rate Line Chart** (line 510)
   - Target range: 60-100 bpm
   - Data: `vitals.heartRate`

3. **Oxygen Saturation Line Chart** (line 570)
   - Critical threshold: 95%
   - Data: `vitals.oxygenSaturation`

4. **Weight Line Chart** (line 630)
   - Trend tracking
   - Data: `vitals.weight`

5. **Temperature Line Chart** (line 690)
   - Normal range: 97-99°F
   - Data: `vitals.temperature`

6. **Glucose Line Chart** (line 750)
   - Target range indicator
   - Data: `vitals.bloodGlucose`

7. **All Metrics Combined Chart** (line 810)
   - ComposedChart with multiple Y-axes
   - All vitals normalized to 0-100 scale

**Data Source:** PostgreSQL `vitals_samples` table with `postSurgeryDay` (Phase 1 ✅)

---

### 1.2 ExercisesPage.tsx - **18 Charts** ⚠️ SIMULATED DATA
**File:** `frontend/src/pages/ExercisesPage.tsx` (2,720 lines)
**Status:** Charts exist, using placeholder data
**Missing:** API connection to `exercise_logs` table

**Chart Breakdown:**

**PERFORMANCE TRACKING (6 charts):**
1. **Performance Breakdown Pie Chart** (line 1241)
   - Shows distribution: 0 points (no show), 2, 4, 6, 8 points
   - Data: Simulated `performanceBreakdown` object
   - **READY FOR:** Real `exercise_logs.performanceScore` data

2. **Weekly Progress Bar Chart** (line 1286)
   - Color-coded bars by performance level
   - Tracks sessions per week
   - **READY FOR:** `exercise_logs` grouped by week

3. **Monthly Score Gauge** (line 1352)
   - RadialBarChart showing 0-100% progress
   - **READY FOR:** Aggregated monthly scores

4. **Performance Trend Line** (line 1407)
   - Track score improvements over time
   - **READY FOR:** `exercise_logs.performanceScore` time series

5. **Session Completion Rate Pie** (line 1468)
   - Completed vs Missed sessions
   - **READY FOR:** Calendar events with status='completed'

6. **Goal Achievement Bar** (line 1530)
   - Met goals, exceeded goals, did not meet
   - **READY FOR:** Performance score categories

**VITALS TRACKING (5 charts) - 🎯 PHASE 1 FIELDS READY:**
7. **Heart Rate Recovery Radar** (line 1593)
   - Pre/During/Post heart rate comparison
   - **NEEDS:** `exercise_logs.preHeartRate`, `duringHeartRateAvg`, `postHeartRate` ✅ Added in Phase 1

8. **Blood Pressure Trends** (line 1650)
   - Pre/During/Post BP tracking
   - **NEEDS:** `exercise_logs.preBpSystolic`, `duringBpSystolic`, `postBpSystolic` ✅ Added in Phase 1

9. **Oxygen Saturation Line** (line 1710)
   - Pre/Post O2 comparison
   - **NEEDS:** `exercise_logs.preOxygenSat`, `postOxygenSat` ✅ Added in Phase 1

10. **Vitals Recovery Time** (line 1770)
    - How quickly vitals return to baseline
    - **NEEDS:** Calculated from pre/post differences

11. **Safety Threshold Alerts** (line 1830)
    - Flag dangerous vital readings
    - **NEEDS:** Compare vitals to patient safety windows

**ACTIVITY METRICS (7 charts):**
12. **Cardiovascular Endurance Line** (line 1471)
    - Distance over time, duration trends
    - **NEEDS:** `exercise_logs.distanceMiles`, `durationMinutes` ✅ Phase 1

13. **MET Levels Line Chart** (line 1534)
    - Exercise capacity measurement
    - **NEEDS:** Calculated from duration + intensity

14. **Steps & Distance Bar** (line 1890)
    - Daily activity tracking
    - **NEEDS:** `exercise_logs.steps`, `distanceMiles` ✅ Phase 1

15. **Elevation Gain Area** (line 1950)
    - Vertical progress tracking
    - **NEEDS:** `exercise_logs.elevationFeet` ✅ Phase 1

16. **Caloric Expenditure Bar** (line 2010)
    - Energy burned per session
    - **NEEDS:** `exercise_logs.caloriesBurned` ✅ Phase 1

17. **RPE (Perceived Exertion) Scatter** (line 1731)
    - Borg scale tracking
    - **NEEDS:** `exercise_logs.perceivedExertion` ✅ Added in Phase 1

18. **Laps & Repetitions Tracker** (line 2070)
    - Pool/track activity
    - **NEEDS:** `exercise_logs.laps` ✅ Phase 1

**Critical Gap:** NO API ENDPOINT for creating exercise logs. Forms exist but not connected.

---

### 1.3 SleepPage.tsx - **8 Charts** ⚠️ PARTIALLY WIRED
**File:** `frontend/src/pages/SleepPage.tsx` (1,787 lines)
**API:** `api.getSleepLogs()`, `api.createSleepLog()` ✅ Exists
**Status:** Needs verification and `postSurgeryDay` integration

**Chart Breakdown:**
1. Sleep Duration Trend Line
2. Sleep Quality Bar Chart
3. Sleep Efficiency Gauge
4. Bedtime Consistency Scatter
5. Wake Time Pattern Line
6. Sleep Stage Distribution Pie
7. Sleep Debt Tracker Area
8. Weekly Sleep Summary Radar

**Needs:** Integration with `postSurgeryDay` for recovery tracking

---

### 1.4 MealsPage.tsx - **16 Charts** ✅ API CONNECTED
**File:** `frontend/src/pages/MealsPage.tsx` (2,043 lines)
**API:** `api.getMeals()`, `api.createMeal()`, `api.getFoodItems()` ✅
**Database:** `meal_entries` table with `postSurgeryDay` ✅ Phase 1

**Chart Breakdown:**
1. Daily Calorie Intake Bar
2. Macronutrient Distribution Pie (Protein/Carbs/Fat)
3. Meal Timing Pattern Line
4. Sodium Tracking Line (cardiac importance)
5. Hydration Tracker Area
6. Food Rating Distribution (Green/Yellow/Red)
7. Meal Compliance Gauge
8. Weekly Nutrition Summary Radar
9. Portion Size Trends
10. Food Category Breakdown Pie
11. Sodium vs Target Line
12. Meal Frequency Bar
13. Snack vs Meal Ratio
14. Nutrient Trends Line
15. Dietary Goals Progress Bar
16. Weekly Meal Score Radar

**Status:** Functional but needs postSurgeryDay-based filtering

---

### 1.5 MedicationsPage.tsx - **14 Charts** ✅ API CONNECTED
**File:** `frontend/src/pages/MedicationsPage.tsx` (1,830 lines)
**API:** `api.getMedications()`, `api.createMedicationLog()` ✅
**Database:** `medication_logs` table with `postSurgeryDay` ✅ Phase 1

**Chart Breakdown:**
1. Adherence Rate Gauge (Percentage)
2. Taken vs Missed Bar Chart
3. Medication Schedule Timeline
4. Dose Timing Compliance Line
5. Medication Types Pie
6. Weekly Adherence Heatmap
7. Side Effects Frequency Bar
8. Medication Count Line (tapering)
9. Time-of-Day Distribution Bar
10. Adherence Streak Tracker
11. Missed Dose Patterns Scatter
12. Monthly Compliance Radar
13. Medication Effectiveness Rating
14. Doctor Visit Correlation Line

**Status:** Functional, ready for postSurgeryDay filtering

---

### 1.6 DashboardPage.tsx - **23 Charts** ⚠️ MIXED DATA SOURCES
**File:** `frontend/src/pages/DashboardPage.tsx` (2,985 lines)
**Status:** Complex aggregation, real + computed data

**Overview Charts (7):**
1. Today's Activities Summary Bar
2. Weekly Compliance Radar (6 categories)
3. Recovery Progress Gauge
4. Upcoming Events Timeline
5. Alert Status Pie
6. Daily Score Trend Line
7. Weight Tracking Line (existing component)

**Category Mini-Charts (16):**
8-10. Vitals summary (BP, HR, O2)
11-13. Medication adherence mini-charts
14-16. Exercise completion mini-bars
17-19. Meal compliance mini-gauges
20-22. Sleep quality mini-lines
23. Overall health score composite

**Status:** Needs integration with new `daily_scores` table from Phase 1

---

## 2. Data Entry Workflow Analysis

### 2.1 Existing Entry Points

#### ✅ Vitals Entry - FULLY FUNCTIONAL
- **Location:** `VitalsPage.tsx` "Log New Reading" button
- **Form Fields:**
  - Blood Pressure (systolic/diastolic)
  - Heart Rate
  - Oxygen Saturation
  - Weight
  - Temperature
  - Blood Glucose
  - Timestamp
  - Notes
- **API:** `api.createVital(data)` → `POST /api/vitals`
- **Storage:** `vitals_samples` table ✅
- **WHO:** Patients enter, therapists can view/review

#### ✅ Meals Entry - FULLY FUNCTIONAL
- **Location:** `MealsPage.tsx` "Log Meal" button
- **Form Features:**
  - Food database search (253 items with health ratings)
  - Multiple food items per meal
  - Portion sizes
  - Meal type (breakfast/lunch/dinner/snack)
  - Timing
  - Notes
- **API:** `api.createMeal(data)` → `POST /api/meals`
- **Storage:** `meal_entries` + `meal_item_entries` tables ✅
- **WHO:** Patients enter meals

#### ✅ Medications Entry - FULLY FUNCTIONAL
- **Location:** `MedicationsPage.tsx` "Log Dose" button
- **Form Fields:**
  - Medication selection (from active meds)
  - Status (taken/missed/skipped)
  - Actual dose time
  - Side effects notes
- **API:** `api.createMedicationLog(medicationId, data)` → `POST /api/medications/:id/log-dose`
- **Storage:** `medication_logs` table ✅
- **WHO:** Patients log doses

#### ✅ Sleep Entry - FULLY FUNCTIONAL
- **Location:** `SleepPage.tsx` "Log Sleep" button
- **Form Fields:**
  - Date
  - Hours slept
  - Sleep quality (1-10)
  - Bedtime/wake time
  - Interruptions
  - Notes
- **API:** `api.createSleepLog(data)` → `POST /api/sleep-logs`
- **Storage:** `sleep_logs` table ✅
- **WHO:** Patients enter sleep data

---

### 2.2 Exercise Entry - 🚨 CRITICAL FINDING

#### ⚠️ Calendar Event Completion Form EXISTS but INCOMPLETE
**Location:** `frontend/src/pages/CalendarPage.tsx:1624-1850`

**How Patients Access:**
1. Patient views calendar
2. Clicks on scheduled exercise event (created by therapist or self)
3. Event detail modal opens with completion form

**Current Form Collects (lines 1624-1850):**

**Section 1: Sleep Hours** (lines 1624-1657)
- Input: Hours of sleep (0-24, decimal)
- Saves to: `calendar_events.sleepHours`
- Handler: `handleUpdateSleepHours()` line 677

**Section 2: Performance Score** (lines 1659-1695) ✅
- Dropdown: 0 (no show), 4 (completed), 6 (met goals), 8 (exceeded)
- Saves to: `calendar_events.performanceScore`
- Handler: `handleUpdatePerformanceScore()` line 692
- **WHO:** Therapists typically rate this

**Section 3: Exercise Metrics** (lines 1697-1850) ⚠️ PARTIAL
```typescript
// State variables (lines 60-69)
const [exerciseIntensity, setExerciseIntensity] = useState<string>('');
const [distanceMiles, setDistanceMiles] = useState<string>('');
const [laps, setLaps] = useState<string>('');
const [steps, setSteps] = useState<string>('');
const [elevationFeet, setElevationFeet] = useState<string>('');
const [durationMinutes, setDurationMinutes] = useState<string>('');
const [heartRateAvg, setHeartRateAvg] = useState<string>('');
const [heartRateMax, setHeartRateMax] = useState<string>('');
const [caloriesBurned, setCaloriesBurned] = useState<string>('');
const [exerciseNotes, setExerciseNotes] = useState<string>('');
```

**Form Fields Present:**
- ✅ Intensity (1-10)
- ✅ Duration (minutes)
- ✅ Distance (miles)
- ✅ Steps
- ✅ Laps
- ✅ Elevation (feet)
- ✅ Heart Rate Average (bpm)
- ✅ Heart Rate Max (bpm)
- ✅ Calories Burned
- ✅ Exercise Notes

**Handler:** `handleUpdateExerciseMetrics()` line 726
```javascript
const handleUpdateExerciseMetrics = async () => {
  // Collects all metrics
  const updateData: any = {};
  if (exerciseIntensity) updateData.exerciseIntensity = parseInt(exerciseIntensity);
  if (distanceMiles) updateData.distanceMiles = parseFloat(distanceMiles);
  // ... etc

  // PROBLEM: Saves to calendar_events table ONLY
  const updated = await api.updateEvent(selectedEvent.id, updateData);
  // Does NOT create exercise_log entry!
};
```

---

### 2.3 CRITICAL GAPS IDENTIFIED

#### ❌ Missing from Exercise Form (Phase 1 Fields):

**Pre-Exercise Vitals (NOT COLLECTED):**
- `preBpSystolic` - Blood pressure before exercise
- `preBpDiastolic`
- `preHeartRate` - Resting HR before starting
- `preOxygenSat` - O2 saturation at rest

**During-Exercise Vitals (PARTIAL):**
- `duringBpSystolic` - NOT COLLECTED
- `duringBpDiastolic` - NOT COLLECTED
- `duringHeartRateAvg` - Has `heartRateAvg` but not specifically labeled as "during"
- `duringHeartRateMax` - Has `heartRateMax`

**Post-Exercise Vitals (NOT COLLECTED):**
- `postBpSystolic` - Recovery BP
- `postBpDiastolic`
- `postHeartRate` - Recovery HR
- `postOxygenSat` - O2 recovery

**Other Missing:**
- `perceivedExertion` - Borg RPE scale (1-10) - NOT COLLECTED
- `startedAt` - Precise start timestamp - NOT COLLECTED

**Architecture Problem:**
- Data saves to `calendar_events.exerciseIntensity` etc.
- Does NOT create entry in `exercise_logs` table
- Phase 1 created `exercise_logs` table with 20 new fields
- But no API endpoint exists: `POST /api/exercise-logs`

---

## 3. Adaptive Form Architecture Requirements

### 3.1 The Core Problem

**Current System:**
- Calendar events can represent ANY activity type
- Completion form is hard-coded for exercise only (lines 1659-1850)
- When patient completes meal/vitals/medication event → no appropriate form

**User Request:**
> "If a therapist or patient places another task or metric to be measured... for example the patient wants to follow a specific diet plan for a day the therapist posts on their calendar... how does the patient log the completion of that as the current form is specific for exercise?"

**Answer:** We need **ADAPTIVE FORMS** that detect event type and render appropriate fields.

---

### 3.2 Event Type Detection Logic

**Two mechanisms exist for categorization:**

**Mechanism 1: Calendar Type** (`Calendar` model line 8)
```typescript
type: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'symptoms' | 'general'
```

**Mechanism 2: Event Template Category** (`EventTemplate` model line 8)
```typescript
category: 'therapy' | 'consultation' | 'checkup' | 'exercise' | 'education' | 'assessment' | 'group_session' | 'follow_up'
```

**Mechanism 3: Direct Foreign Keys** (`CalendarEvent` model)
```typescript
exerciseId?: number;  // If set, it's an exercise event
// Could add: mealPlanId, vitalTypeId, etc.
```

**Proposed Detection Function:**
```typescript
function detectEventCompletionType(
  event: CalendarEvent,
  calendar: Calendar,
  template?: EventTemplate
): 'exercise' | 'meal' | 'vitals' | 'medication' | 'sleep' | 'hydration' | 'general' {

  // Priority 1: Direct foreign key reference
  if (event.exerciseId) return 'exercise';

  // Priority 2: Calendar type
  if (calendar.type === 'exercise') return 'exercise';
  if (calendar.type === 'diet') return 'meal';
  if (calendar.type === 'vitals') return 'vitals';
  if (calendar.type === 'medications') return 'medication';

  // Priority 3: Event template category
  if (template?.category === 'exercise') return 'exercise';

  // Priority 4: Check title/description keywords
  const titleLower = event.title.toLowerCase();
  if (titleLower.includes('meal') || titleLower.includes('diet')) return 'meal';
  if (titleLower.includes('vital') || titleLower.includes('bp') || titleLower.includes('heart rate')) return 'vitals';
  if (titleLower.includes('medication') || titleLower.includes('dose')) return 'medication';
  if (titleLower.includes('sleep')) return 'sleep';
  if (titleLower.includes('water') || titleLower.includes('hydration')) return 'hydration';

  return 'general';
}
```

---

### 3.3 Form Variant Specifications

#### 📋 Form 1: Exercise Completion
**Trigger:** `eventType === 'exercise'`
**Current Status:** Partially exists (lines 1697-1850)
**Needs Expansion:** Add vitals panels

**Form Sections:**

**A. Performance Score** (✅ EXISTS line 1659)
- Dropdown: 0, 4, 6, 8 points
- Saves to: `calendar_events.performanceScore` + `exercise_logs.performanceScore`

**B. Pre-Exercise Vitals** (❌ ADD)
```typescript
<div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
  <h3>Pre-Exercise Vitals</h3>
  <div className="grid grid-cols-2 gap-4">
    <input label="BP Systolic" value={preBpSystolic} />
    <input label="BP Diastolic" value={preBpDiastolic} />
    <input label="Heart Rate" value={preHeartRate} />
    <input label="O2 Saturation" value={preOxygenSat} />
  </div>
</div>
```

**C. During-Exercise Vitals** (❌ ADD)
```typescript
<div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
  <h3>During Exercise</h3>
  <div className="grid grid-cols-2 gap-4">
    <input label="BP Systolic (peak)" value={duringBpSystolic} />
    <input label="BP Diastolic (peak)" value={duringBpDiastolic} />
    <input label="HR Average" value={duringHeartRateAvg} />
    <input label="HR Max" value={duringHeartRateMax} />
  </div>
</div>
```

**D. Post-Exercise Vitals** (❌ ADD)
```typescript
<div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
  <h3>Post-Exercise Recovery (5 min after)</h3>
  <div className="grid grid-cols-2 gap-4">
    <input label="BP Systolic" value={postBpSystolic} />
    <input label="BP Diastolic" value={postBpDiastolic} />
    <input label="Heart Rate" value={postHeartRate} />
    <input label="O2 Saturation" value={postOxygenSat} />
  </div>
</div>
```

**E. Activity Metrics** (✅ EXISTS line 1715)
- Keep existing: intensity, duration, distance, steps, laps, elevation, calories
- ❌ ADD: `perceivedExertion` (Borg RPE 1-10 slider)

**F. Timestamps** (❌ ADD)
```typescript
<input type="datetime-local" label="Exercise Start Time" value={startedAt} />
```

**Dual Save Handler:**
```typescript
const handleCompleteExercise = async () => {
  // 1. Update calendar event
  await api.updateEvent(eventId, {
    status: 'completed',
    performanceScore,
    durationMinutes,
    // summary metrics
  });

  // 2. Create exercise log
  await api.createExerciseLog({
    userId,
    exerciseId: event.exerciseId,
    completedAt: new Date(),
    preBpSystolic, preBpDiastolic, preHeartRate, preOxygenSat,
    duringBpSystolic, duringBpDiastolic, duringHeartRateAvg, duringHeartRateMax,
    postBpSystolic, postBpDiastolic, postHeartRate, postOxygenSat,
    distanceMiles, laps, steps, elevationFeet,
    durationMinutes, caloriesBurned, perceivedExertion,
    startedAt,
    // ... all Phase 1 fields
  });
};
```

---

#### 📋 Form 2: Meal Completion
**Trigger:** `eventType === 'meal'`
**Status:** Needs creation
**Use Case:** Therapist schedules "Follow Mediterranean Diet" or "Log Lunch"

**Form Sections:**

**A. Meal Basic Info**
```typescript
<select label="Meal Type">
  <option>Breakfast</option>
  <option>Lunch</option>
  <option>Dinner</option>
  <option>Snack</option>
</select>
<input type="datetime-local" label="Meal Time" />
```

**B. Food Items** (Use existing food database)
```typescript
<FoodSearchAutocomplete
  onSelectFood={addFoodItem}
  database={foodDatabase} // 253 items with ratings
/>
<div>
  {selectedFoods.map(food => (
    <FoodItemRow
      food={food}
      onRemove={removeFoodItem}
      onPortionChange={updatePortion}
    />
  ))}
</div>
```

**C. Compliance Check**
```typescript
<div className="bg-green-50 p-4">
  <label>Did this meal follow your prescribed diet plan?</label>
  <select value={dietCompliance}>
    <option value="yes">Yes, fully compliant</option>
    <option value="mostly">Mostly compliant</option>
    <option value="partial">Partially compliant</option>
    <option value="no">Not compliant</option>
  </select>
</div>
```

**D. Nutrition Summary** (Auto-calculated from food items)
```typescript
<div className="grid grid-cols-3 gap-2">
  <div>Calories: {totalCalories}</div>
  <div>Sodium: {totalSodium}mg</div>
  <div>Protein: {totalProtein}g</div>
</div>
```

**Dual Save:**
```typescript
await api.updateEvent(eventId, { status: 'completed', notes });
await api.createMeal({
  userId,
  mealType,
  mealTime,
  foodItems: selectedFoods,
  notes,
});
```

---

#### 📋 Form 3: Vitals Check Completion
**Trigger:** `eventType === 'vitals'`
**Status:** Needs creation
**Use Case:** Therapist schedules "Morning BP Check" or "Pre-appointment vitals"

**Form Sections:** (Similar to existing Vitals logging page)
```typescript
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <input label="BP Systolic" value={bpSystolic} />
    <input label="BP Diastolic" value={bpDiastolic} />
    <input label="Heart Rate" value={heartRate} />
    <input label="O2 Saturation" value={oxygenSat} />
    <input label="Weight (lbs)" value={weight} />
    <input label="Temperature (°F)" value={temperature} />
    <input label="Blood Glucose" value={bloodGlucose} />
  </div>
  <textarea label="Notes" value={notes} />
</div>
```

**Dual Save:**
```typescript
await api.updateEvent(eventId, { status: 'completed' });
await api.createVital({
  userId,
  timestamp: new Date(),
  bloodPressureSystolic: bpSystolic,
  bloodPressureDiastolic: bpDiastolic,
  heartRate,
  oxygenSaturation: oxygenSat,
  weight,
  temperature,
  bloodGlucose,
  notes,
});
```

---

#### 📋 Form 4: Medication Dose Completion
**Trigger:** `eventType === 'medication'`
**Status:** Needs creation
**Use Case:** Scheduled medication reminder

**Form Sections:**
```typescript
<div className="space-y-4">
  <div>
    <label>Medication</label>
    <p className="font-bold">{event.medicationName}</p>
    <p className="text-sm">Prescribed Dose: {prescribedDose}</p>
  </div>

  <select label="Status" value={status}>
    <option value="taken">Taken as prescribed</option>
    <option value="taken_late">Taken (late)</option>
    <option value="missed">Missed this dose</option>
    <option value="skipped">Intentionally skipped</option>
  </select>

  {status === 'taken' && (
    <input type="datetime-local" label="Actual Time Taken" value={actualTime} />
  )}

  <textarea label="Side Effects / Notes" value={notes} />
</div>
```

**Dual Save:**
```typescript
await api.updateEvent(eventId, { status: 'completed' });
await api.createMedicationLog(medicationId, {
  status,
  takenAt: actualTime,
  notes,
});
```

---

#### 📋 Form 5: Sleep Log Completion
**Trigger:** `eventType === 'sleep'`
**Status:** Sleep hours field exists (line 1624), needs expansion

**Current:** Single input for sleep hours
**Needs:** Full sleep quality tracking

**Expanded Form:**
```typescript
<div className="space-y-4">
  <input type="number" label="Hours Slept" value={hoursSlept} step="0.5" />

  <div className="grid grid-cols-2 gap-4">
    <input type="time" label="Bedtime" value={bedtime} />
    <input type="time" label="Wake Time" value={wakeTime} />
  </div>

  <div>
    <label>Sleep Quality (1-10)</label>
    <input type="range" min="1" max="10" value={sleepQuality} />
    <span>{sleepQuality}/10</span>
  </div>

  <input type="number" label="Times Woken Up" value={interruptions} />

  <textarea label="Notes" placeholder="Dreams, discomfort, etc." value={notes} />
</div>
```

**Dual Save:**
```typescript
await api.updateEvent(eventId, {
  status: 'completed',
  sleepHours: hoursSlept
});
await api.createSleepLog({
  userId,
  date: eventDate,
  hoursSlept,
  bedtime,
  wakeTime,
  sleepQuality,
  interruptions,
  notes,
});
```

---

#### 📋 Form 6: Hydration Log Completion
**Trigger:** `eventType === 'hydration'`
**Status:** Needs creation
**Table:** `hydration_logs` (created in Phase 1)

**Form:**
```typescript
<div className="space-y-4">
  <input
    type="number"
    label="Water Intake (ounces)"
    value={totalOunces}
    step="8"
  />

  <div className="bg-blue-50 p-3 rounded">
    <p className="text-sm">Daily Target: {targetOunces} oz</p>
    <p className="text-sm">Progress: {(totalOunces/targetOunces*100).toFixed(0)}%</p>
  </div>

  <textarea label="Notes" value={notes} />
</div>
```

**Dual Save:**
```typescript
await api.updateEvent(eventId, { status: 'completed' });
await api.createHydrationLog({
  userId,
  date: eventDate,
  totalOunces,
  targetOunces: calculateTarget(patientWeight), // Weight × 0.5
  notes,
});
```

---

#### 📋 Form 7: General Event Completion
**Trigger:** `eventType === 'general'`
**Status:** Simple completion form

**Form:**
```typescript
<div className="space-y-4">
  <div>
    <label>Completion Status</label>
    <select value={status}>
      <option value="completed">Completed</option>
      <option value="partially_completed">Partially Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>

  <textarea
    label="Session Notes"
    placeholder="What happened during this event?"
    value={notes}
    rows={4}
  />
</div>
```

**Save:** Updates calendar event only
```typescript
await api.updateEvent(eventId, { status, notes });
```

---

## 4. Backend API Endpoints Required

### 4.1 Exercise Logs - 🚨 CRITICAL MISSING

#### ❌ POST /api/exercise-logs
**Purpose:** Create exercise log entry with all Phase 1 vitals
**Authentication:** Required
**Request Body:**
```typescript
{
  userId: number;
  exerciseId?: number;
  prescriptionId?: number;
  completedAt: Date;

  // Pre-exercise vitals
  preBpSystolic?: number;
  preBpDiastolic?: number;
  preHeartRate?: number;
  preOxygenSat?: number;

  // During-exercise vitals
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
  startedAt?: Date;
  durationMinutes?: number;
  perceivedExertion?: number; // Borg 1-10

  // Performance
  performanceScore?: number; // 0, 2, 4, 6, 8

  notes?: string;
}
```

**Response:** ExerciseLog object with auto-calculated `postSurgeryDay`

**Controller:** New file `backend/src/controllers/exerciseLogsController.ts`

---

#### ❌ GET /api/exercise-logs
**Purpose:** Query exercise logs with filters
**Query Params:**
- `userId` - Filter by patient
- `exerciseId` - Filter by exercise type
- `startDate` / `endDate` - Date range
- `prescriptionId` - Logs for specific prescription

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 5,
      "exerciseId": 12,
      "completedAt": "2025-01-15T10:30:00Z",
      "postSurgeryDay": 45,
      "preBpSystolic": 118,
      "preBpDiastolic": 78,
      "preHeartRate": 68,
      "preOxygenSat": 98,
      "duringHeartRateAvg": 132,
      "duringHeartRateMax": 158,
      "postHeartRate": 88,
      "distanceMiles": 2.3,
      "steps": 4800,
      "durationMinutes": 28,
      "perceivedExertion": 6,
      "performanceScore": 6,
      "exercise": {
        "id": 12,
        "name": "Treadmill Walking",
        "category": "cardio"
      }
    }
  ]
}
```

---

#### ❌ PUT /api/exercise-logs/:id
**Purpose:** Update exercise log (corrections, adding missing data)
**Body:** Partial ExerciseLog object
**Response:** Updated ExerciseLog

---

#### ❌ DELETE /api/exercise-logs/:id
**Purpose:** Delete log entry
**Authorization:** Only creator or therapist

---

### 4.2 Hydration Logs - 🚨 MISSING

#### ❌ POST /api/hydration-logs
**Purpose:** Log daily hydration
**Request Body:**
```typescript
{
  userId: number;
  date: Date; // Date only, not datetime
  totalOunces: number;
  targetOunces?: number;
  notes?: string;
}
```
**Response:** HydrationLog with auto-calculated `postSurgeryDay`

**Note:** `postSurgeryDay` auto-calculated by trigger (Phase 1 ✅)

---

#### ❌ GET /api/hydration-logs
**Query Params:**
- `userId`
- `startDate` / `endDate`

**Controller:** New `backend/src/controllers/hydrationLogsController.ts`

---

### 4.3 Daily Scores - 🚨 MISSING

#### ❌ POST /api/daily-scores
**Purpose:** Create/update daily score entry
**Request Body:**
```typescript
{
  userId: number;
  scoreDate: Date;
  exerciseScore?: number; // 0-100
  nutritionScore?: number;
  medicationScore?: number;
  sleepScore?: number;
  vitalsScore?: number;
  hydrationScore?: number;
  notes?: string;
}
```
**Response:** DailyScore with auto-calculated `totalDailyScore` and `postSurgeryDay`

---

#### ❌ GET /api/daily-scores
**Query Params:**
- `userId`
- `startDate` / `endDate`
- `minScore` / `maxScore`

**Controller:** New `backend/src/controllers/dailyScoresController.ts`

---

### 4.4 Update Routes File

**File:** `backend/src/routes/api.ts`
**Add at line 174:**
```typescript
// ========== EXERCISE LOGS ROUTES ==========
router.get('/exercise-logs', exerciseLogsController.getExerciseLogs);
router.post('/exercise-logs', exerciseLogsController.createExerciseLog);
router.get('/exercise-logs/stats', exerciseLogsController.getExerciseLogStats);
router.get('/exercise-logs/:id', exerciseLogsController.getExerciseLog);
router.put('/exercise-logs/:id', exerciseLogsController.updateExerciseLog);
router.delete('/exercise-logs/:id', exerciseLogsController.deleteExerciseLog);

// ========== HYDRATION LOGS ROUTES ==========
router.get('/hydration-logs', hydrationLogsController.getHydrationLogs);
router.post('/hydration-logs', hydrationLogsController.createHydrationLog);
router.get('/hydration-logs/stats', hydrationLogsController.getHydrationStats);
router.get('/hydration-logs/date/:date', hydrationLogsController.getHydrationLogByDate);
router.get('/hydration-logs/:id', hydrationLogsController.getHydrationLog);
router.put('/hydration-logs/:id', hydrationLogsController.updateHydrationLog);
router.delete('/hydration-logs/:id', hydrationLogsController.deleteHydrationLog);

// ========== DAILY SCORES ROUTES ==========
router.get('/daily-scores', dailyScoresController.getDailyScores);
router.post('/daily-scores', dailyScoresController.createOrUpdateDailyScore);
router.get('/daily-scores/stats', dailyScoresController.getDailyScoreStats);
router.get('/daily-scores/trends', dailyScoresController.getTrends);
router.get('/daily-scores/date/:date', dailyScoresController.getDailyScoreByDate);
router.get('/daily-scores/:id', dailyScoresController.getDailyScore);
router.delete('/daily-scores/:id', dailyScoresController.deleteDailyScore);
```

---

### 4.5 Frontend API Service Updates

**File:** `frontend/src/services/api.ts`
**Add at line 495:**

```typescript
// ==================== EXERCISE LOGS ENDPOINTS ====================
async createExerciseLog(data: CreateExerciseLogInput): Promise<ExerciseLog> {
  const response = await this.api.post<ExerciseLog>('exercise-logs', data);
  return response.data;
}

async getExerciseLogs(filters?: {
  userId?: number;
  exerciseId?: number;
  startDate?: string;
  endDate?: string;
  prescriptionId?: number
}): Promise<ExerciseLog[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId.toString());
  if (filters?.exerciseId) params.append('exerciseId', filters.exerciseId.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.prescriptionId) params.append('prescriptionId', filters.prescriptionId.toString());

  const response = await this.api.get<ApiResponse<ExerciseLog[]>>(`exercise-logs?${params.toString()}`);
  return response.data.data;
}

async updateExerciseLog(id: number, data: Partial<CreateExerciseLogInput>): Promise<ExerciseLog> {
  const response = await this.api.put<ExerciseLog>(`exercise-logs/${id}`, data);
  return response.data;
}

async deleteExerciseLog(id: number): Promise<void> {
  await this.api.delete(`exercise-logs/${id}`);
}

// ==================== HYDRATION LOGS ENDPOINTS ====================
async createHydrationLog(data: CreateHydrationLogInput): Promise<HydrationLog> {
  const response = await this.api.post<HydrationLog>('hydration-logs', data);
  return response.data;
}

async getHydrationLogs(filters?: { userId?: number; startDate?: string; endDate?: string }): Promise<HydrationLog[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await this.api.get<ApiResponse<HydrationLog[]>>(`hydration-logs?${params.toString()}`);
  return response.data.data;
}

// ==================== DAILY SCORES ENDPOINTS ====================
async createOrUpdateDailyScore(data: CreateDailyScoreInput): Promise<DailyScore> {
  const response = await this.api.post<DailyScore>('daily-scores', data);
  return response.data;
}

async getDailyScores(filters?: { userId?: number; startDate?: string; endDate?: string }): Promise<DailyScore[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await this.api.get<ApiResponse<DailyScore[]>>(`daily-scores?${params.toString()}`);
  return response.data.data;
}
```

---

## 5. Firebase Migration Considerations

### 5.1 Current PostgreSQL Architecture

**Tables Created in Phase 1:**
- `vitals_samples` with postSurgeryDay + trigger
- `meal_entries` with postSurgeryDay + trigger
- `sleep_logs` with postSurgeryDay + trigger
- `medication_logs` with postSurgeryDay + trigger
- `exercise_logs` with postSurgeryDay + 20 vitals fields + trigger
- `hydration_logs` with postSurgeryDay + trigger
- `daily_scores` with postSurgeryDay + trigger

**PostgreSQL-Specific Features Used:**
1. **Triggers** - Auto-calculate postSurgeryDay
2. **ENUM types** - For status fields
3. **Foreign key constraints** - Referential integrity
4. **Date arithmetic** - `date1::DATE - date2::DATE` returns INTEGER days
5. **DECIMAL types** - Precise numeric storage

---

### 5.2 Firebase/Firestore Equivalent Design

#### Collections Structure
```
users/
  {userId}/
    profile: { name, email, role, surgeryDate }

    vitals/
      {vitalId}: {
        timestamp,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        heartRate,
        oxygenSaturation,
        postSurgeryDay: calculated_field,
        createdAt
      }

    meals/
      {mealId}: {
        mealTime,
        mealType,
        foodItems: [],
        postSurgeryDay: calculated_field,
        createdAt
      }

    exerciseLogs/
      {logId}: {
        exerciseId,
        completedAt,
        postSurgeryDay: calculated_field,
        preBpSystolic, preBpDiastolic, preHeartRate, preOxygenSat,
        duringHeartRateAvg, duringHeartRateMax, duringBpSystolic, duringBpDiastolic,
        postBpSystolic, postBpDiastolic, postHeartRate, postOxygenSat,
        distanceMiles, laps, steps, elevationFeet, caloriesBurned,
        perceivedExertion, performanceScore,
        createdAt
      }

    sleepLogs/
      {logId}: { date, hoursSlept, sleepQuality, postSurgeryDay, createdAt }

    medicationLogs/
      {logId}: { medicationId, status, takenAt, postSurgeryDay, createdAt }

    hydrationLogs/
      {logId}: { date, totalOunces, targetOunces, postSurgeryDay, createdAt }

    dailyScores/
      {date}: {
        scoreDate,
        postSurgeryDay,
        exerciseScore, nutritionScore, medicationScore,
        sleepScore, vitalsScore, hydrationScore,
        totalDailyScore: calculated_field
      }

    calendars/
      {calendarId}: {
        name, type, color, isActive

        events/
          {eventId}: {
            title, description, startTime, endTime,
            status, exerciseId, eventTemplateId,
            performanceScore, sleepHours,
            exerciseIntensity, distanceMiles, laps, steps,
            createdAt, updatedAt
          }
      }
```

#### Trigger Replacement: Cloud Functions

**Firebase Function: Calculate Post-Surgery Day**
```typescript
// functions/src/calculatePostSurgeryDay.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const calculatePostSurgeryDay = (timestamp: Date, surgeryDate: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((timestamp.getTime() - surgeryDate.getTime()) / oneDay);
  return diffDays;
};

export const onVitalsCreate = functions.firestore
  .document('users/{userId}/vitals/{vitalId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;

    // Get user's surgery date
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const surgeryDate = userDoc.data()?.profile?.surgeryDate;

    if (!surgeryDate) return;

    const vitalData = snap.data();
    const postSurgeryDay = calculatePostSurgeryDay(
      vitalData.timestamp.toDate(),
      surgeryDate.toDate()
    );

    // Update the document with calculated field
    return snap.ref.update({ postSurgeryDay });
  });

// Repeat pattern for all collections:
// onMealCreate, onExerciseLogCreate, onSleepLogCreate, etc.
```

#### ENUM Type Replacement

**PostgreSQL:**
```sql
status ENUM('scheduled', 'completed', 'cancelled', 'missed')
```

**Firebase:** Use validation rules
```javascript
// firestore.rules
match /users/{userId}/calendars/{calendarId}/events/{eventId} {
  allow write: if request.resource.data.status in
    ['scheduled', 'completed', 'cancelled', 'missed'];
}
```

#### Foreign Key Replacement

**PostgreSQL:**
```sql
exerciseId INTEGER REFERENCES exercises(id)
```

**Firebase:** Store reference path or ID
```typescript
{
  exerciseId: "exercise_12",
  // Or use Firestore reference:
  exerciseRef: admin.firestore().doc('exercises/exercise_12')
}
```

---

### 5.3 Migration-Ready Backend Architecture

**Current Backend Structure:**
```
backend/src/
  models/           # Sequelize models (PostgreSQL)
  controllers/      # Business logic
  routes/           # API endpoints
  middleware/       # Auth, validation
```

**Migration-Ready Structure:**
```
backend/src/
  models/
    postgresql/     # Current Sequelize models
    firestore/      # Future Firestore models

  database/
    postgresql.ts   # Current connection
    firestore.ts    # Future connection

  controllers/      # DB-agnostic business logic
    exerciseLogsController.ts  # Uses repository pattern

  repositories/     # Data access layer (abstraction)
    postgresql/
      ExerciseLogRepository.ts
    firestore/
      ExerciseLogRepository.ts

  routes/           # Unchanged
```

**Repository Pattern Example:**
```typescript
// repositories/IExerciseLogRepository.ts
interface IExerciseLogRepository {
  create(data: CreateExerciseLogInput): Promise<ExerciseLog>;
  findById(id: number | string): Promise<ExerciseLog | null>;
  findByUserId(userId: number, filters?: Filters): Promise<ExerciseLog[]>;
  update(id: number | string, data: Partial<ExerciseLog>): Promise<ExerciseLog>;
  delete(id: number | string): Promise<void>;
}

// repositories/postgresql/ExerciseLogRepository.ts
class PostgreSQLExerciseLogRepository implements IExerciseLogRepository {
  async create(data: CreateExerciseLogInput): Promise<ExerciseLog> {
    return await ExerciseLogModel.create(data);
  }
  // ... other methods
}

// repositories/firestore/ExerciseLogRepository.ts
class FirestoreExerciseLogRepository implements IExerciseLogRepository {
  async create(data: CreateExerciseLogInput): Promise<ExerciseLog> {
    const docRef = admin.firestore()
      .collection('users')
      .doc(data.userId.toString())
      .collection('exerciseLogs')
      .doc();

    await docRef.set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: docRef.id, ...data };
  }
  // ... other methods
}

// Database selection via environment variable
const repository = process.env.DB_TYPE === 'firestore'
  ? new FirestoreExerciseLogRepository()
  : new PostgreSQLExerciseLogRepository();
```

**Controller (DB-agnostic):**
```typescript
// controllers/exerciseLogsController.ts
import { getExerciseLogRepository } from '../repositories/factory';

export const createExerciseLog = async (req: Request, res: Response) => {
  try {
    const repository = getExerciseLogRepository(); // Factory pattern
    const log = await repository.create(req.body);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Benefits:**
1. ✅ Can switch databases with ENV variable
2. ✅ Both databases can run simultaneously (migration period)
3. ✅ Test suite works with both
4. ✅ No frontend changes needed
5. ✅ Gradual migration (table by table)

---

### 5.4 Migration Checklist

**Phase 1: Preparation (Current)**
- [x] Use repository pattern for new endpoints
- [ ] Create Firestore data models
- [ ] Write Cloud Functions for postSurgeryDay calculation
- [ ] Set up Firebase project

**Phase 2: Parallel Operation**
- [ ] Configure dual-write (PostgreSQL + Firestore)
- [ ] Run data sync jobs
- [ ] Verify data consistency

**Phase 3: Cutover**
- [ ] Switch read operations to Firestore
- [ ] Disable PostgreSQL writes
- [ ] Decommission PostgreSQL

---

## 6. Complete Field Mapping Reference

### 6.1 Exercise Log Fields

| Field Name | Type | Source | Destination | Notes |
|------------|------|--------|-------------|-------|
| **Performance** |
| performanceScore | INTEGER | CalendarPage form line 1669 | `exercise_logs.performanceScore` + `calendar_events.performanceScore` | 0=no show, 4=completed, 6=met goals, 8=exceeded |
| | | | | |
| **Pre-Exercise Vitals** | | | | ❌ NOT CURRENTLY COLLECTED |
| preBpSystolic | INTEGER | NEW FORM NEEDED | `exercise_logs.preBpSystolic` | Resting BP before exercise |
| preBpDiastolic | INTEGER | NEW FORM NEEDED | `exercise_logs.preBpDiastolic` | |
| preHeartRate | INTEGER | NEW FORM NEEDED | `exercise_logs.preHeartRate` | Resting HR |
| preOxygenSat | INTEGER | NEW FORM NEEDED | `exercise_logs.preOxygenSat` | O2 at rest (should be >95%) |
| | | | | |
| **During-Exercise Vitals** | | | | ⚠️ PARTIALLY COLLECTED |
| duringHeartRateAvg | INTEGER | CalendarPage line 1820 | `exercise_logs.duringHeartRateAvg` + `calendar_events.heartRateAvg` | ✅ Form exists |
| duringHeartRateMax | INTEGER | CalendarPage line 1833 | `exercise_logs.duringHeartRateMax` + `calendar_events.heartRateMax` | ✅ Form exists |
| duringBpSystolic | INTEGER | NEW FORM NEEDED | `exercise_logs.duringBpSystolic` | Peak BP during activity |
| duringBpDiastolic | INTEGER | NEW FORM NEEDED | `exercise_logs.duringBpDiastolic` | |
| | | | | |
| **Post-Exercise Vitals** | | | | ❌ NOT CURRENTLY COLLECTED |
| postBpSystolic | INTEGER | NEW FORM NEEDED | `exercise_logs.postBpSystolic` | Recovery BP (5 min after) |
| postBpDiastolic | INTEGER | NEW FORM NEEDED | `exercise_logs.postBpDiastolic` | |
| postHeartRate | INTEGER | NEW FORM NEEDED | `exercise_logs.postHeartRate` | Recovery HR |
| postOxygenSat | INTEGER | NEW FORM NEEDED | `exercise_logs.postOxygenSat` | Recovery O2 |
| | | | | |
| **Activity Metrics** | | | | ✅ FORMS EXIST |
| distanceMiles | DECIMAL(10,2) | CalendarPage line 1756 | `exercise_logs.distanceMiles` + `calendar_events.distanceMiles` | ✅ |
| laps | INTEGER | CalendarPage line 1788 | `exercise_logs.laps` + `calendar_events.laps` | ✅ |
| steps | INTEGER | CalendarPage line 1772 | `exercise_logs.steps` + `calendar_events.steps` | ✅ |
| elevationFeet | INTEGER | CalendarPage line 1804 | `exercise_logs.elevationFeet` + `calendar_events.elevationFeet` | ✅ |
| durationMinutes | INTEGER | CalendarPage line 1739 | `exercise_logs.durationMinutes` + `calendar_events.durationMinutes` | ✅ |
| caloriesBurned | INTEGER | CalendarPage line 1850 (approx) | `exercise_logs.caloriesBurned` + `calendar_events.caloriesBurned` | ✅ |
| exerciseIntensity | INTEGER | CalendarPage line 1723 | `exercise_logs.exerciseIntensity` + `calendar_events.exerciseIntensity` | ✅ 1-10 scale |
| perceivedExertion | INTEGER | NEW FORM NEEDED | `exercise_logs.perceivedExertion` | ❌ Borg RPE scale 1-10 |
| | | | | |
| **Timestamps** | | | | |
| startedAt | TIMESTAMP | NEW FORM NEEDED | `exercise_logs.startedAt` | ❌ Precise start time |
| completedAt | TIMESTAMP | Auto (submission time) | `exercise_logs.completedAt` | ✅ Auto-set on submit |
| | | | | |
| **Metadata** | | | | |
| exerciseId | INTEGER | CalendarEvent.exerciseId | `exercise_logs.exerciseId` | ✅ FK to exercises table |
| userId | INTEGER | Current user session | `exercise_logs.userId` | ✅ Auto-set from auth |
| prescriptionId | INTEGER | CalendarEvent.prescriptionId (if exists) | `exercise_logs.prescriptionId` | Optional FK |
| postSurgeryDay | INTEGER | Auto-calculated by trigger | `exercise_logs.postSurgeryDay` | ✅ Phase 1 trigger |
| notes | TEXT | CalendarPage line 1869 (approx) | `exercise_logs.notes` + `calendar_events.exerciseNotes` | ✅ |

**Summary:**
- ✅ Collected: 10 fields
- ❌ Missing: 10 fields (vitals, timestamps, RPE)
- Total Phase 1 fields: 20

---

## 7. Implementation Priority & Effort Estimates

### Phase 3.1: Backend API Endpoints (CRITICAL)
**Effort:** 6-8 hours
**Files to Create:**
1. `backend/src/controllers/exerciseLogsController.ts` (250 lines)
2. `backend/src/controllers/hydrationLogsController.ts` (180 lines)
3. `backend/src/controllers/dailyScoresController.ts` (200 lines)

**Files to Update:**
4. `backend/src/routes/api.ts` (add 25 lines)
5. `frontend/src/services/api.ts` (add 100 lines)
6. `frontend/src/types/index.ts` (add type definitions)

**Testing:**
- Manual API testing with Postman/Thunder Client
- Verify postSurgeryDay auto-calculation
- Test error handling

---

### Phase 3.2: Expand Exercise Completion Form (HIGH PRIORITY)
**Effort:** 4-6 hours
**File:** `frontend/src/pages/CalendarPage.tsx`

**Changes:**
1. Add state variables for missing vitals (lines 60-70):
   ```typescript
   const [preBpSystolic, setPreBpSystolic] = useState<string>('');
   const [preBpDiastolic, setPreBpDiastolic] = useState<string>('');
   // ... 10 more vitals fields
   const [perceivedExertion, setPerceivedExertion] = useState<string>('');
   const [startedAt, setStartedAt] = useState<string>('');
   ```

2. Add form sections (after line 1850):
   - Pre-exercise vitals panel (blue theme)
   - During-exercise vitals panel (orange theme)
   - Post-exercise vitals panel (green theme)
   - Perceived exertion slider
   - Started timestamp picker

3. Update `handleUpdateExerciseMetrics()` (line 726):
   ```typescript
   const handleUpdateExerciseMetrics = async () => {
     // Update calendar event
     await api.updateEvent(selectedEvent.id, {
       status: 'completed',
       performanceScore,
       durationMinutes,
       // ... existing metrics
     });

     // NEW: Create exercise log
     await api.createExerciseLog({
       userId,
       exerciseId: selectedEvent.exerciseId,
       completedAt: new Date(),
       preBpSystolic: parseInt(preBpSystolic),
       preBpDiastolic: parseInt(preBpDiastolic),
       // ... all Phase 1 fields
     });
   };
   ```

---

### Phase 3.3: Adaptive Form Component (MEDIUM PRIORITY)
**Effort:** 8-10 hours
**New Component:** `frontend/src/components/EventCompletionForm.tsx`

**Structure:**
```typescript
interface EventCompletionFormProps {
  event: CalendarEvent;
  calendar: Calendar;
  template?: EventTemplate;
  onComplete: () => void;
  onCancel: () => void;
}

export function EventCompletionForm({ event, calendar, template, onComplete, onCancel }: EventCompletionFormProps) {
  const eventType = detectEventCompletionType(event, calendar, template);

  return (
    <div>
      {eventType === 'exercise' && <ExerciseCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'meal' && <MealCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'vitals' && <VitalsCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'medication' && <MedicationCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'sleep' && <SleepCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'hydration' && <HydrationCompletionForm event={event} onComplete={onComplete} />}
      {eventType === 'general' && <GeneralCompletionForm event={event} onComplete={onComplete} />}
    </div>
  );
}
```

**Sub-components to create:**
1. `ExerciseCompletionForm.tsx` (400 lines)
2. `MealCompletionForm.tsx` (300 lines)
3. `VitalsCompletionForm.tsx` (200 lines)
4. `MedicationCompletionForm.tsx` (150 lines)
5. `SleepCompletionForm.tsx` (180 lines)
6. `HydrationCompletionForm.tsx` (120 lines)
7. `GeneralCompletionForm.tsx` (100 lines)

---

### Phase 3.4: Wire Charts to Real Data (LOW PRIORITY - PHASE 4)
**Effort:** 12-16 hours
**Can be done incrementally after forms work**

**Files to update:**
- `ExercisesPage.tsx` - Replace simulated data with API calls
- `SleepPage.tsx` - Add postSurgeryDay filtering
- `MealsPage.tsx` - Add postSurgeryDay filtering
- `MedicationsPage.tsx` - Add postSurgeryDay filtering
- `DashboardPage.tsx` - Wire to daily_scores table

---

## 8. Testing Plan

### 8.1 Backend API Tests

**Exercise Logs:**
- [ ] POST /api/exercise-logs with complete data
- [ ] POST with minimal data (required fields only)
- [ ] GET /api/exercise-logs with various filters
- [ ] Verify postSurgeryDay auto-calculation
- [ ] PUT /api/exercise-logs/:id
- [ ] DELETE /api/exercise-logs/:id
- [ ] Authorization checks (patient can only access own logs)

**Hydration Logs:**
- [ ] POST /api/hydration-logs
- [ ] GET with date range filters
- [ ] Verify postSurgeryDay trigger
- [ ] targetOunces calculation (weight × 0.5)

**Daily Scores:**
- [ ] POST /api/daily-scores
- [ ] Verify totalDailyScore calculation
- [ ] GET with score range filters
- [ ] Upsert behavior (update if exists)

---

### 8.2 Frontend Form Tests

**Exercise Completion:**
- [ ] Form renders when clicking exercise event
- [ ] All vitals fields accept valid input
- [ ] Performance score dropdown works
- [ ] Perceived exertion slider (1-10)
- [ ] Dual save succeeds (calendar event + exercise log)
- [ ] Error handling for API failures
- [ ] Form clears after successful submit

**Adaptive Forms:**
- [ ] Exercise event → shows exercise form
- [ ] Meal event → shows meal form
- [ ] Vitals event → shows vitals form
- [ ] Medication event → shows medication form
- [ ] Sleep event → shows sleep form
- [ ] Hydration event → shows hydration form
- [ ] General event → shows simple completion form

---

### 8.3 Integration Tests

**End-to-End Workflow:**
1. [ ] Therapist creates exercise prescription for patient
2. [ ] Exercise appears on patient calendar
3. [ ] Patient completes exercise with all vitals
4. [ ] Calendar event updates to 'completed'
5. [ ] Exercise log created in database
6. [ ] postSurgeryDay calculated correctly
7. [ ] Charts on ExercisesPage display new data
8. [ ] Daily score updates with exercise score

---

## 9. Documentation Requirements

### 9.1 API Documentation (Swagger/OpenAPI)

Create: `backend/docs/api-spec.yaml`

**Include:**
- All new endpoints (exercise-logs, hydration-logs, daily-scores)
- Request/response schemas
- Authentication requirements
- Query parameter descriptions
- Error response codes

---

### 9.2 User Guide

Create: `USER_GUIDE_COMPLETION_FORMS.md`

**Sections:**
1. How to complete different event types
2. Understanding vitals measurements (BP, HR, O2)
3. Perceived exertion scale explanation
4. When to take pre/during/post vitals
5. Screenshot guides for each form type

---

### 9.3 Developer Guide

Create: `DEVELOPER_GUIDE_ADAPTIVE_FORMS.md`

**Sections:**
1. How to add new event types
2. Adaptive form architecture
3. Dual storage pattern
4. Firebase migration strategy
5. Testing guidelines

---

## 10. Risk Assessment & Mitigation

### 10.1 High Risk Items

**Risk 1: Form Complexity**
- **Issue:** 7 different form variants = high maintenance
- **Mitigation:** Shared components, consistent styling, thorough testing

**Risk 2: Dual Storage Consistency**
- **Issue:** Calendar event + log table must stay in sync
- **Mitigation:** Database transactions, error rollback, reconciliation jobs

**Risk 3: Vitals Data Validity**
- **Issue:** Invalid vitals (BP 300/150) could skew charts
- **Mitigation:** Form validation, safe range warnings, therapist review flags

**Risk 4: Firebase Migration**
- **Issue:** Complex multi-month migration with data consistency risks
- **Mitigation:** Repository pattern NOW, parallel operation period, extensive testing

---

### 10.2 Medium Risk Items

**Risk 5: Performance with Large Datasets**
- **Issue:** Queries for 1+ year of exercise logs could be slow
- **Mitigation:** Database indexing, pagination, caching

**Risk 6: Mobile Responsiveness**
- **Issue:** Large vitals forms may not fit mobile screens
- **Mitigation:** Responsive design, multi-step wizards on mobile

---

## 11. Success Criteria

### Phase 3 Complete When:
- [x] Phase 2 documentation complete
- [ ] All 3 backend controllers created (exercise-logs, hydration-logs, daily-scores)
- [ ] All API routes working and tested
- [ ] Exercise completion form expanded with all Phase 1 vitals fields
- [ ] Dual storage working (calendar events + exercise logs)
- [ ] postSurgeryDay auto-calculation verified for all tables
- [ ] At least 1 complete end-to-end workflow tested (therapist prescribes → patient completes → data flows → charts display)

### Phase 4 (Future):
- [ ] All 7 adaptive forms implemented
- [ ] All 86 charts wired to real data
- [ ] Mobile responsive
- [ ] Firebase migration complete
- [ ] Production deployment

---

## Appendix A: File Structure

```
Heart-Recovery-Calender/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── exerciseLogsController.ts        ❌ CREATE
│   │   │   ├── hydrationLogsController.ts       ❌ CREATE
│   │   │   ├── dailyScoresController.ts         ❌ CREATE
│   │   │   ├── exercisesController.ts           ✅ EXISTS
│   │   │   └── ...
│   │   ├── models/
│   │   │   ├── ExerciseLog.ts                   ✅ EXISTS (Phase 1)
│   │   │   ├── HydrationLog.ts                  ✅ EXISTS (Phase 1)
│   │   │   ├── DailyScore.ts                    ✅ EXISTS (Phase 1)
│   │   │   ├── CalendarEvent.ts                 ✅ EXISTS
│   │   │   ├── Calendar.ts                      ✅ EXISTS
│   │   │   └── ...
│   │   ├── routes/
│   │   │   └── api.ts                           ⚠️ UPDATE
│   │   └── migrations/
│   │       └── 20251030*.js                     ✅ EXISTS (Phase 1)
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CalendarPage.tsx                 ⚠️ UPDATE (expand form)
│   │   │   ├── ExercisesPage.tsx                ⚠️ UPDATE (wire charts)
│   │   │   ├── VitalsPage.tsx                   ✅ DONE
│   │   │   ├── MealsPage.tsx                    ⚠️ UPDATE
│   │   │   ├── SleepPage.tsx                    ⚠️ UPDATE
│   │   │   └── MedicationsPage.tsx              ⚠️ UPDATE
│   │   ├── components/
│   │   │   ├── EventCompletionForm.tsx          ❌ CREATE
│   │   │   ├── ExerciseCompletionForm.tsx       ❌ CREATE
│   │   │   ├── MealCompletionForm.tsx           ❌ CREATE
│   │   │   ├── VitalsCompletionForm.tsx         ❌ CREATE
│   │   │   ├── MedicationCompletionForm.tsx     ❌ CREATE
│   │   │   ├── SleepCompletionForm.tsx          ❌ CREATE
│   │   │   ├── HydrationCompletionForm.tsx      ❌ CREATE
│   │   │   └── GeneralCompletionForm.tsx        ❌ CREATE
│   │   ├── services/
│   │   │   └── api.ts                           ⚠️ UPDATE
│   │   └── types/
│   │       └── index.ts                         ⚠️ UPDATE
│   └── ...
├── PHASE1_COMPLETE.md                            ✅ EXISTS
├── PHASE2_COMPREHENSIVE_FINDINGS.md              ✅ THIS FILE
└── README.md
```

---

## Appendix B: Glossary

**Terms:**
- **postSurgeryDay**: Integer representing days since cardiac surgery (Day 0 = surgery date)
- **Borg RPE**: Rate of Perceived Exertion scale (1-10), 1=very light, 10=max effort
- **Vitals Window**: Safe ranges for vital signs specific to patient's recovery phase
- **Dual Storage**: Saving summary to calendar_events + detailed data to specialized log table
- **Adaptive Form**: UI that changes based on event type
- **Performance Score**: 0-2-4-6-8 scale for exercise session success

**Database Tables:**
- `exercise_logs`: Detailed exercise completion data with vitals
- `calendar_events`: Scheduled events with summary metrics
- `daily_scores`: Aggregated 6-category scoring per day

---

**END OF PHASE 2 COMPREHENSIVE FINDINGS**

**Status:** Phase 2 Complete ✅
**Next:** Commit to git, proceed to Phase 3 implementation
**Priority:** Create backend API endpoints → Expand exercise form → Wire dual storage
