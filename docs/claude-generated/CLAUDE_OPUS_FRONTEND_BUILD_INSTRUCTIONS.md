# HEART RECOVERY CALENDAR - FRONTEND REBUILD INSTRUCTIONS FOR CLAUDE OPUS

## PROJECT OVERVIEW
This is a comprehensive cardiac recovery application for heart patients and their healthcare providers. The backend is COMPLETE and PRODUCTION-READY. You are tasked with building a world-class, modern frontend that connects to the existing backend API.

**Repository**: https://github.com/johndesautels1/Heart-Recovery-Calender.git
**Local Path**: C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar\

---

## CRITICAL RULES

1. **DO NOT MODIFY THE BACKEND** - The backend is working perfectly. Only add new endpoints if absolutely necessary for new features.
2. **PRESERVE ALL API CONTRACTS** - The frontend must use the exact API response formats documented below.
3. **USE THE EXISTING DATABASE SCHEMA** - Do not change any database models or migrations.
4. **ALL CHANGES MUST BE COMMITTED TO GIT** - After every major change, commit and push to the repository.
5. **BACKEND RUNS ON PORT 4000, FRONTEND ON PORT 3000** - Do not change these ports.

---

## BACKEND TECHNOLOGY STACK

### Core Technologies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens) + OAuth (Google, Apple)
- **Password Hashing**: bcrypt
- **Logging**: Winston
- **API Documentation**: Can add Swagger/OpenAPI if needed

### Database Connection
```typescript
// backend/src/models/index.ts
Database: heartbeat_calendar
User: postgres
Password: 2663
Host: localhost
Port: 5432
```

### Environment Variables (.env)
```
DB_NAME=heartbeat_calendar
DB_USER=postgres
DB_PASS=2663
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=4000

# OAuth (if implementing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
```

---

## COMPLETE DATABASE SCHEMA

### Table: users
**Purpose**: Store patient/user account information
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20),
  emergencyContact VARCHAR(255),
  emergencyPhone VARCHAR(20),
  doctorName VARCHAR(255),
  doctorPhone VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Demo User**:
- Email: demo@example.com
- Password: password123
- ID: 3

### Table: calendars
**Purpose**: Each user can have multiple calendars organized by type
```sql
CREATE TABLE calendars (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  color VARCHAR(7),
  isSharedWithDoctor BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Types**: medications, appointments, exercise, vitals, diet, general

### Table: calendar_events
**Purpose**: Store all calendar events across all calendars
```sql
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  calendarId INTEGER REFERENCES calendars(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NOT NULL,
  isAllDay BOOLEAN DEFAULT FALSE,
  location VARCHAR(255),
  recurrenceRule VARCHAR(500),
  reminderMinutes INTEGER DEFAULT 30,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Status values**: scheduled, completed, cancelled, missed

### Table: meal_entries
**Purpose**: Track dietary intake for cardiac health compliance
```sql
CREATE TABLE meal_entries (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  mealType VARCHAR(50) NOT NULL,
  foodItems TEXT NOT NULL,
  calories INTEGER,
  sodium INTEGER,
  cholesterol INTEGER,
  saturatedFat INTEGER,
  totalFat INTEGER,
  fiber INTEGER,
  sugar INTEGER,
  protein INTEGER,
  carbohydrates INTEGER,
  withinSpec BOOLEAN DEFAULT TRUE,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Meal Types**: breakfast, lunch, dinner, snack

**Dietary Limits** (used for compliance):
- Calories: 2000/day
- Sodium: 2300mg/day
- Cholesterol: 300mg/day
- Saturated Fat: 20g/day

### Table: vitals_samples
**Purpose**: Track vital signs and health metrics
```sql
CREATE TABLE vitals_samples (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  bloodPressureSystolic INTEGER,
  bloodPressureDiastolic INTEGER,
  heartRate INTEGER,
  hrVariability FLOAT,
  weight FLOAT,
  temperature FLOAT,
  oxygenSaturation INTEGER,
  bloodSugar INTEGER,
  cholesterol INTEGER,
  ldl INTEGER,
  hdl INTEGER,
  triglycerides INTEGER,
  respiratoryRate INTEGER,
  notes TEXT,
  symptoms TEXT,
  medicationsTaken BOOLEAN DEFAULT FALSE,
  source VARCHAR(50) DEFAULT 'manual',
  deviceId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**CRITICAL**: The model uses different property names than DB columns:
- `heartRateVariability` → `hrVariability` (DB column)
- `cholesterolTotal` → `cholesterol` (DB column)
- `cholesterolLDL` → `ldl` (DB column)
- `cholesterolHDL` → `hdl` (DB column)

### Table: medications
**Purpose**: Track prescribed medications and schedules
```sql
CREATE TABLE medications (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  prescribedBy VARCHAR(255),
  startDate DATE NOT NULL,
  endDate DATE,
  timeOfDay VARCHAR(50),
  instructions TEXT,
  sideEffects TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  reminderEnabled BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

---

## COMPLETE API DOCUMENTATION

### Base URL
```
http://localhost:4000/api
```

### Authentication Endpoints

#### POST /api/auth/login
**Request**:
```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "email": "demo@example.com",
    "name": "Demo User",
    "phoneNumber": null,
    "timezone": "America/New_York"
  }
}
```

#### GET /api/auth/me
**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "id": 3,
  "email": "demo@example.com",
  "name": "Demo User",
  "phoneNumber": null,
  "emergencyContact": null,
  "emergencyPhone": null,
  "doctorName": null,
  "doctorPhone": null,
  "timezone": "America/New_York"
}
```

#### PUT /api/auth/profile
**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "name": "Updated Name",
  "phoneNumber": "555-1234",
  "emergencyContact": "Jane Doe",
  "emergencyPhone": "555-5678",
  "doctorName": "Dr. Smith",
  "doctorPhone": "555-9999"
}
```

#### POST /api/auth/logout
No request body needed. Clears token client-side.

---

### Calendar Endpoints

#### GET /api/calendars
**Headers**: `Authorization: Bearer <token>`

**Query Params**: None required (fetches all user's calendars)

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "userId": 3,
      "name": "Medications",
      "type": "medications",
      "color": "#9c27b0",
      "isSharedWithDoctor": true,
      "isActive": true,
      "description": "Medication schedule",
      "createdAt": "2025-10-25T08:00:00.000Z",
      "updatedAt": "2025-10-25T08:00:00.000Z"
    }
  ]
}
```

#### POST /api/calendars
**Request**:
```json
{
  "name": "My Calendar",
  "type": "general",
  "color": "#607d8b",
  "isSharedWithDoctor": false,
  "description": "Personal calendar"
}
```

#### PUT /api/calendars/:id
#### DELETE /api/calendars/:id

---

### Event Endpoints

#### GET /api/events
**Query Params**:
- `calendarId` (optional): Filter by calendar ID
- `start` (optional): ISO 8601 date string
- `end` (optional): ISO 8601 date string
- `status` (optional): scheduled, completed, cancelled, missed

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "calendarId": 1,
      "title": "Take Morning Meds",
      "description": "Lisinopril 10mg, Metoprolol 25mg",
      "startTime": "2025-10-25T08:00:00.000Z",
      "endTime": "2025-10-25T08:30:00.000Z",
      "isAllDay": false,
      "location": null,
      "recurrenceRule": "FREQ=DAILY",
      "reminderMinutes": 30,
      "status": "scheduled",
      "notes": null,
      "createdAt": "2025-10-25T07:00:00.000Z",
      "updatedAt": "2025-10-25T07:00:00.000Z"
    }
  ]
}
```

#### POST /api/events
**Request**:
```json
{
  "calendarId": 1,
  "title": "Doctor Appointment",
  "description": "Cardiology follow-up",
  "startTime": "2025-10-30T14:00:00.000Z",
  "endTime": "2025-10-30T15:00:00.000Z",
  "isAllDay": false,
  "location": "Medical Center",
  "reminderMinutes": 60,
  "status": "scheduled"
}
```

#### PUT /api/events/:id
#### DELETE /api/events/:id

#### PATCH /api/events/:id/status
**Request**:
```json
{
  "status": "completed"
}
```

---

### Meal Endpoints

#### GET /api/meals
**Query Params**:
- `date` (optional): YYYY-MM-DD format
- `start` (optional): ISO 8601 date
- `end` (optional): ISO 8601 date
- `mealType` (optional): breakfast, lunch, dinner, snack

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "userId": 3,
      "timestamp": "2025-10-25T12:00:00.000Z",
      "mealType": "lunch",
      "foodItems": "Grilled chicken salad, brown rice",
      "calories": 450,
      "sodium": 380,
      "cholesterol": 65,
      "saturatedFat": 3,
      "totalFat": 12,
      "fiber": 8,
      "sugar": 5,
      "protein": 35,
      "carbohydrates": 45,
      "withinSpec": true,
      "notes": "Feeling good",
      "createdAt": "2025-10-25T12:05:00.000Z",
      "updatedAt": "2025-10-25T12:05:00.000Z"
    }
  ]
}
```

#### POST /api/meals
**Request**:
```json
{
  "mealType": "breakfast",
  "foodItems": "Oatmeal with berries",
  "calories": 300,
  "sodium": 150,
  "cholesterol": 0,
  "saturatedFat": 1,
  "totalFat": 5,
  "fiber": 6,
  "sugar": 12,
  "protein": 8,
  "carbohydrates": 55,
  "notes": "Low sodium oats",
  "timestamp": "2025-10-25T08:00:00.000Z"
}
```

**Note**: `withinSpec` is calculated automatically by the backend based on dietary limits.

#### GET /api/meals/daily-summary
**Query Params**:
- `date` (optional): YYYY-MM-DD (defaults to today)

**Response**:
```json
{
  "date": "2025-10-25",
  "totals": {
    "calories": 1450,
    "sodium": 1200,
    "cholesterol": 180,
    "saturatedFat": 12,
    "totalFat": 45,
    "fiber": 28,
    "sugar": 42,
    "protein": 85,
    "carbohydrates": 165
  },
  "limits": {
    "calories": 2000,
    "sodium": 2300,
    "cholesterol": 300,
    "saturatedFat": 20
  },
  "mealsLogged": 3,
  "compliancePercentage": 100
}
```

#### GET /api/meals/compliance
**Query Params**:
- `start` (optional): ISO 8601 date
- `end` (optional): ISO 8601 date

**Response**:
```json
{
  "totalMeals": 45,
  "compliantMeals": 42,
  "complianceRate": 93,
  "trends": {
    "sodium": {
      "average": 1850,
      "overLimitDays": 2
    },
    "cholesterol": {
      "average": 220,
      "overLimitDays": 1
    },
    "saturatedFat": {
      "average": 15,
      "overLimitDays": 3
    }
  }
}
```

#### PUT /api/meals/:id
#### DELETE /api/meals/:id

---

### Vitals Endpoints

#### GET /api/vitals
**Query Params**:
- `start` (optional): ISO 8601 date
- `end` (optional): ISO 8601 date

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "userId": 3,
      "timestamp": "2025-10-25T07:00:00.000Z",
      "bloodPressureSystolic": 118,
      "bloodPressureDiastolic": 76,
      "heartRate": 68,
      "heartRateVariability": 52.3,
      "weight": 175.5,
      "temperature": 98.4,
      "oxygenSaturation": 98,
      "bloodSugar": 95,
      "cholesterolTotal": 185,
      "cholesterolLDL": 110,
      "cholesterolHDL": 55,
      "triglycerides": 120,
      "respiratoryRate": 16,
      "notes": "Morning reading",
      "symptoms": null,
      "medicationsTaken": true,
      "source": "manual",
      "deviceId": null,
      "createdAt": "2025-10-25T07:05:00.000Z",
      "updatedAt": "2025-10-25T07:05:00.000Z"
    }
  ]
}
```

**IMPORTANT**: API returns `heartRateVariability`, `cholesterolTotal`, `cholesterolLDL`, `cholesterolHDL` even though DB columns are different.

#### POST /api/vitals
**Request**:
```json
{
  "timestamp": "2025-10-25T19:00:00.000Z",
  "bloodPressureSystolic": 122,
  "bloodPressureDiastolic": 78,
  "heartRate": 72,
  "heartRateVariability": 48.5,
  "weight": 175.0,
  "oxygenSaturation": 97,
  "medicationsTaken": true,
  "source": "manual",
  "notes": "Evening reading"
}
```

#### GET /api/vitals/latest
**Response**: Single most recent vitals object (not array)

#### PUT /api/vitals/:id
#### DELETE /api/vitals/:id

---

### Medication Endpoints

#### GET /api/medications
**Query Params**:
- `active` (optional): true/false

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "userId": 3,
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "prescribedBy": "Dr. Smith",
      "startDate": "2025-01-15",
      "endDate": null,
      "timeOfDay": "morning",
      "instructions": "Take with water",
      "sideEffects": "Dizziness, dry cough",
      "isActive": true,
      "reminderEnabled": true,
      "createdAt": "2025-01-15T08:00:00.000Z",
      "updatedAt": "2025-01-15T08:00:00.000Z"
    }
  ]
}
```

#### POST /api/medications
**Request**:
```json
{
  "name": "Metoprolol",
  "dosage": "25mg",
  "frequency": "Twice daily",
  "prescribedBy": "Dr. Johnson",
  "startDate": "2025-10-25",
  "timeOfDay": "morning,evening",
  "instructions": "Take with food",
  "reminderEnabled": true
}
```

#### PATCH /api/medications/:id/toggle
Toggles `isActive` status

#### PUT /api/medications/:id
#### DELETE /api/medications/:id

---

### Reports Endpoints (Optional - May need to implement)

#### GET /api/reports/health-summary
**Query Params**:
- `start`: ISO 8601 date
- `end`: ISO 8601 date

#### GET /api/reports/compliance
**Query Params**:
- `period`: week, month, year

#### GET /api/reports/export
**Query Params**:
- `format`: pdf, csv

---

## BACKEND FILE STRUCTURE

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.ts          # Login, register, profile
│   │   ├── calendarController.ts      # Events CRUD
│   │   ├── mealController.ts          # Meals, daily summary, compliance
│   │   ├── vitalController.ts         # Vitals CRUD
│   │   ├── medicationController.ts    # Medications CRUD
│   │   └── reportController.ts        # Analytics and exports (partial)
│   ├── middleware/
│   │   ├── auth.ts                    # JWT verification middleware
│   │   └── errorHandler.ts            # Global error handling
│   ├── models/
│   │   ├── index.ts                   # Sequelize connection
│   │   ├── User.ts                    # User model
│   │   ├── Calendar.ts                # Calendar model
│   │   ├── CalendarEvent.ts           # Event model
│   │   ├── MealEntry.ts               # Meal model
│   │   ├── VitalsSample.ts            # Vitals model (with field mappings!)
│   │   └── Medication.ts              # Medication model
│   ├── routes/
│   │   ├── auth.ts                    # Auth routes
│   │   ├── calendars.ts               # Calendar routes
│   │   ├── events.ts                  # Event routes
│   │   ├── meals.ts                   # Meal routes
│   │   ├── vitals.ts                  # Vitals routes
│   │   ├── medications.ts             # Medication routes
│   │   └── reports.ts                 # Report routes
│   ├── services/
│   │   ├── authService.ts             # JWT generation, password hashing
│   │   └── recurrenceService.ts       # (TODO) Parse recurrence rules
│   ├── utils/
│   │   └── logger.ts                  # Winston logger
│   └── server.ts                      # Express app entry point
├── .env                                # Environment variables
├── package.json
└── tsconfig.json
```

---

## CURRENT FRONTEND ISSUES TO FIX

The current frontend is functional but has major design issues:

### Problems:
1. **Boring, outdated UI** - Looks like "an 8th grader built it"
2. **Vertical toolbar blocks content** - Takes up too much space on the left
3. **No glassmorphic design** - User wants modern, sleek appearance
4. **Basic charts** - Low-quality data visualization
5. **No therapist interface** - Missing dual-view for healthcare providers
6. **No patient portal** - Missing mirrored view for patients
7. **No teleconferencing UI** - Future requirement
8. **No heart-healthy food database** - Should have dropdown entries
9. **Redundant vitals tab** - Will integrate with main app later
10. **No advanced calendar features** - Needs better event management

### Current Frontend Tech (you can change):
- Vite (React)
- Material-UI (MUI)
- React Query (TanStack Query)
- React Big Calendar
- Zustand (state management)
- Axios (HTTP client)

**YOU CAN REPLACE ALL OF THIS** with modern alternatives like:
- Tailwind CSS + shadcn/ui
- Framer Motion for animations
- Recharts or Chart.js for better visualizations
- Glass morphism design system
- Modern calendar library

---

## INSTRUCTIONS FOR BUILDING NEW FRONTEND

### Step 1: Understand the Backend
Read all API documentation above. Test each endpoint using the demo account:
```
Email: demo@example.com
Password: password123
```

### Step 2: Choose Your Tech Stack
Recommended modern stack:
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS + glassmorphism components
- **UI Components**: shadcn/ui or custom glassmorphic components
- **State Management**: Zustand or Redux Toolkit
- **Data Fetching**: TanStack Query (React Query) - already proven to work
- **Charts**: Recharts or Chart.js
- **Calendar**: FullCalendar or custom solution
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React or Heroicons
- **Animations**: Framer Motion

### Step 3: Set Up Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── calendar/              # Calendar-specific components
│   │   ├── meals/                 # Meal tracking components
│   │   ├── vitals/                # Vitals tracking components
│   │   ├── medications/           # Medication components
│   │   ├── therapist/             # Therapist portal components (NEW)
│   │   └── patient/               # Patient view components (NEW)
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Meals.tsx
│   │   ├── Vitals.tsx
│   │   ├── Medications.tsx
│   │   ├── Analytics.tsx          # (NEW) Advanced charts
│   │   ├── TherapistPortal.tsx    # (NEW) Therapist interface
│   │   └── Login.tsx
│   ├── services/
│   │   └── api.ts                 # API client (keep axios structure)
│   ├── store/
│   │   └── authStore.ts           # Authentication state
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCalendar.ts
│   │   ├── useMeals.ts
│   │   ├── useVitals.ts
│   │   └── useMedications.ts
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces matching API
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   └── validators.ts
│   └── App.tsx
├── .env
└── package.json
```

### Step 4: Create API Client
**CRITICAL**: Use this exact structure to match backend responses:

```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// CRITICAL: Extract .data from responses
export const calendarAPI = {
  getCalendars: () => api.get('/calendars').then(res => res.data),
  createCalendar: (data: any) => api.post('/calendars', data).then(res => res.data),
  // ... etc
};

export const eventsAPI = {
  getEvents: (params?: { calendarId?: number; start?: string; end?: string }) =>
    api.get('/events', { params }).then(res => res.data),
  createEvent: (data: any) => api.post('/events', data).then(res => res.data),
  // ... etc
};

// Repeat for mealsAPI, vitalsAPI, medicationsAPI, authAPI
```

### Step 5: Create TypeScript Types
Match the exact API response structure:

```typescript
// frontend/src/types/index.ts

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
}

export interface Calendar {
  id: number;
  userId: number;
  name: string;
  type: 'medications' | 'appointments' | 'exercise' | 'vitals' | 'diet' | 'general';
  color: string;
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
  createdAt: string;
  updatedAt: string;
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
```

### Step 6: Environment Setup
```env
# frontend/.env
VITE_API_URL=http://localhost:4000/api
```

**IMPORTANT**: Vite uses `VITE_` prefix, NOT `REACT_APP_`

Access with: `import.meta.env.VITE_API_URL`

### Step 7: Design Requirements

#### Glassmorphic Design System
- Frosted glass effect on cards and modals
- Subtle backdrop blur
- Translucent backgrounds with soft shadows
- Gradient accents for important elements
- Smooth transitions and animations

#### Color Palette (based on current event types)
- Medications: `#9c27b0` (Purple)
- Appointments: `#2196f3` (Blue)
- Exercise: `#4caf50` (Green)
- Vitals: `#f44336` (Red)
- Diet: `#ff9800` (Orange)
- General: `#607d8b` (Grey)

#### Layout
- **Navigation**: Top horizontal navbar OR collapsible sidebar (NOT blocking vertical toolbar)
- **Dashboard**: Card-based layout with glassmorphic cards
- **Calendar**: Full-width, modern event display
- **Forms**: Inline editing where possible, elegant modals for complex inputs

#### Advanced Features to Add
1. **Therapist Portal**:
   - View multiple patients
   - Enter calendar data for patients
   - See patient compliance dashboards
   - Messaging interface (future)

2. **Patient View**:
   - Mirror of therapist entries
   - Notification system for new events
   - Compliance tracking

3. **Heart-Healthy Food Database**:
   - Dropdown autocomplete for food items
   - Pre-loaded nutritional data
   - Categorized by meal type
   - Favorites system

4. **Advanced Analytics**:
   - Beautiful line/area charts for vitals trends
   - Compliance heatmaps
   - Weekly/monthly comparisons
   - Export to PDF

5. **Teleconferencing Placeholder**:
   - UI for scheduling video calls
   - Integration points for future WebRTC

### Step 8: Implementation Order
1. Set up project with Vite + Tailwind
2. Create API client and test all endpoints
3. Build authentication flow (login, protected routes)
4. Create glassmorphic UI component library
5. Build Dashboard with overview cards
6. Build Calendar page with advanced features
7. Build Meals page with food database
8. Build Vitals page with charts
9. Build Medications page
10. Add Therapist Portal
11. Add Analytics page
12. Add Reports/Export functionality

### Step 9: Testing Checklist
- [ ] Login works with demo@example.com
- [ ] All API endpoints return correct data
- [ ] Calendar events display correctly
- [ ] Can create/edit/delete events
- [ ] Meal entries calculate compliance
- [ ] Vitals chart shows historical data
- [ ] Medications toggle active status
- [ ] Responsive design works on mobile
- [ ] Glass morphic effects render properly
- [ ] Authentication redirects work

---

## BACKEND FILES THAT MAY NEED ADDITIONS

### For Therapist Features:
**File**: `backend/src/models/User.ts`
```typescript
// Add field:
role: 'patient' | 'therapist' | 'admin'
```

**File**: `backend/src/models/TherapistPatient.ts` (NEW)
```typescript
// Create junction table for therapist-patient relationships
```

**File**: `backend/src/controllers/therapistController.ts` (NEW)
```typescript
// Endpoints for therapist to view/manage multiple patients
```

**File**: `backend/src/routes/therapist.ts` (NEW)
```typescript
// GET /api/therapist/patients
// POST /api/therapist/patients/:patientId/events
```

### For Food Database:
**File**: `backend/src/models/FoodItem.ts` (NEW)
```typescript
// Pre-loaded heart-healthy foods with nutritional data
```

**File**: `backend/src/controllers/foodController.ts` (NEW)
```typescript
// GET /api/foods/search?q=chicken
// GET /api/foods/favorites
```

### For Teleconferencing:
**File**: `backend/src/models/VideoSession.ts` (NEW)
```typescript
// Store scheduled video call metadata
```

**File**: `backend/src/controllers/videoController.ts` (NEW)
```typescript
// POST /api/video/sessions
// GET /api/video/sessions/:id/token (for WebRTC)
```

### Migration Files
If adding new tables, create migrations:
```bash
npx sequelize-cli migration:generate --name add-therapist-role-to-users
npx sequelize-cli migration:generate --name create-food-items-table
```

---

## CRITICAL REMINDERS

1. **ALL API calls MUST include `Authorization: Bearer <token>` header**
2. **API responses are wrapped in `{ data: [...] }` format** - extract with `.then(res => res.data)`
3. **VitalsSample model uses different property names** - API returns `heartRateVariability` not `hrVariability`
4. **Date fields are ISO 8601 strings** - Use `new Date().toISOString()` for timestamps
5. **Meal compliance is auto-calculated** - Don't manually set `withinSpec`
6. **Calendar events require `calendarId`** - Create default calendar if none exists
7. **Backend runs on port 4000, frontend on 3000** - Don't change ports
8. **PostgreSQL must be running** - Database: heartbeat_calendar, User: postgres, Password: 2663
9. **Always commit and push to git** - After every major change
10. **Test with demo user** - Email: demo@example.com, Password: password123

---

## GIT COMMANDS FOR SAVING WORK

```bash
# Check status
cd "C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar"
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Rebuild frontend with glassmorphic design and advanced features"

# Push to GitHub
git push origin main
```

---

## STARTING THE SERVERS

### Backend:
```bash
cd "C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar\backend"
npm run dev
```
Should see: `Server running on port 4000` and `Database connected`

### Frontend:
```bash
cd "C:\Users\broke\OneDrive\Apps\Heart-Recovery-Calendar\frontend"
npm run dev
```
Should see: `Local: http://localhost:3000/`

---

## FINAL NOTES

This backend is **production-ready** for the current feature set. It handles:
- ✅ User authentication with JWT
- ✅ Calendar management with events
- ✅ Meal tracking with compliance calculation
- ✅ Vital signs monitoring
- ✅ Medication management
- ✅ Date range queries for all entities
- ✅ Error handling and logging
- ✅ Database relationships and constraints

Your job is to create a **world-class frontend** that:
- Looks modern and professional
- Uses glassmorphic design
- Provides excellent UX for cardiac patients
- Includes therapist portal
- Has advanced data visualization
- Integrates heart-healthy food database
- Prepares for future teleconferencing

**DO NOT modify the backend unless adding NEW features** (therapist role, food database, video sessions).

**EVERYTHING is already committed to git and backed up** - you can safely rebuild the frontend from scratch.

Good luck building the world's most advanced heart health calendar! 🫀
