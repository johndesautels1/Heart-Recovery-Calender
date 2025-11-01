# Immediate Action Plan - Heart Recovery Calendar

**Created:** November 1, 2025  
**Status:** 🔴 CRITICAL - Application Cannot Build

---

## ⚠️ CRITICAL BLOCKERS (Must Fix to Deploy)

### 1. Backend Build Failures (Priority: 🔴 CRITICAL)

**Problem:** Backend has 8 TypeScript compilation errors preventing build.

#### Fix 1: Remove Passport OAuth (2 hours)
```bash
# Option A: Remove OAuth routes entirely
rm backend/src/routes/auth.ts

# Then remove from app.ts:
# - import authRoutes from './routes/auth';
# - app.use('/api/auth/oauth', authRoutes);
```

OR

```bash
# Option B: Restore passport config
mv backend/src/config/passport.ts.disabled backend/src/config/passport.ts
```

**Files to modify:**
- `backend/src/routes/auth.ts` - Remove or fix imports
- `backend/src/app.ts` - Remove OAuth route if removing auth.ts

#### Fix 2: Fix Duplicate Request Imports (30 minutes)

**File:** `backend/src/routes/polar.ts`
```typescript
// ❌ WRONG
import express, { Request, Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';

// ✅ CORRECT
import express, { Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';
```

**File:** `backend/src/routes/samsung.ts`
```typescript
// Same fix as polar.ts
import express, { Response } from 'express';
import { authenticateToken, Request } from '../middleware/auth';
```

#### Fix 3: Fix RRule Import (15 minutes)

**File:** `backend/src/services/recurrenceService.ts`
```typescript
// ❌ WRONG
import { RRule } from 'rrule';
export const createRecurrenceRule = (options: RRule.Options) => {

// ✅ CORRECT
import { RRule, Options as RRuleOptions } from 'rrule';
export const createRecurrenceRule = (options: RRuleOptions) => {
```

**Test Command:**
```bash
cd backend && npm run build
```

---

### 2. Frontend Build Failures (Priority: 🔴 CRITICAL)

**Problem:** Frontend has 78+ TypeScript errors preventing build.

#### Strategy: Fix Type Definitions (4-6 hours)

**Root Cause:** Type definitions in `frontend/src/types/index.ts` don't match:
1. Backend model schemas
2. API response formats
3. Component prop expectations

**Action Plan:**

1. **Generate Types from Backend Models** (2 hours)
   - Create script to auto-generate TypeScript interfaces from Sequelize models
   - OR manually update types to match backend

2. **Fix Critical Type Errors** (2-3 hours)
   - Add missing properties:
     - `SleepLog.quality`
     - `CalendarEvent.userId`
     - `VitalsSample.recordedAt`
     - `MealEntry.heartHealthRating`
     - `Medication.effectiveness`, `monthlyCost`, `isOTC`
     - `Patient.startingWeight`, `targetWeight`
   
3. **Fix Import Errors** (30 minutes)
   - Add missing `parseISO` import from date-fns in DashboardPage.tsx
   - Fix button variant types (change "outline" to valid variant)

4. **Fix Zod Schema Errors** (30 minutes)
   - Update RegisterPage.tsx Zod enum usage for React 19 compatibility

**Quick Win - Start Here:**

```typescript
// frontend/src/types/index.ts - Add missing properties

export interface SleepLog {
  id: number;
  userId: number;
  date: string;
  bedTime: string;
  wakeTime: string;
  hoursSlept: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';  // ← ADD THIS
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  calendarId: number;
  userId: number;  // ← ADD THIS
  title: string;
  // ... rest of properties
}

export interface VitalsSample {
  id: number;
  userId: number;
  recordedAt: string;  // ← ADD THIS (or rename from 'timestamp')
  // ... rest of properties
}

// Add more missing properties...
```

**Test Command:**
```bash
cd frontend && npm run build
```

---

### 3. Security Vulnerabilities (Priority: 🔴 CRITICAL)

**Problem:** 8 npm vulnerabilities (4 critical, 3 high, 1 moderate)

#### Action: Update Dependencies (1-2 hours)

```bash
cd backend

# Review what will change
npm audit fix --dry-run

# Apply fixes (may have breaking changes)
npm audit fix --force

# Test that backend still works
npm run build
npm run dev
```

**Breaking Changes Expected:**
- firebase-admin: 11.x → 13.5.0
- nodemon: 2.x → 3.1.10
- nodemailer: <7.0.7 → 7.0.10

**Action Required After Update:**
1. Test OAuth flows (if using firebase-admin)
2. Check nodemon watch patterns still work
3. Test email sending (if using nodemailer)

---

### 4. Remove Weak JWT Secret Fallback (Priority: 🟡 HIGH)

**Problem:** Hardcoded fallback 'your-secret-key' is a security risk.

**Files to Fix:**
- `backend/src/controllers/authController.ts` (2 occurrences)
- `backend/src/middleware/auth.ts` (2 occurrences)

```typescript
// ❌ DANGEROUS - Remove fallback
const secret = process.env.JWT_SECRET || 'your-secret-key';

// ✅ SAFE - Fail fast if missing
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**Better Approach - Add Startup Validation:**

Create `backend/src/config/env.ts`:
```typescript
export function validateEnv() {
  const required = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

Call in `backend/src/app.ts` or `server.ts` at startup:
```typescript
import { validateEnv } from './config/env';

validateEnv(); // Fail fast if env vars missing
```

---

### 5. Clean Up Repository (Priority: 🟡 HIGH)

**Problem:** Backup files committed to source control

**Files to Remove:**
```bash
git rm frontend/src/pages/ProfilePage.tsx.backup
git rm frontend/src/pages/ProfilePage_old.tsx
git rm frontend/src/pages/RegisterPage.tsx.backup
git rm backend/src/controllers/mealController.ts.backup
git commit -m "Remove backup files from source control"
```

**Update .gitignore:**
```
# Add to .gitignore
*.backup
*_old.*
*_backup.*
```

---

## 🔍 VERIFICATION CHECKLIST

After completing fixes above, verify:

- [ ] Backend builds successfully: `cd backend && npm run build`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] No TypeScript errors in either project
- [ ] Backend starts: `cd backend && npm run dev`
- [ ] Frontend starts: `cd frontend && npm run dev`
- [ ] Can register a new user
- [ ] Can login
- [ ] Can create a calendar event
- [ ] No console errors on page load
- [ ] npm audit shows 0 vulnerabilities

---

## 📊 ESTIMATED TIMELINE

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Fix backend build errors | 🔴 CRITICAL | 2-3 hours | None |
| Fix frontend type errors | 🔴 CRITICAL | 4-6 hours | Backend types |
| Update vulnerable dependencies | 🔴 CRITICAL | 1-2 hours | Build fixes |
| Remove weak JWT fallback | 🟡 HIGH | 30 min | None |
| Clean up backup files | 🟡 HIGH | 15 min | None |
| **TOTAL** | | **8-12 hours** | |

---

## 🚀 NEXT STEPS AFTER FIXES

Once the application builds and runs:

1. **Add Tests** (see CODE_REVIEW_FINDINGS.md section 10.2)
2. **Set Up CI/CD** (GitHub Actions for automated testing)
3. **Add API Documentation** (Swagger/OpenAPI)
4. **Enable TypeScript Strict Mode** (incrementally)
5. **Implement Missing Features** (see Recovery-Improvements-List.txt)

---

## 📞 NEED HELP?

If you encounter issues:

1. Check error messages carefully
2. Verify all environment variables are set (`.env` files)
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check Node.js version: `node --version` (should be v18+)
5. Check PostgreSQL is running and accessible

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Status:** 🔴 CRITICAL - Awaiting Fixes
