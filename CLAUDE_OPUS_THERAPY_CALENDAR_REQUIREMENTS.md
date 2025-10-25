# HEART RECOVERY THERAPY CALENDAR - DETAILED REQUIREMENTS FOR CLAUDE OPUS

## 🎯 PRIMARY FOCUS: PATIENT-THERAPIST RELATIONSHIP

This is NOT a general health tracking app. This is a **specialized therapy calendar** focused on:
- Physical therapy progression during cardiac recovery
- Patient-therapist communication and data sharing
- Progressive rehabilitation routines
- Real-world activity reintegration
- Medical provider oversight and alerts

---

## ⚠️ WHAT'S ALREADY DONE (DON'T REBUILD)

- ✅ Backend API (PostgreSQL + Express + TypeScript)
- ✅ Basic glassmorphic frontend with Tailwind CSS
- ✅ Login/Register/Authentication
- ✅ Basic pages: Dashboard, Calendar, Meals, Medications
- ✅ UI components: GlassCard, Button, Input, Modal, Select

**Repository**: https://github.com/johndesautels1/Heart-Recovery-Calender.git
**Local**: C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar\

---

## 🎨 DESIGN REQUIREMENTS

### Color Scheme: Dark Cobalt Blue
**Match the design from Heart-Recovery-Pro-Clean and Heartbeat apps**

Update Tailwind theme to use dark cobalt blue:
```typescript
// frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary: Dark Cobalt Blue theme
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1e3a8a', // Dark cobalt blue base
          600: '#1e40af',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#0f172a',
        },
        // Activity status colors
        activity: {
          accomplished: '#10b981', // Green
          caution: '#fbbf24',      // Yellow
          notToDo: '#ef4444',      // Red
        },
        // Glass morphism overlay
        glass: 'rgba(30, 58, 138, 0.1)', // Cobalt blue tinted glass
      },
      backgroundImage: {
        'gradient-cobalt': 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
      },
    },
  },
}
```

Apply dark cobalt gradient to main layout background.

---

## 🚫 DE-PRIORITIZE VITALS

**DO NOT focus on vitals tracking** - The user already has:
- Advanced vitals display page in Heart-Recovery-Pro-Clean
- High-end glassmorphic dashboard with charts (like Airbus A380)
- Advanced analytics page

**Keep the Vitals page minimal** - just basic logging capability for reference, not the primary focus.

---

## 📊 ANALYTICS: THERAPIST-SPECIFIC CHARTS

### What to Build:

#### 1. Therapist Dashboard Charts
Focus on **therapy progression metrics**, NOT general vitals:

**Physical Therapy Compliance:**
- Weekly completion rate of prescribed routines
- Heatmap: Which routines were completed on which days
- Progress bar: Current week in recovery cycle
- Comparison chart: Prescribed vs Actual routines completed

**Activity Reintegration Progress:**
- Timeline view: When patient achieved daily living milestones
  - First shower alone
  - First stair climb
  - First laundry
  - First park walk
- Color-coded progress ladder (green = mastered, yellow = attempted with caution, red = issue occurred)

**Patient Targets & Goals:**
- Goal cards: "Walk 15 minutes by Week 4" (with progress %)
- Weekly targets set by therapist
- Patient achievement badges
- Milestone celebrations

**Issue & Alert Dashboard:**
- Red flag alerts: Missed medications
- Yellow caution: Activities done with issues
- Timeline of incidents with date/time/activity
- Filter by severity

#### 2. Patient View of Same Charts
Patients see simplified versions of therapist charts:
- Their own progress
- Upcoming goals
- Achievements unlocked
- What therapist prescribed vs what they completed

---

## 🍽️ DIET: COMPREHENSIVE MEAL DROPDOWNS

### Requirements:

Patients enter **what they actually ate** at each meal in the calendar.

#### Meal Entry Interface:

**Date & Time:** Click calendar date → Select meal time (Breakfast, Lunch, Dinner, Snack)

**Food Categories Dropdown:**
1. **Proteins:**
   - Fish (Salmon, Tuna, Cod, Halibut, Tilapia, Sardines)
   - Poultry (Chicken breast, Turkey, Duck)
   - Red Meat (Lean beef, Pork loin, Lamb - with caution flags)
   - Plant-based (Tofu, Tempeh, Beans, Lentils, Chickpeas)
   - Eggs

2. **Vegetables:**
   - Leafy Greens (Spinach, Kale, Arugula, Romaine, Swiss chard)
   - Cruciferous (Broccoli, Cauliflower, Brussels sprouts, Cabbage)
   - Root Vegetables (Carrots, Sweet potato, Beets, Turnips)
   - Others (Peppers, Tomatoes, Cucumbers, Zucchini, Eggplant, Onions, Garlic)

3. **Fruits:**
   - Berries (Blueberries, Strawberries, Raspberries, Blackberries)
   - Citrus (Oranges, Grapefruit, Lemons, Limes)
   - Stone Fruits (Peaches, Plums, Cherries, Apricots)
   - Others (Apples, Bananas, Grapes, Pears, Melons)

4. **Grains:**
   - Whole Grains (Brown rice, Quinoa, Oatmeal, Barley, Bulgur, Farro)
   - Whole Wheat (Whole wheat bread, Whole wheat pasta, Whole wheat tortillas)
   - Other Grains (White rice - with caution, White bread - caution)

5. **Dairy & Alternatives:**
   - Low-fat Dairy (Skim milk, Low-fat yogurt, Low-fat cottage cheese)
   - Plant-based (Almond milk, Soy milk, Oat milk, Coconut milk)
   - Cheese (specify type and amount - caution on high-fat)

6. **Fats & Oils:**
   - Healthy Fats (Olive oil, Avocado, Nuts - Almonds, Walnuts, Pistachios)
   - Omega-3 Sources (Flaxseed, Chia seeds, Fish oil)
   - Caution Fats (Butter, Coconut oil, Palm oil) - red flag

7. **Condiments & Seasonings:**
   - Herbs & Spices (all green)
   - Sauces (Low-sodium soy sauce, Vinegar, Mustard, Hot sauce)
   - Caution (High-sodium sauces, Mayo, Ranch - yellow/red flags)

8. **Beverages:**
   - Water, Herbal tea, Green tea, Coffee (moderate)
   - Caution: Alcohol (yellow), Sugary drinks (red), Energy drinks (red)

9. **Processed Foods (Flag Most as Caution/Red):**
   - Frozen meals, Canned soups, Deli meats, Chips, Cookies, etc.

#### Implementation:
- **Multi-select checkboxes** for each category
- **Portion size dropdown** (small, medium, large)
- **Automatic nutritional calculation** (if food DB available)
- **Color coding:**
  - Green: Heart-healthy choices
  - Yellow: Moderate - watch portions
  - Red: Not recommended - therapist gets alert if consumed

#### Calendar Display:
- Each meal logged shows as colored dot or badge on calendar date
- Click date to see full meal breakdown
- Weekly summary: Compliance score based on heart-healthy choices

---

## 💊 MEDICATIONS: INTEGRATION WITH HEARTBEAT APP

### Requirements:

**Phase 1 (Build Now):**
- Manual medication entry in calendar
- Log when medication taken
- Alert (red) if medication missed
- Patient and therapist can both review medication adherence

**Phase 2 (Future Integration):**
- Medications auto-populate from **Physician Tab in Heartbeat app**
- Bidirectional sync: Updates in Heartbeat reflect here
- Cross-app medication timeline

### Calendar Medication Features:
- Daily medication checklist on calendar
- Check off when taken
- If not checked by scheduled time → red alert → text/email to patient
- Therapist dashboard shows missed medications
- Color code:
  - Green: Taken on time
  - Yellow: Taken late
  - Red: Missed

---

## 📹 TELECONFERENCING: ZOOM INTEGRATION (NOT PLACEHOLDER!)

### Requirements:

**ACTUALLY WIRE ZOOM API** - This is critical for telemedicine.

#### Backend Integration:

**Install Zoom SDK:**
```bash
npm install @zoom/meetingsdk
```

**Environment Variables:**
```
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
ZOOM_WEBHOOK_SECRET=your_webhook_secret
```

**Backend Endpoints:**
```typescript
// backend/src/routes/telehealth.ts (NEW)

POST   /api/telehealth/sessions          // Create Zoom meeting
GET    /api/telehealth/sessions          // Get scheduled sessions
GET    /api/telehealth/sessions/:id      // Get session details
POST   /api/telehealth/sessions/:id/join // Generate join URL with auth
PUT    /api/telehealth/sessions/:id      // Update session
DELETE /api/telehealth/sessions/:id      // Cancel session
POST   /api/telehealth/sessions/:id/notes // Add post-session notes
```

**Create Zoom Meeting Controller:**
```typescript
// backend/src/controllers/telehealthController.ts (NEW)

import axios from 'axios';
import jwt from 'jsonwebtoken';

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

// Generate Zoom JWT
function generateZoomToken() {
  const payload = {
    iss: process.env.ZOOM_API_KEY,
    exp: Date.now() + 5000,
  };
  return jwt.sign(payload, process.env.ZOOM_API_SECRET);
}

// Create Zoom meeting
export async function createZoomMeeting(req, res) {
  const { therapistId, patientId, scheduledTime, duration } = req.body;

  try {
    const token = generateZoomToken();

    // Call Zoom API to create meeting
    const response = await axios.post(
      `${ZOOM_API_BASE}/users/me/meetings`,
      {
        topic: `Therapy Session - Patient ${patientId}`,
        type: 2, // Scheduled meeting
        start_time: scheduledTime,
        duration,
        timezone: 'America/New_York',
        settings: {
          host_video: true,
          participant_video: true,
          waiting_room: true,
          join_before_host: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Save to database
    const session = await VideoSession.create({
      therapistId,
      patientId,
      scheduledTime,
      duration,
      zoomMeetingId: response.data.id,
      zoomJoinUrl: response.data.join_url,
      zoomStartUrl: response.data.start_url,
      status: 'scheduled',
    });

    res.json({ data: session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Zoom meeting' });
  }
}
```

**Database Model:**
```typescript
// backend/src/models/VideoSession.ts (NEW)

class VideoSession extends Model {
  public id!: number;
  public therapistId!: number;
  public patientId!: number;
  public scheduledTime!: Date;
  public duration!: number; // minutes
  public zoomMeetingId!: string;
  public zoomJoinUrl!: string;
  public zoomStartUrl!: string; // For therapist (host)
  public status!: string; // 'scheduled', 'completed', 'cancelled'
  public sessionNotes?: string; // Post-session notes
  public recordingUrl?: string; // If recorded
}
```

#### Frontend Integration:

**Install Zoom Web SDK:**
```bash
npm install @zoom/meetingsdk
```

**Create Video Session Component:**
```typescript
// frontend/src/components/telehealth/ZoomMeeting.tsx (NEW)

import { useEffect, useRef } from 'react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

export function ZoomMeeting({ sessionId, joinUrl, role }) {
  const meetingRef = useRef(null);

  useEffect(() => {
    const client = ZoomMtgEmbedded.createClient();

    client.init({
      zoomAppRoot: meetingRef.current,
      language: 'en-US',
    });

    // Join meeting
    client.join({
      sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
      signature: generateSignature(), // Generate on backend
      meetingNumber: sessionId,
      userName: role === 'therapist' ? 'Therapist' : 'Patient',
      userEmail: '',
      tk: '', // Registration token if required
    });

    return () => client.endMeeting();
  }, [sessionId]);

  return (
    <div className="w-full h-screen" ref={meetingRef} />
  );
}
```

**Schedule Session Page:**
```typescript
// frontend/src/pages/TelehealthPage.tsx (NEW)

- Calendar view of scheduled sessions
- "Schedule Session" button
- Session details modal with Zoom info
- "Join Session" button → Opens Zoom embedded or new tab
- Post-session notes form
```

### Cross-App Integration:
Sessions scheduled here should appear in:
- Heart-Recovery-Pro-Clean app
- Heartbeat app
- This therapy calendar

**Share data via:**
- Shared backend database
- Websocket events for real-time updates
- Or REST API calls between apps

---

## 🏋️ PHYSICAL THERAPY ROUTINES

### Requirements:

Therapists prescribe **progressive routines** that change as patient recovers.

#### Recovery Cycle Phases:
1. **Week 1-2: Hospital Recovery** (very light)
2. **Week 3-4: Early Home Recovery** (seated exercises)
3. **Week 5-8: Intermediate Recovery** (standing, light walking)
4. **Week 9-12: Advanced Recovery** (extended walking, light cardio)
5. **Week 13+: Full Reintegration** (all activities with monitoring)

#### Routine Categories:

**1. Cardio Reconditioning:**
- Week 1-2: Seated marching (1 min), Ankle pumps (20 reps)
- Week 3-4: Standing marching (2 min), Slow walking (5 min)
- Week 5-8: Treadmill walking (10-15 min), Stationary bike (10 min)
- Week 9-12: Extended walking (20-30 min), Light jogging intervals (5 min)
- Week 13+: Jogging (20 min), Swimming, Cycling

**2. Strength Training:**
- Week 1-2: Arm raises (no weights), Leg lifts (seated)
- Week 3-4: Resistance bands (light), Wall push-ups
- Week 5-8: Light dumbbells (2-5 lbs), Bodyweight squats
- Week 9-12: Moderate weights (5-10 lbs), Lunges, Planks
- Week 13+: Progressive weight training, Functional movements

**3. Flexibility & Balance:**
- Week 1-2: Seated stretches, Deep breathing
- Week 3-4: Standing stretches, Heel-to-toe walk
- Week 5-8: Yoga (gentle), Balance board
- Week 9-12: Advanced stretching, Single-leg stands
- Week 13+: Full yoga practice, Dynamic balance

**4. Core Strengthening:**
- Week 1-2: Pelvic tilts, Gentle twists (seated)
- Week 3-4: Bridge holds, Modified crunches
- Week 5-8: Planks (30 sec), Side planks
- Week 9-12: Full planks (1 min), Russian twists
- Week 13+: Advanced core circuit

#### Implementation:

**Therapist Prescription Interface:**
```typescript
// frontend/src/pages/TherapistPrescribeRoutine.tsx (NEW)

1. Select Patient
2. Select Current Recovery Week (1-20+)
3. System auto-suggests routines for that week
4. Therapist can customize:
   - Add/remove exercises
   - Adjust duration, reps, sets
   - Set frequency (daily, 3x/week, etc.)
   - Add special instructions/cautions
5. Save prescription
6. Routine appears in patient's calendar with checkboxes
```

**Patient Calendar View:**
```typescript
// On calendar date, patient sees:

📅 October 25, 2025 - Week 6 Recovery

✅ Cardio:
  ☐ Treadmill walking - 15 min
  ☐ Stationary bike - 10 min

✅ Strength:
  ☐ Resistance bands - Arms (10 reps x 3 sets)
  ☐ Bodyweight squats (10 reps)

✅ Flexibility:
  ☐ Stretching routine - 10 min

// Patient checks off each exercise as completed
// If all completed → Date turns GREEN
// If partial → Date turns YELLOW
// If none → Date turns RED (alert sent to therapist)
```

**Dropdown/Checkbox System:**
- Therapist selects from predefined exercise library
- Exercises organized by category and recovery phase
- Each exercise has:
  - Name
  - Instructions
  - Video link (optional)
  - Heart rate target zone
  - Caution notes
  - Expected duration/reps/sets

---

## 🚶 NON-STRUCTURED PHYSICAL ACTIVITIES

### Requirements:

Patients relearn daily living and real-world activities.

#### Activity Categories:

**1. Daily Living Activities (ADLs):**
- Bathing/Showering
- Dressing
- Grooming
- Toileting
- Eating
- Transfers (bed to chair, etc.)

**2. Instrumental Activities (IADLs):**
- Laundry
- Light housekeeping
- Meal preparation
- Shopping
- Using phone/computer
- Managing medications

**3. Mobility Activities:**
- Walking on flat surface
- Climbing stairs
- Walking outdoors
- Walking on uneven terrain
- Getting in/out of car

**4. Lifting & Carrying:**
- Lifting light objects (< 5 lbs)
- Lifting moderate objects (5-15 lbs)
- Lifting heavy objects (> 15 lbs) - RED CAUTION
- Carrying groceries
- Taking out trash

**5. Recreational Activities:**
- Walking in park
- Light gardening
- Swimming
- Bicycling
- Dancing
- Golf
- Tennis (later stages)

**6. Advanced Activities:**
- Jogging
- Running
- Weight training
- Sports
- High-intensity activities

#### Implementation:

**Activity Logging Interface:**
```typescript
// frontend/src/components/activities/ActivityLogger.tsx (NEW)

Patient clicks calendar date → "Log Activity"

1. Select Activity Category (dropdown)
2. Select Specific Activity (dropdown or search)
3. Duration/Intensity (if applicable)
4. Status (dropdown):
   - ✅ "Accomplished without issue" → GREEN
   - ⚠️ "Did with caution/minor issue" → YELLOW
   - 🚫 "Attempted but couldn't complete" → RED
   - 🛑 "Told not to do by provider" → RED FLAG
5. Notes: "What happened? Any symptoms?"
6. Heart rate during activity (optional)
7. Save

// Activity auto-logs to calendar with color
```

**Color-Coded Calendar Display:**
```
Green badge: "✓ Showered alone"
Yellow badge: "⚠ Climbed stairs (short of breath)"
Red badge: "✗ Tried jogging (chest discomfort)"
```

**Progression Tracking:**
- Timeline view showing when patient achieved each milestone
- Therapist dashboard shows activity progression
- Celebrations when patient completes major milestone

---

## 🏷️ MULTIPLE ADVANCED LEGENDS

### Requirements:

Each section/tab needs its own color-coded legend.

#### Calendar Legend 1: Activity Status
- 🟢 Green: Accomplished
- 🟡 Yellow: Caution
- 🔴 Red: Issue/Not To Do

#### Calendar Legend 2: Event Types
- 🟣 Purple: Medication
- 🔵 Blue: Therapy Appointment
- 🟢 Green: Physical Therapy Routine
- 🟠 Orange: Diet/Meal
- 🔴 Red: Medical Alert
- ⚪ Grey: Other

#### Calendar Legend 3: Compliance
- ✅ Fully Compliant Day (all tasks done)
- ⚠️ Partially Compliant (some tasks missed)
- ❌ Non-Compliant (multiple tasks missed)

#### Calendar Legend 4: Recovery Phase
- Phase 1 (Week 1-2): Light blue background
- Phase 2 (Week 3-4): Blue background
- Phase 3 (Week 5-8): Darker blue
- Phase 4 (Week 9-12): Navy blue
- Phase 5 (Week 13+): Cobalt blue

#### Implementation:
```typescript
// frontend/src/components/calendar/CalendarLegend.tsx (NEW)

<div className="flex flex-wrap gap-4">
  <LegendSection title="Activity Status">
    <LegendItem color="green" label="Accomplished" />
    <LegendItem color="yellow" label="Caution" />
    <LegendItem color="red" label="Issue" />
  </LegendSection>

  <LegendSection title="Event Types">
    <LegendItem color="purple" label="Medication" />
    <LegendItem color="blue" label="Appointment" />
    <LegendItem color="green" label="PT Routine" />
    <LegendItem color="orange" label="Meal" />
  </LegendSection>

  {/* More legends */}
</div>
```

Toggle legends on/off to show/hide specific event types on calendar.

---

## 🚨 ALERT & WARNING SYSTEM

### Requirements:

**Patient Alerts (Text/Email + In-App):**

1. **Medication Missed:**
   - If medication not checked off by scheduled time → RED ALERT
   - Text message: "ALERT: You missed your 8am Lisinopril. Please take now or contact your doctor."
   - Email: Same message
   - In-app: Red notification badge + banner

2. **Activity Issue Reported:**
   - If patient logs activity with RED or YELLOW status → Alert therapist
   - Patient sees: "Your therapist has been notified about the issue during stair climbing."

3. **Appointment Reminder:**
   - 24 hours before appointment: Email/text reminder
   - 1 hour before: Final reminder

4. **Therapy Routine Overdue:**
   - If prescribed routine not completed by end of day → Yellow warning
   - If missed 2+ days in row → Red alert to therapist

**Therapist/Medical Provider Alerts:**

1. **Dashboard Alert Feed:**
   - Real-time feed of patient alerts
   - Filter by severity: Critical (red), Moderate (yellow), Info (blue)
   - Sort by patient, date, type

2. **Medication Non-Compliance:**
   - Alert when patient misses medication
   - Shows: Patient name, medication, date/time missed, # of times missed this week

3. **Activity Issues:**
   - Alert when patient reports issue during activity
   - Shows: Patient name, activity, date/time, issue description, heart rate if logged

4. **Concerning Patterns:**
   - Multiple yellow/red activities in short time → Escalated alert
   - Multiple missed medications → Escalated alert
   - Alert includes summary and timeline

#### Alert Dashboard Implementation:

```typescript
// frontend/src/pages/TherapistAlertDashboard.tsx (NEW)

<div className="grid grid-cols-3 gap-4">
  {/* Critical Alerts */}
  <GlassCard className="border-l-4 border-red-500">
    <h3>🔴 Critical Alerts (5)</h3>
    <AlertItem
      patient="John Smith"
      type="Medication Missed"
      time="2 hours ago"
      details="Missed Lisinopril 10mg at 8:00 AM"
      severity="critical"
    />
    {/* More alerts */}
  </GlassCard>

  {/* Moderate Alerts */}
  <GlassCard className="border-l-4 border-yellow-500">
    <h3>⚠️ Moderate Alerts (12)</h3>
    {/* Alerts */}
  </GlassCard>

  {/* Info */}
  <GlassCard className="border-l-4 border-blue-500">
    <h3>ℹ️ Info (8)</h3>
    {/* Alerts */}
  </GlassCard>
</div>

{/* Timeline View */}
<GlassCard>
  <h3>Alert Timeline</h3>
  <Timeline events={alerts} />
</GlassCard>
```

**Alert Backend:**
```typescript
// backend/src/services/alertService.ts (NEW)

import twilio from 'twilio'; // For SMS
import nodemailer from 'nodemailer'; // For email

export async function sendMedicationMissedAlert(userId, medication) {
  const user = await User.findByPk(userId);

  // Create alert record
  await Alert.create({
    userId,
    type: 'medication_missed',
    severity: 'critical',
    message: `Missed ${medication.name} at ${medication.scheduledTime}`,
    timestamp: new Date(),
  });

  // Send SMS
  const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  await twilioClient.messages.create({
    body: `ALERT: You missed your ${medication.scheduledTime} ${medication.name}. Please take now or contact your doctor.`,
    from: process.env.TWILIO_PHONE,
    to: user.phoneNumber,
  });

  // Send email
  const transporter = nodemailer.createTransport({/* config */});
  await transporter.sendMail({
    from: 'alerts@heartrecovery.com',
    to: user.email,
    subject: 'Medication Alert',
    html: `<strong>ALERT:</strong> You missed your ${medication.scheduledTime} ${medication.name}. Please take now or contact your doctor.`,
  });

  // Notify therapist
  const therapist = await getPatientTherapist(userId);
  await notifyTherapist(therapist, {
    type: 'patient_medication_missed',
    patientName: user.name,
    medication,
  });
}
```

---

## 🔗 CROSS-APP DATA INTEGRATION

### Requirements:

All three apps need to share data:
1. **Heart-Recovery-Pro-Clean** (main application)
2. **Heartbeat** (master application with physician tab)
3. **This Therapy Calendar**

### Integration Approach:

**Option 1: Shared Database (Recommended)**
- All apps connect to same PostgreSQL database
- Different tables/schemas for different app features
- Use database views for cross-app queries
- Real-time updates via PostgreSQL LISTEN/NOTIFY

**Option 2: Microservices with API Gateway**
- Each app is separate microservice
- API Gateway routes requests
- Apps call each other's APIs
- Event bus (Redis Pub/Sub) for real-time updates

**Option 3: Monorepo with Shared Backend**
- Single backend serving all three frontends
- Shared models, services, controllers
- Different frontend routes for each app
- Session sharing across apps

### Data to Share:

**From Heartbeat Physician Tab → Therapy Calendar:**
- Medications prescribed
- Lab results
- Doctor's notes
- Medical alerts

**From Therapy Calendar → Heart-Recovery-Pro-Clean:**
- Physical therapy progress
- Activity completion
- Telehealth session notes
- Diet logs

**From Heart-Recovery-Pro-Clean → Therapy Calendar:**
- Advanced vitals data
- Analytics charts
- Patient health trends

### Implementation:

**Shared API Endpoints:**
```typescript
// backend/src/routes/integration.ts (NEW)

// Get medications from Heartbeat
GET /api/integration/medications/:userId

// Sync therapy progress to Heart-Recovery-Pro
POST /api/integration/sync-therapy-progress

// Get vitals from Heart-Recovery-Pro
GET /api/integration/vitals/:userId

// Webhook endpoints for real-time updates
POST /api/integration/webhooks/medication-updated
POST /api/integration/webhooks/vitals-updated
```

**Frontend Integration:**
```typescript
// frontend/src/services/integration.ts (NEW)

export const integrationAPI = {
  // Get medications from Heartbeat app
  getMedicationsFromHeartbeat: (userId) =>
    api.get(`integration/medications/${userId}`),

  // Send therapy data to Heart-Recovery-Pro
  syncTherapyProgress: (data) =>
    api.post('integration/sync-therapy-progress', data),

  // Get vitals from Heart-Recovery-Pro
  getVitalsFromHeartRecoveryPro: (userId) =>
    api.get(`integration/vitals/${userId}`),
};
```

---

## 📋 UPDATED PRIORITIES FOR OPUS

### PRIORITY 1: Design Update to Dark Cobalt Blue
- Update Tailwind config with cobalt blue theme
- Apply dark cobalt gradient backgrounds
- Update glassmorphic overlay to cobalt tint
- Ensure all components use new color scheme

### PRIORITY 2: Therapy-Focused Calendar
- **Physical Therapy Routines:**
  - Recovery phase tracker (Week 1-20+)
  - Exercise library by phase
  - Therapist prescription interface
  - Patient routine checklist
  - Auto color-coding (green/yellow/red)

- **Activity Logging:**
  - Daily living activities (ADLs)
  - Mobility activities
  - Recreational activities
  - Status tracking (accomplished/caution/issue)
  - Timeline progression view

### PRIORITY 3: Advanced Legends & Color Coding
- Multiple legend system
- Toggle show/hide event types
- Activity status legend
- Event type legend
- Compliance legend
- Recovery phase legend

### PRIORITY 4: Alert System
- Backend: Twilio (SMS) + Nodemailer (email)
- Medication missed alerts
- Activity issue alerts
- Therapist dashboard alert feed
- Patient notification system
- Alert severity levels

### PRIORITY 5: Comprehensive Meal Dropdowns
- 9 food categories with extensive sub-items
- Multi-select checkboxes
- Portion sizes
- Auto nutritional calculation
- Color-coded choices (green/yellow/red)
- Weekly compliance summary

### PRIORITY 6: Zoom Telehealth Integration
- Zoom API integration (NOT placeholder)
- Create meeting endpoint
- Embedded Zoom component
- Schedule sessions
- Post-session notes
- Cross-app session visibility

### PRIORITY 7: Therapist-Specific Analytics
- PT compliance charts
- Activity reintegration timeline
- Patient target tracking
- Issue dashboard
- Progress comparison (prescribed vs actual)

### PRIORITY 8: Cross-App Integration
- Medication sync from Heartbeat
- Vitals from Heart-Recovery-Pro
- Shared backend or API gateway
- Webhook system for real-time updates

---

## 🚫 DO NOT BUILD (Already Exists Elsewhere)

- ❌ Advanced vitals tracking (exists in Heart-Recovery-Pro)
- ❌ High-end analytics dashboard (exists in Heart-Recovery-Pro)
- ❌ General health tracking (not the focus)
- ❌ Complex medication management (exists in Heartbeat physician tab)

---

## ✅ FINAL CHECKLIST

Before considering this done, ensure:
- [ ] Dark cobalt blue theme applied throughout
- [ ] Progressive PT routines with dropdowns working
- [ ] Non-structured activities with color-coding working
- [ ] Multiple calendar legends functional
- [ ] Alert system sending SMS/email for missed meds
- [ ] Therapist alert dashboard showing patient issues
- [ ] Comprehensive meal dropdowns with 200+ foods
- [ ] Zoom integration creating real meetings
- [ ] Therapist analytics showing PT-specific metrics
- [ ] Cross-app data flow (at least medication sync)
- [ ] Patient and therapist see appropriate views
- [ ] All data committed to git

---

## 🎯 SUMMARY

This is a **specialized therapy calendar** for cardiac rehabilitation, NOT a general health tracker. Focus on:
1. Patient-therapist relationship
2. Progressive physical therapy
3. Real-world activity reintegration
4. Medical provider oversight with alerts
5. Dark cobalt blue design matching other apps
6. Actual Zoom integration for telemedicine
7. Cross-app data sharing

**Repository**: https://github.com/johndesautels1/Heart-Recovery-Calender.git

Good luck building the world's most advanced cardiac therapy calendar! 🫀
