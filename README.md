# Heart Recovery Calendar

A comprehensive health tracking application designed for cardiac recovery patients and their therapists. Features include calendar management, vital signs tracking, medication management, meal planning, exercise prescriptions, QR code sharing, and more.

---

## ⚠️ FOR CLAUDE CODE ASSISTANTS - READ THIS FIRST

**🚨 MANDATORY:** Before working on this project, read:
**[`CLAUDE_WORKING_INSTRUCTIONS.md`](./CLAUDE_WORKING_INSTRUCTIONS.md)**

This document contains CRITICAL instructions including:
- Mandatory oath and commitments
- Patient = User architecture (ONE entity, not separate)
- Testing requirements before marking tasks done
- Git commit and backup procedures
- Session handoff procedures
- How to avoid mistakes that caused financial damage

**DO NOT START WORK WITHOUT READING THIS FILE.**

---

## 🔴 CRITICAL DATABASE ARCHITECTURE - READ THIS FIRST

### User = Patient Relationship (NOT Separate Entities)

**CRITICAL UNDERSTANDING:** Patients and Users are **THE SAME PERSON**, not different database entities. The `patients` table is an **EXTENDED PROFILE** for users with health tracking data, NOT a separate person record.

### Database Architecture

#### User Table (`users`)
```typescript
// Primary user account - EVERYONE is a User first
User {
  id: number                          // Primary key
  email: string                       // Login credential
  name: string                        // Display name
  role: 'patient' | 'therapist' | 'admin'  // User role
  surgeryDate?: Date                  // For patient users
  // ... other user account fields
}
```

#### Patient Table (`patients`)
```typescript
// EXTENDED HEALTH PROFILE - Links to User via userId
Patient {
  id: number                          // Patient profile ID
  userId?: number                     // 🔗 LINK TO USER ACCOUNT (users.id)
  therapistId: number                 // Therapist managing this patient

  // Extended health fields
  dateOfBirth?: Date
  heartConditions?: string[]
  baselineBpSystolic?: number
  ejectionFraction?: number
  // ... 60+ health-specific fields
}
```

### The Relationship

```
User (id=2, role='patient', name='John Doe')
  ↓ links to
Patient (id=1, userId=2, therapistId=5, heartConditions=['CAD'])
         ↑ managed by
User (id=5, role='therapist', name='Dr. Smith')
```

**Key Points:**
1. **User.id = Patient.userId** - Same person, different aspects of their data
2. **User** contains: login, role, basic info
3. **Patient** contains: medical history, vitals, prescriptions
4. **Query Pattern**: ALWAYS query User first, then JOIN Patient profile if exists

### ❌ WRONG Data Access Patterns

```typescript
// ❌ WRONG - Querying ONLY Patient table misses User data
const patient = await Patient.findOne({ where: { id: patientId }});
// Missing: user email, role, surgeryDate, etc.

// ❌ WRONG - Treating Patient as separate from User
if (patient.email) // ERROR: Patient table has no email field!

// ❌ WRONG - Looking for patient data without User context
const vitals = await VitalsSample.findAll({ where: { patientId }});
// Should use userId, not patientId!
```

### ✅ CORRECT Data Access Patterns

```typescript
// ✅ CORRECT - Query User, include Patient profile
const user = await User.findByPk(userId, {
  include: [{
    model: Patient,
    as: 'patientProfile',
    where: { userId: userId },
    required: false  // User might not have Patient profile yet
  }]
});

// Access user data: user.email, user.role, user.surgeryDate
// Access patient data: user.patientProfile.heartConditions

// ✅ CORRECT - Query vitals using userId (NOT patientId)
const vitals = await VitalsSample.findAll({
  where: { userId: user.id }  // VitalsSample.userId links to User.id
});

// ✅ CORRECT - Get medications using userId
const medications = await Medication.findAll({
  where: { userId: user.id }  // Medication.userId links to User.id
});
```

### Data Table Relationships

**User-Linked Tables (use `userId`):**
- `vitals_samples` - User's vital signs
- `medications` - User's medications
- `medication_logs` - User's medication doses
- `meal_entries` - User's meals
- `calendars` - User's calendars
- `calendar_events` - User's calendar events
- `exercise_logs` - User's exercise sessions
- `device_connections` - User's connected devices (Polar, Strava)
- `cia_reports` - User's AI health reports

**Patient-Profile Tables (use `patientId` from Patient.id):**
- `exercise_prescriptions` - Therapist-prescribed exercises
- `therapy_goals` - Therapist-set recovery goals
- (Patient table itself extends User with medical details)

### Why This Matters for Data Integrations

**Device Integration Example:**
```typescript
// ❌ WRONG - Device sync looks for Patient record
const patient = await Patient.findOne({ where: { polarDeviceId }});
const vitals = await VitalsSample.findAll({ where: { patientId: patient.id }});
// FAILS: VitalsSample.patientId doesn't exist! Uses userId!

// ✅ CORRECT - Device sync uses User + Patient profile
const deviceConnection = await DeviceConnection.findOne({
  where: { deviceType: 'polar' }
});
const user = await User.findByPk(deviceConnection.userId);
const vitals = await VitalsSample.create({
  userId: user.id,  // ✅ Correct foreign key
  heartRate: 72,
  // ...
});
```

### Role Hierarchy

```
User Roles:
├─ patient (role='patient')
│   └─ Can ONLY view their own data
│   └─ May have extended Patient profile (userId links to patients table)
│
├─ therapist (role='therapist')  ← Same as admin
│   └─ Can view their own data (they may also be patients)
│   └─ Can view ALL patients' data via dropdown selector
│   └─ Can create/manage exercise prescriptions
│
└─ admin (role='admin')  ← Same as therapist
    └─ Same permissions as therapist
    └─ Can view/manage all users
```

**Dual Role Example:**
```typescript
// Dr. Smith is BOTH therapist AND patient (had heart surgery)
User {
  id: 5,
  name: 'Dr. Smith',
  role: 'therapist',  // Can manage other patients
  surgeryDate: '2024-06-15'  // Also recovering from surgery
}

Patient {
  id: 10,
  userId: 5,  // Links to Dr. Smith's User account
  therapistId: 6,  // Dr. Jones manages Dr. Smith's recovery
  heartConditions: ['CABG'],
  baselineBpSystolic: 120
}

// Dr. Smith can:
// 1. View their OWN vitals/medications (userId=5)
// 2. View ALL their patients' data (therapistId=5 in patients table)
// 3. Toggle between "My Dashboard" and "Patient: John Doe"
```

### Migration Guide: Fixing Data Integration Issues

If you're experiencing missing data, check these common issues:

**1. Check Foreign Keys:**
```sql
-- ✅ Correct: Tables should link to users.id
ALTER TABLE vitals_samples ADD FOREIGN KEY (userId) REFERENCES users(id);
ALTER TABLE medications ADD FOREIGN KEY (userId) REFERENCES users(id);

-- ❌ Wrong: Don't create patientId foreign keys in vitals/medications
-- These should use userId, not patientId
```

**2. Fix API Endpoints:**
```typescript
// ❌ WRONG API - Returns only Patient data
GET /api/patients/:id
// Response: { id, therapistId, heartConditions, ... } // Missing email, role!

// ✅ CORRECT API - Returns User with Patient profile
GET /api/users/:id/profile
// Response: {
//   id, email, name, role, surgeryDate,
//   patientProfile: { heartConditions, baselineBpSystolic, ... }
// }
```

**3. Fix Frontend Data Fetching:**
```typescript
// ❌ WRONG - Separate queries causing data mismatches
const patient = await api.getPatient(patientId);
const vitals = await api.getVitals(patientId);  // FAILS: no patientId in vitals

// ✅ CORRECT - Single query with proper relationships
const userData = await api.getUserProfile(userId);
const vitals = await api.getVitals(userData.id);  // Uses userId
```

### Summary: The Golden Rules

1. **User is the primary entity** - Everyone has a User record first
2. **Patient is an extended profile** - Optional medical details linked via userId
3. **Query User first, JOIN Patient** - Never query Patient without User context
4. **Use userId for vitals/meds** - Not patientId
5. **Role determines permissions** - patient=view own, therapist/admin=view all
6. **Therapists can also be patients** - Dual roles are valid (userId appears in both User and Patient tables)

---

## 🐛 KNOWN ISSUES - REQUIRES IMMEDIATE ATTENTION

**Session Date: 2025-11-12**

### ❌ BROKEN FEATURES THAT MUST BE FIXED:

1. **CIA Page Calculator Sections - BROKEN AND REMOVED**
   - Location: `frontend/src/pages/CIAPage.tsx` (lines 1463-1865 in broken commits)
   - **Issue**: Attempted to add 4 medical calculators (Vascular Age, Framingham Risk, ASCVD Risk, Lifestyle Simulator)
   - **Why Broken**: Used `React.useState()` inside IIFE (Immediately Invoked Function Expression)
   - **Error**: Violates React Rules of Hooks - "Hooks can only be called at the top level of a component"
   - **Result**: Page crashes with blue screen, React error boundary triggered
   - **Current State**: Reverted to commit edc261f (HUD styling only, no calculators)
   - **To Fix**: Must move useState declarations to component top level OR remove calculator feature entirely
   - **Files Affected**:
     - `frontend/src/pages/CIAPage.tsx`
     - `frontend/src/utils/medicalCalculations.ts` (created but unused)

2. **Missing Optional Chaining on patientData**
   - **Issue**: Multiple locations accessing `patientData.medications`, `patientData.smokingStatus`, `patientData.diabetesStatus` without optional chaining
   - **Error**: "Cannot read property of undefined" when patientData is not loaded
   - **Impact**: Crashes when patient has no data or data hasn't loaded yet
   - **Required Fix**: Add optional chaining (`?.`) to all patientData accesses throughout CIA page

### ⚠️ LESSONS LEARNED:

1. **NEVER claim something works without testing it in the browser**
2. **NEVER add useState hooks inside nested functions or IIFEs**
3. **ALWAYS use optional chaining when accessing potentially undefined objects**
4. **ALWAYS verify code compiles AND runs before committing**
5. **User explicitly stated: "NO LYING" - violated multiple times this session**

### 📋 TASKS TO COMPLETE:

- [ ] Fix or remove medical calculator feature from CIA page
- [ ] Add comprehensive optional chaining to all patientData accesses
- [ ] Test CIA page with and without patient data loaded
- [ ] Ensure no React Hooks violations anywhere in the codebase
- [ ] Clean up `frontend/src/utils/medicalCalculations.ts` if calculators are removed

**DO NOT ATTEMPT TO "FIX" THESE WITHOUT UNDERSTANDING REACT HOOKS RULES.**

---

## 🎭 CRITICAL: TWO-ROLE SYSTEM (READ THIS!)

**THIS APPLICATION HAS EXACTLY TWO ROLES - DO NOT CREATE MORE:**

### 1. **Admin/Therapist Role** (Same Role, Same Permissions)
- **Admin and Therapist are THE SAME ROLE** - not two separate roles
- Can view their own health data (they are also patients)
- Can toggle/dropdown to view ANY patient's data
- **Default view:** Their own vitals/dashboards
- **Toggle/Dropdown:** Switch to view specific patient from alphabetical list
- Has management capabilities for all patients

### 2. **Patient/User Role** (Same Entity)
- **Patient and User are THE SAME ENTITY** - not two separate people
- Can ONLY view their own health data
- No patient selection dropdown (only their data exists)
- No toggle capability

### Implementation Rules:
```typescript
// ❌ WRONG - Treating admin and therapist as separate
if (user.role === 'admin' || user.role === 'therapist') { }

// ✅ CORRECT - They are the same role
if (user.role === 'admin' || user.role === 'therapist') {
  // Show: "Admin/Therapist View" (unified)
  // Default: Show their own data
  // Allow: Patient selector dropdown
}

// ✅ CORRECT - Patient is the user
if (user.role === 'patient') {
  // Show: "Patient" or just their name
  // Only their own data
}
```

### UI Components:
- **Patient Identifier Badge:** Shows whose data is being viewed
  - Admin/Therapist viewing their own: "John Doe (Admin/Therapist)"
  - Admin/Therapist viewing patient: "Jane Smith (Viewing as Admin/Therapist)"
  - Patient: "John Doe (Patient)"
- **Patient Selector:** Only visible to admin/therapist role
  - Dropdown with "My Vitals" as default
  - Alphabetical list of all patients

**This has been explained multiple times - DO NOT FORGET THIS AGAIN.**

---

## Features

### Patient Features
- 📅 **Calendar Management** - Track appointments, medications, meals, and exercises
- 💊 **Medication Tracking** - Manage medications with dosage logs and schedules
- ❤️ **Vital Signs** - Track heart rate, blood pressure, weight, temperature, and hydration
- 🍽️ **Meal Planning** - Log meals and track nutritional compliance with food database
- 📊 **Analytics Dashboard** - Visualize health trends and progress
- 📱 **Export Calendar** - Export to Google Calendar, Apple Calendar, Calendly, or JSON
- 📄 **Print Calendar** - Generate printable calendar views
- 📲 **QR Code Sharing** - Share calendar via QR code

### Therapist Features
- 👥 **Patient Management** - Manage multiple patients with surgery date tracking
- 🏃 **Exercise Library** - Create and manage exercise prescriptions with categories
- 📋 **Exercise Prescriptions** - Assign customized exercise programs to patients
- 📈 **Patient Progress** - Monitor patient compliance and recovery
- 🔄 **View Toggle** - Switch between therapist and patient views
- 📊 **Statistics** - View aggregated patient and prescription statistics
- 📲 **QR Patient Onboarding** - Generate QR codes for easy patient enrollment

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling with custom design system
- **React Router v6** for navigation
- **React Hook Form** with Zod validation
- **FullCalendar** for advanced calendar views
- **Chart.js** + **react-chartjs-2** for data visualization
- **React Query** (@tanstack/react-query) for server state management
- **qrcode.react** for QR code generation
- **date-fns** for date manipulation

### Backend
- **Node.js 18+** with Express
- **TypeScript** for type safety
- **Sequelize ORM** with PostgreSQL
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** enabled for frontend communication

## Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** or **yarn**
- **Git**

### Quick Start with Setup Script

**Windows:**
```bash
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar
setup.bat
```

**Linux/Mac:**
```bash
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. Install all dependencies (frontend + backend)
2. Create `.env` files from templates
3. Set up the PostgreSQL database
4. Run migrations
5. Start both servers

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api

### Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

#### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env` (see [Environment Variables](#environment-variables) for complete list):
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=heart_recovery_calendar
   DB_USER=postgres
   DB_PASSWORD=your_password

   # Server
   PORT=4000
   NODE_ENV=development

   # Security (CRITICAL - Generate secure key for production!)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # CORS
   CORS_ORIGIN=http://localhost:3000
   FRONTEND_URL=http://localhost:3000

   # Device Integrations (CRITICAL for heart rate monitoring)
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
   ```

4. Create PostgreSQL database:
   ```sql
   CREATE DATABASE heart_recovery_calendar;
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

6. Start server:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:4000/api

   # App Configuration
   VITE_APP_NAME=Heart Recovery Calendar
   VITE_APP_URL=http://localhost:3000
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

</details>

## 🚀 Cloning for Other Applications

This template is designed to be easily cloned and customized for other health tracking or calendar-based applications.

### Quick Clone Guide

```bash
# 1. Clone this repository with a new name
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git my-new-app
cd my-new-app

# 2. Remove existing git history and start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from Heart Recovery Calendar template"

# 3. Set new remote
git remote add origin your-new-repo-url
git push -u origin master

# 4. Run the customization script
node customize.js
```

### Customization Checklist

#### 1. Branding
- [ ] Update `VITE_APP_NAME` in `frontend/.env`
- [ ] Replace logo files in `frontend/public/`
- [ ] Update `package.json` name in both `frontend/` and `backend/`
- [ ] Customize colors in `frontend/src/index.css` (CSS custom properties)
- [ ] Update favicon and app icons

#### 2. Database
- [ ] Create new PostgreSQL database with unique name
- [ ] Update `DB_NAME` in `backend/.env`
- [ ] Run migrations: `cd backend && npm run migrate`

#### 3. Environment Variables
- [ ] Generate new `JWT_SECRET` (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Update all API URLs for your domain
- [ ] Configure any third-party service keys

#### 4. Features (Optional)
- [ ] Enable/disable features in `frontend/src/config/features.ts`
- [ ] Customize user roles in `backend/src/models/User.ts`
- [ ] Add custom models in `backend/src/models/`
- [ ] Add custom API routes in `backend/src/routes/`

### Customization Script

Run the interactive customization script:

```bash
node customize.js
```

This will prompt you for:
- Application name
- Database name
- Company/organization name
- Primary color scheme
- Features to enable/disable

## Database Schema

### Core Tables
- `Users` - User accounts (patients/therapists)
- `Calendars` - User calendars
- `Events` - Calendar events (appointments, meds, meals, exercises)
- `Patients` - Patient profiles (managed by therapists)
- `Medications` - Medication records
- `MedicationLogs` - Dose tracking
- `VitalsSamples` - Vital sign measurements
- `MealEntries` - Meal logs
- `Exercises` - Exercise library
- `ExercisePrescriptions` - Assigned exercises to patients
- `ExerciseLogs` - Exercise completion tracking
- `FoodCategories` - Food categorization
- `FoodItems` - Food database
- `TherapyGoals` - Recovery goals
- `Alerts` - System alerts

## API Documentation

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user (patient/therapist) | No |
| POST | `/api/auth/login` | Login with email/password | No |
| GET | `/api/auth/me` | Get current user info | Yes |

### Calendars
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendars` | List user's calendars |
| POST | `/api/calendars` | Create calendar |
| GET | `/api/calendars/:id` | Get calendar details |
| PUT | `/api/calendars/:id` | Update calendar |
| DELETE | `/api/calendars/:id` | Delete calendar |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (with filters) |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get event details |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| PATCH | `/api/events/:id/status` | Update event status |
| POST | `/api/events/:id/instances` | Get recurring instances |

### Medications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medications` | List medications |
| POST | `/api/medications` | Add medication |
| GET | `/api/medications/:id` | Get medication |
| PUT | `/api/medications/:id` | Update medication |
| DELETE | `/api/medications/:id` | Delete medication |
| POST | `/api/medications/:id/log-dose` | Log dose taken |
| GET | `/api/medications/schedule` | Get schedule |
| GET | `/api/medications/logs` | Get dose logs |

### Vitals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vitals` | List vitals |
| POST | `/api/vitals` | Add vital reading |
| GET | `/api/vitals/latest` | Get latest reading |
| GET | `/api/vitals/trends` | Get trend data |

### Meals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meals` | List meals |
| POST | `/api/meals` | Log meal |
| GET | `/api/meals/daily-summary` | Get daily summary |
| GET | `/api/meals/compliance` | Get compliance stats |

### Patients (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List patients |
| POST | `/api/patients` | Add patient |
| GET | `/api/patients/:id` | Get patient details |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |
| GET | `/api/patients/:id/post-op-week` | Get recovery week |

### Exercises (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exercises` | List exercises |
| POST | `/api/exercises` | Create exercise |
| GET | `/api/exercises/:id` | Get exercise |
| PUT | `/api/exercises/:id` | Update exercise |
| DELETE | `/api/exercises/:id` | Delete exercise |
| GET | `/api/exercises/categories/list` | Get categories |
| GET | `/api/exercises/stats` | Get statistics |

### Exercise Prescriptions (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exercise-prescriptions` | List prescriptions |
| POST | `/api/exercise-prescriptions` | Create prescription |
| GET | `/api/exercise-prescriptions/:id` | Get prescription |
| PUT | `/api/exercise-prescriptions/:id` | Update prescription |
| DELETE | `/api/exercise-prescriptions/:id` | Delete prescription |
| GET | `/api/exercise-prescriptions/:id/logs` | Get exercise logs |
| GET | `/api/exercise-prescriptions/stats` | Get statistics |

## Environment Variables

### Backend Environment Variables (`backend/.env`)

#### Required Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `DB_HOST` | PostgreSQL host | `localhost` | Production: use managed DB host |
| `DB_PORT` | PostgreSQL port | `5432` | Default PostgreSQL port |
| `DB_NAME` | Database name | `heart_recovery_calendar` | Must be created first |
| `DB_USER` | Database username | `postgres` | |
| `DB_PASSWORD` | Database password | `your_secure_password` | **Keep secret!** |
| `PORT` | Server port | `4000` | |
| `NODE_ENV` | Environment | `development` or `production` | Affects logging, CORS |
| `JWT_SECRET` | JWT signing key | `64_char_random_string` | **CRITICAL:** Generate with crypto.randomBytes(32).toString('hex') |
| `CORS_ORIGIN` | Allowed frontend URL | `http://localhost:3000` | Production: your domain |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:3000` | Used for OAuth callbacks |

#### Device Integration Variables (CRITICAL)

These integrations sync heart rate and fitness data - essential for patient monitoring.

**Strava API** (Heart rate & exercise data):
| Variable | Description | How to Get |
|----------|-------------|------------|
| `STRAVA_CLIENT_ID` | Strava application ID | Register at https://www.strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Strava secret key | From Strava API settings |
| `STRAVA_REDIRECT_URI` | OAuth callback URL | `http://localhost:4000/api/strava/callback` |

**Polar API** (Optional - Heart rate monitoring):
| Variable | Description | How to Get |
|----------|-------------|------------|
| `POLAR_CLIENT_ID` | Polar application ID | Register at https://admin.polaraccesslink.com/ |
| `POLAR_CLIENT_SECRET` | Polar secret key | From Polar developer portal |
| `POLAR_REDIRECT_URI` | OAuth callback URL | `http://localhost:4000/api/polar/callback` |

**Samsung Health API** (Optional - Fitness data):
| Variable | Description | How to Get |
|----------|-------------|------------|
| `SAMSUNG_CLIENT_ID` | Samsung Health app ID | Samsung Health developer portal |
| `SAMSUNG_CLIENT_SECRET` | Samsung Health secret | From Samsung developer console |
| `SAMSUNG_REDIRECT_URI` | OAuth callback URL | `http://localhost:4000/api/samsung/callback` |

#### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `DB_LOGGING` | SQL query logging | `false` | Set to `true` for debugging |
| `SMTP_HOST` | Email server host | - | For email notifications |
| `SMTP_PORT` | Email server port | `587` | |
| `SMTP_USER` | Email username | - | |
| `SMTP_PASS` | Email password | - | Use app-specific password |
| `EMAIL_FROM` | Sender email address | - | |
| `TWILIO_ACCOUNT_SID` | Twilio account ID | - | For SMS reminders |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - | |
| `TWILIO_PHONE_NUMBER` | Twilio phone | - | Format: +1234567890 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | 15 minutes |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000` | Production: your API domain |
| `VITE_APP_NAME` | Application name | `Heart Recovery Calendar` | Shown in UI |
| `VITE_APP_URL` | Frontend URL | `http://localhost:3000` | For sharing features |

### Generating Secure Secrets

**JWT_SECRET** (CRITICAL for security):
```bash
# Generate a secure 64-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Database Password**:
```bash
# Generate secure password
openssl rand -base64 32
```

### Environment-Specific Files

- `.env` - Your local development (gitignored, never commit!)
- `.env.example` - Template with no secrets (safe to commit)
- `.env.production` - Production values (keep secure!)
- `.env.test` - Test environment values

## User Roles

### Patient Role
- Access to personal health dashboard
- Calendar event management
- Medication tracking and logging
- Vital signs recording
- Meal logging
- View assigned exercise prescriptions
- Export/print calendar
- Generate QR code for calendar sharing

### Therapist Role
- All patient role features
- Patient management (add, edit, view patients)
- Exercise library management
- Exercise prescription creation and assignment
- Patient progress monitoring
- View aggregated statistics
- Toggle between therapist and patient views
- Generate patient onboarding QR codes

## QR Code Features

### Patient Calendar Sharing
Patients can generate a QR code that contains their calendar data:
- Navigate to Calendar page
- Click "Share" button
- Generate QR code
- Other users scan to import calendar

### Therapist Patient Onboarding
Therapists can generate QR codes for patient enrollment:
- Navigate to Patients page
- Click "Add Patient" → "Generate QR Code"
- Patient scans code to auto-register with therapist assignment

## Deployment

### Environment Variables for Production

**Backend (`backend/.env`):**
```env
# Database
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=heart_recovery_prod
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Server
PORT=4000
NODE_ENV=production

# Security (CRITICAL!)
JWT_SECRET=your_very_secure_random_64_char_string

# CORS
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Device Integrations (for heart rate monitoring)
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=https://api.your-domain.com/api/strava/callback

# Optional: Email notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@your-domain.com
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=https://api.your-domain.com/api
VITE_APP_NAME=Heart Recovery Calendar
VITE_APP_URL=https://your-domain.com
```

### Deployment Platforms

<details>
<summary>Vercel (Frontend)</summary>

1. Connect GitHub repository
2. Framework Preset: **Vite**
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variables
7. Deploy

</details>

<details>
<summary>Render (Backend + Database)</summary>

1. Create PostgreSQL database
2. Create Web Service
3. Build Command: `cd backend && npm install && npm run build`
4. Start Command: `cd backend && npm start`
5. Add environment variables
6. Deploy

</details>

<details>
<summary>Railway (Full Stack)</summary>

1. Connect GitHub repository
2. Add PostgreSQL plugin
3. Configure backend service:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Configure frontend service:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
5. Add environment variables
6. Deploy

</details>

## Development

### Project Structure
```
Heart-Recovery-Calendar/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validation
│   │   ├── config/           # DB config
│   │   └── server.ts         # Entry point
│   ├── migrations/           # DB migrations
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utilities
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── .env.example
│   └── package.json
├── setup.bat                 # Windows setup
├── setup.sh                  # Linux/Mac setup
├── customize.js              # Customization script
└── README.md
```

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

### Database Operations

**Create migration:**
```bash
cd backend
npx sequelize-cli migration:generate --name migration-name
```

**Run migrations:**
```bash
npm run migrate
```

**Rollback:**
```bash
npm run migrate:undo
```

**Seed database:**
```bash
npm run seed
```

## Operations & Troubleshooting

### Git Rollback Procedures

If you need to revert changes after a problematic deployment or update, follow these procedures:

#### 1. Rollback to Previous Commit (Soft Reset)

**Use when:** You want to undo recent commits but keep the file changes

```bash
# View commit history
git log --oneline -10

# Soft reset to specific commit (keeps changes staged)
git reset --soft <commit-hash>

# Or reset to previous commit
git reset --soft HEAD~1

# Verify status
git status

# If satisfied, force push (⚠️ only on feature branches)
git push origin <branch-name> --force
```

#### 2. Rollback to Previous Commit (Hard Reset)

**Use when:** You want to completely undo changes and discard all modifications

⚠️ **WARNING**: This permanently deletes uncommitted changes!

```bash
# View commit history
git log --oneline -10

# Create backup branch first (IMPORTANT!)
git branch backup-$(date +%Y%m%d-%H%M%S)

# Hard reset to specific commit (discards all changes)
git reset --hard <commit-hash>

# Or reset to previous commit
git reset --hard HEAD~1

# Force push (⚠️ be very careful on main branch)
git push origin <branch-name> --force
```

#### 3. Revert Specific Commit (Safe Method)

**Use when:** You want to undo a specific commit without rewriting history

```bash
# Find the commit to revert
git log --oneline

# Revert creates a new commit that undoes the changes
git revert <commit-hash>

# Edit the commit message if needed
# Then push normally
git push origin <branch-name>
```

#### 4. Rollback Database Migration

**Use when:** A database migration caused issues

```bash
# Navigate to backend
cd backend

# Check migration status
npx sequelize-cli db:migrate:status

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo specific migration
npx sequelize-cli db:migrate:undo:all --to <migration-name>.js

# Verify database state
npm run check-db
```

#### 5. Emergency Production Rollback

**Use when:** Production is broken and needs immediate fix

```bash
# 1. Identify last working commit
git log --oneline --graph

# 2. Create emergency fix branch
git checkout -b emergency-fix-$(date +%Y%m%d)

# 3. Reset to last working commit
git reset --hard <last-working-commit>

# 4. Force push to trigger redeployment
git push origin emergency-fix-$(date +%Y%m%d) --force

# 5. Update main branch after verification
git checkout main
git reset --hard <last-working-commit>
git push origin main --force  # ⚠️ Requires force push permissions
```

#### 6. Rollback npm Package Updates

**Use when:** A package update broke functionality

```bash
# Backend rollback
cd backend
git checkout HEAD~1 -- package.json package-lock.json
npm install

# Frontend rollback
cd ../frontend
git checkout HEAD~1 -- package.json package-lock.json
npm install

# Test the application
npm run dev
```

#### Best Practices

1. **Always create backups** before major changes
2. **Test rollbacks** in development/staging first
3. **Document the reason** for rollback in commit message
4. **Notify team members** before force pushing
5. **Run tests** after rollback to verify stability
6. **Check logs** for any residual issues

#### Rollback Checklist

- [ ] Identify the problematic commit or change
- [ ] Create backup branch: `git branch backup-$(date +%Y%m%d-%H%M%S)`
- [ ] Stop running servers (backend + frontend)
- [ ] Perform rollback using appropriate method
- [ ] Rollback database migrations if needed
- [ ] Clear caches: `rm -rf node_modules/.cache`
- [ ] Reinstall dependencies if package.json changed
- [ ] Restart servers and test functionality
- [ ] Update team and document incident
- [ ] Plan fix for original issue

### Cross-Browser Testing Matrix

**Purpose:** Ensure consistent functionality and appearance across all supported browsers and devices.

#### Supported Browsers (Desktop)

| Browser | Minimum Version | Latest Tested | Support Status | Notes |
|---------|----------------|---------------|----------------|-------|
| **Chrome** | 90+ | 119 | ✅ Full Support | Primary development browser |
| **Firefox** | 88+ | 119 | ✅ Full Support | Excellent compatibility |
| **Safari** | 14+ | 17 | ✅ Full Support | macOS/iOS primary browser |
| **Edge** | 90+ | 119 | ✅ Full Support | Chromium-based, same as Chrome |
| **Opera** | 76+ | 104 | ⚠️ Limited Testing | Chromium-based, should work |
| **Brave** | 1.25+ | 1.59 | ⚠️ Limited Testing | Chromium-based, should work |

#### Supported Browsers (Mobile)

| Browser | Minimum Version | Latest Tested | Support Status | Notes |
|---------|----------------|---------------|----------------|-------|
| **iOS Safari** | 14+ | 17 | ✅ Full Support | iPhone/iPad default browser |
| **Chrome Mobile** | 90+ | 119 | ✅ Full Support | Android primary browser |
| **Samsung Internet** | 14+ | 22 | ⚠️ Limited Testing | Samsung devices default browser |
| **Firefox Mobile** | 88+ | 119 | ⚠️ Limited Testing | Good compatibility expected |

#### Browser Feature Support

| Feature | Chrome | Firefox | Safari | Edge | Mobile Safari | Chrome Mobile |
|---------|--------|---------|--------|------|---------------|---------------|
| Calendar Views | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Date Pickers | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| Chart.js Graphs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| QR Code Generation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF Export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ICS Export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Service Workers | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| LocalStorage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Full Support
- ⚠️ Partial Support / Minor Issues
- ❌ Not Supported

#### Known Browser-Specific Issues

**Safari (Desktop & iOS):**
- Date input styling may differ from other browsers
- Some CSS backdrop-filter effects may have reduced performance
- Push notifications not supported on iOS
- Service worker support limited in older versions

**Firefox:**
- Slightly different font rendering compared to Chromium browsers
- May require additional configuration for secure contexts (HTTPS)

**Edge Legacy (pre-Chromium):**
- ❌ Not supported - recommend upgrading to Chromium-based Edge

**Internet Explorer 11:**
- ❌ Not supported - application requires modern browser features

#### Critical User Flows to Test

**Authentication & User Management:**
- [ ] User registration (all fields, validation)
- [ ] Login (email/password)
- [ ] Password reset flow
- [ ] Logout and session expiration
- [ ] Therapist role switching

**Calendar Operations:**
- [ ] View month/week/day calendar
- [ ] Create new event (all event types)
- [ ] Edit existing event
- [ ] Delete event with confirmation
- [ ] Drag-and-drop event rescheduling
- [ ] Recurring event creation
- [ ] Event reminder notifications

**Data Entry & Forms:**
- [ ] Add medication with dosage
- [ ] Log vital signs (BP, heart rate, weight)
- [ ] Create meal entry with food lookup
- [ ] Add exercise session with metrics
- [ ] Upload files/attachments

**Data Visualization:**
- [ ] View analytics dashboard
- [ ] Weight trend chart over time
- [ ] Heart rate graph with min/max
- [ ] Medication adherence chart
- [ ] Exercise performance graphs

**Export & Sharing:**
- [ ] Export calendar to ICS format
- [ ] Export calendar to JSON
- [ ] Generate QR code for calendar sharing
- [ ] Print calendar view (CSS print styles)
- [ ] Download patient data (therapist view)

**Mobile-Specific Features:**
- [ ] Touch gestures (swipe, pinch zoom)
- [ ] Mobile navigation menu
- [ ] Responsive layout on small screens
- [ ] File upload from mobile camera
- [ ] Date picker on mobile devices

#### Testing Procedure

**Before Each Release:**

1. **Desktop Testing** (Est: 2-3 hours)
   ```bash
   # Run development build
   npm run dev

   # Test in each browser:
   # - Chrome: http://localhost:5173
   # - Firefox: http://localhost:5173
   # - Safari: http://localhost:5173
   # - Edge: http://localhost:5173
   ```
   - Test critical user flows in each browser
   - Verify responsive breakpoints (resize window)
   - Check console for errors
   - Test with browser dev tools throttling (slow 3G)

2. **Mobile Testing** (Est: 2-3 hours)
   ```bash
   # Get local IP address
   ipconfig  # Windows
   ifconfig  # macOS/Linux

   # Access from mobile device on same network
   # http://<your-ip>:5173
   ```
   - Test on real iOS device (iPhone)
   - Test on real Android device
   - Test with Chrome DevTools mobile emulation
   - Test touch gestures and swipe navigation
   - Verify soft keyboard doesn't obscure inputs

3. **Cross-Browser Automated Testing** (Future Enhancement)
   ```bash
   # Planned: Playwright or Cypress cross-browser tests
   # npm run test:e2e:chrome
   # npm run test:e2e:firefox
   # npm run test:e2e:safari
   ```

#### Browser Testing Checklist

**Pre-Testing Setup:**
- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions (test in incognito/private mode)
- [ ] Ensure using supported browser version
- [ ] Check network tab for 404s or failed requests
- [ ] Monitor console for JavaScript errors

**Visual Testing:**
- [ ] Header/navigation renders correctly
- [ ] Footer appears at bottom of page
- [ ] Calendar grid displays properly
- [ ] Charts render without distortion
- [ ] Modal dialogs center correctly
- [ ] Buttons and form inputs styled consistently
- [ ] Colors match design system
- [ ] Fonts load correctly (no FOUT/FOIT)

**Functional Testing:**
- [ ] All links navigate correctly
- [ ] Forms submit successfully
- [ ] Validation messages display properly
- [ ] Error handling works as expected
- [ ] Loading states show during async operations
- [ ] Optimistic UI updates work correctly

**Performance Testing:**
- [ ] Page load time < 3 seconds (on fast 3G)
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth scrolling and animations (60 FPS)
- [ ] Large datasets render without freezing
- [ ] Memory usage stays stable (no leaks)

#### Browser-Specific Test Commands

**Chrome DevTools Testing:**
```javascript
// Open Console (F12) and run performance checks
performance.now();  // Check timing
console.time('operation'); /* your test */ console.timeEnd('operation');
```

**Safari Web Inspector:**
```javascript
// Check for deprecated APIs
console.warn('Testing Safari-specific features');
```

**Firefox Developer Tools:**
```javascript
// Check for security warnings
console.info('Testing Firefox-specific features');
```

#### Accessibility Testing (Cross-Browser)

**Keyboard Navigation:**
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate calendar

**Screen Reader Testing:**
- [ ] NVDA (Windows/Firefox)
- [ ] JAWS (Windows/Chrome, Edge)
- [ ] VoiceOver (macOS Safari, iOS Safari)
- [ ] TalkBack (Android Chrome)

**Accessibility Checklist:**
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] ARIA landmarks present
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

#### Reporting Browser Issues

When you find a browser-specific issue, document it with:

1. **Browser & Version:** Chrome 119, Safari 17, etc.
2. **Operating System:** Windows 11, macOS 14, iOS 17, Android 13
3. **Device:** Desktop, iPhone 14, Samsung Galaxy S23
4. **Steps to Reproduce:** Exact steps to trigger issue
5. **Expected Behavior:** What should happen
6. **Actual Behavior:** What actually happens
7. **Screenshots/Video:** Visual evidence
8. **Console Errors:** JavaScript errors from console
9. **Network Tab:** Failed requests or slow loading

**Issue Template:**
```
Browser: [browser name and version]
OS: [operating system and version]
Device: [desktop/mobile device model]
URL: [specific page where issue occurs]

Steps to Reproduce:
1. Go to...
2. Click on...
3. Observe...

Expected: [expected behavior]
Actual: [actual behavior]

Console Errors: [paste errors]
Screenshots: [attach images]
```

#### Browser Compatibility Resources

- **Can I Use:** https://caniuse.com/ - Check feature support
- **MDN Web Docs:** https://developer.mozilla.org/ - Browser compatibility tables
- **BrowserStack:** https://www.browserstack.com/ - Live cross-browser testing (paid)
- **LambdaTest:** https://www.lambdatest.com/ - Automated cross-browser testing (paid)
- **Playwright:** https://playwright.dev/ - Cross-browser automation (free)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Email**: support@heartrecovery.com
- **Issues**: [GitHub Issues](https://github.com/johndesautels1/Heart-Recovery-Calender/issues)
- **Discussions**: [GitHub Discussions](https://github.com/johndesautels1/Heart-Recovery-Calender/discussions)

## Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- [FullCalendar](https://fullcalendar.io/) for calendar functionality
- [Chart.js](https://www.chartjs.org/) for data visualization
- [React](https://react.dev/) ecosystem
- [Express](https://expressjs.com/) and [Sequelize](https://sequelize.org/) for backend

---

**⚠️ Security Notice**: Remember to change all default passwords, secrets, and API keys before deploying to production!

**Made with ❤️ for cardiac recovery**
