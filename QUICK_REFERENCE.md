# Quick Reference Guide - Heart Recovery Calendar

**Last Updated:** November 1, 2025

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar

# Option 1: Automated setup (when build errors are fixed)
./setup.sh  # Linux/Mac
setup.bat   # Windows

# Option 2: Manual setup
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm run migrate
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with backend API URL
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api

---

## ⚠️ Current Status

**Build Status:** ❌ DOES NOT BUILD

**Before you can run the application, you must fix:**
1. Backend build errors (see IMMEDIATE_ACTION_PLAN.md)
2. Frontend type errors (see IMMEDIATE_ACTION_PLAN.md)
3. Security vulnerabilities (run `npm audit fix --force`)

---

## 📁 Project Structure

```
Heart-Recovery-Calendar/
├── backend/              # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # Sequelize models (27 tables)
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, validation
│   │   ├── services/     # External integrations
│   │   └── migrations/   # Database migrations (45 files)
│   └── package.json
├── frontend/             # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── pages/        # 21 page components
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript definitions
│   └── package.json
└── docker-compose.yml    # PostgreSQL + app containers
```

---

## 🔑 Key Technologies

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.1.1 |
| | TypeScript | 5.9.3 |
| | Vite | 7.1.7 |
| | TailwindCSS | 3.4.18 |
| | FullCalendar | 6.1.19 |
| | React Query | 5.90.5 |
| **Backend** | Node.js | 18+ |
| | Express | 4.21.2 |
| | TypeScript | 5.1.6 |
| | Sequelize | 6.37.7 |
| | PostgreSQL | 14+ |
| | JWT | 9.0.2 |

---

## 🎯 Main Features

### Patient Features
- 📅 Calendar management with recurring events
- 💊 Medication tracking with adherence stats
- ❤️ Vital signs tracking (BP, HR, weight, O2, etc.)
- 🍽️ Meal logging with nutrition analysis
- 🏃 Exercise logging with performance tracking
- 😴 Sleep tracking and quality metrics
- 📊 Analytics dashboards with charts
- 📲 QR code calendar sharing

### Therapist Features
- 👥 Patient management
- 🏋️ Exercise library and prescription assignment
- 📈 Patient progress monitoring
- 📊 Statistics and reporting
- 🔄 View toggle (therapist ↔ patient)

---

## 🗄️ Database Schema

**27 Tables:**

| Category | Tables |
|----------|--------|
| Core | Users, Calendars, CalendarEvents |
| Health Tracking | VitalsSamples, MedicationLogs, MealEntries, SleepLogs, HydrationLogs, ExerciseLog |
| Therapy | Patients, Exercises, ExercisePrescriptions, TherapyGoals, Providers |
| Food | FoodItems, FoodCategories, MealItemEntries |
| System | Alerts, EventTemplates, DeviceConnections, DeviceSyncLog, DailyScores |

**Key Fields:**
- All tables have `id`, `createdAt`, `updatedAt`
- Many tables have `postSurgeryDay` for temporal tracking
- User relationships via `userId`
- Therapist-Patient via `therapistId`

---

## 🔌 API Endpoints (85+)

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Calendars & Events
```
GET    /api/calendars
POST   /api/calendars
GET    /api/events?start=&end=&calendarId=
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
```

### Health Tracking
```
GET    /api/vitals
POST   /api/vitals
GET    /api/medications
POST   /api/medications/:id/log-dose
GET    /api/meals
POST   /api/meals
GET    /api/sleep
POST   /api/sleep
```

### Therapist (Auth Required)
```
GET    /api/patients
POST   /api/patients
GET    /api/exercises
POST   /api/exercises
POST   /api/exercise-prescriptions
```

**Full API list:** See README.md or (when implemented) http://localhost:4000/api-docs

---

## 🧪 Development Commands

### Backend
```bash
cd backend

npm run dev         # Start dev server with nodemon
npm run build       # Compile TypeScript → dist/
npm start           # Run production build
npm run migrate     # Run database migrations
npm run migrate:undo # Rollback last migration
npm test            # Run tests (not yet implemented)
```

### Frontend
```bash
cd frontend

npm run dev         # Start dev server (Vite)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

---

## 🐛 Common Issues & Fixes

### "Cannot find module '../config/passport'"
**Fix:** Remove OAuth routes or restore passport config
```bash
rm backend/src/routes/auth.ts
# Then remove OAuth route from backend/src/app.ts
```

### "Duplicate identifier 'Request'"
**Fix:** Remove duplicate import in polar.ts and samsung.ts
```typescript
// Change:
import express, { Request, Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';

// To:
import express, { Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';
```

### Frontend type errors
**Fix:** Update types in `frontend/src/types/index.ts` to match backend models
See IMMEDIATE_ACTION_PLAN.md for specific property additions.

### Database connection failed
**Check:**
1. PostgreSQL is running: `pg_isready`
2. Database exists: `psql -l | grep heart_recovery`
3. `.env` credentials are correct
4. Firewall allows port 5432

### Port already in use
```bash
# Find process using port
lsof -i :4000  # Backend
lsof -i :3000  # Frontend

# Kill process
kill -9 <PID>
```

---

## 🔐 Environment Variables

### Backend (.env)
```bash
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=heart_recovery_calendar
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=generate_a_secure_random_string_here
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Optional
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
TWILIO_ACCOUNT_SID=...
FIREBASE_PROJECT_ID=...
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=Heart Recovery Calendar
VITE_APP_URL=http://localhost:3000
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 User Roles

| Role | Access |
|------|--------|
| **patient** | Personal calendar, vitals, meds, meals, exercises assigned to them |
| **therapist** | All patient features + patient management + exercise library |
| **admin** | Full system access (not fully implemented) |

---

## 🧪 Test Data

**Create test users:**
```javascript
// In backend, run:
const { User } = require('./src/models');

await User.create({
  email: 'patient@test.com',
  password: 'test123',  // Will be hashed
  name: 'Test Patient',
  role: 'patient'
});

await User.create({
  email: 'therapist@test.com',
  password: 'test123',
  name: 'Dr. Therapist',
  role: 'therapist'
});
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| README.md | Main documentation, setup guide |
| CODE_REVIEW_FINDINGS.md | Comprehensive code analysis |
| IMMEDIATE_ACTION_PLAN.md | Critical fixes needed |
| SETUP.md | Detailed setup instructions |
| DEPLOYMENT_GUIDE.md | Production deployment |
| Recovery-Improvements-List.txt | Full feature list (419 features) |

---

## 🎨 UI Components

**Color Scheme:**
- Primary: Blue gradient (bg-gradient-to-br from-blue-500)
- Success: Green
- Warning: Yellow
- Danger: Red
- Glass-morphism effects throughout

**Key Components:**
- Button variants: primary, secondary, success, danger, glass
- Cards with glass-morphism styling
- Modal dialogs
- Toast notifications (react-hot-toast)
- Charts (recharts library)
- Calendar (FullCalendar)

---

## 🔍 Debugging

### Enable SQL Logging
```javascript
// backend/src/config/database.js
module.exports = {
  development: {
    logging: console.log  // Enable
    // logging: false     // Disable
  }
}
```

### Browser DevTools
- React DevTools: Inspect component tree
- Redux DevTools: Not applicable (using Context API)
- Network tab: Check API requests/responses

### Backend Logging
```typescript
// Add to any controller
console.log('Debug:', JSON.stringify(data, null, 2));
```

---

## 🚢 Deployment Checklist

Before deploying to production:

- [ ] Fix all build errors (CRITICAL)
- [ ] Run npm audit and fix vulnerabilities
- [ ] Set strong JWT_SECRET (32+ random characters)
- [ ] Configure production database credentials
- [ ] Set CORS_ORIGIN to production domain
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring (error tracking, uptime)
- [ ] Test all critical user flows
- [ ] Run performance testing
- [ ] Create deployment rollback plan

---

## 📞 Getting Help

1. **Check Documentation:**
   - README.md for general info
   - IMMEDIATE_ACTION_PLAN.md for fixing build errors
   - CODE_REVIEW_FINDINGS.md for detailed analysis

2. **Common Errors:**
   - Build errors → See IMMEDIATE_ACTION_PLAN.md
   - Type errors → Check frontend/src/types/index.ts
   - Database errors → Verify .env credentials

3. **Report Issues:**
   - GitHub Issues: https://github.com/johndesautels1/Heart-Recovery-Calender/issues
   - Include: error message, steps to reproduce, environment details

---

## 📈 Metrics

| Metric | Value |
|--------|-------|
| Total LOC | ~45,000 |
| Backend Files | ~80 |
| Frontend Files | ~120 |
| Database Tables | 27 |
| API Endpoints | 85+ |
| Pages | 21 |
| Features Implemented | 144/419 (34%) |
| Test Coverage | 0% (needs implementation) |

---

**Quick Tip:** Keep this file open in a second monitor for fast reference while developing!

**Status:** 🔴 Application requires fixes before it can run. See IMMEDIATE_ACTION_PLAN.md first.
