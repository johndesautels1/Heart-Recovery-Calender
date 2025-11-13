# Architecture Decision Record: Entity Consolidation Strategy

**Status**: Accepted
**Date**: 2025-11-13
**Decision Makers**: Development Team
**Stakeholders**: Physical Therapists, Patients, Product Team

---

## Context and Problem Statement

The Heart Recovery Calendar application currently has a **critical architecture flaw** where user identity is split across two separate entities:

1. **User Model** (`backend/src/models/User.ts`)
   - Base authentication entity
   - 22 fields including: id, email, password, name, role, surgeryDate, dateOfBirth, gender
   - Correct implementation for authentication and role-based access control

2. **Patient Model** (`backend/src/models/Patient.ts`)
   - Extended medical data entity
   - 105+ fields that **duplicate** User fields
   - Includes: id, userId (nullable FK), name, email, surgeryDate (DUPLICATE), plus 100+ medical fields

**Problems Identified**:
- Patient duplicates 105+ User fields with **no synchronization mechanism**
- Dual surgery dates: `User.surgeryDate` vs `Patient.surgeryDate` (no sync)
- Foreign key inconsistency: 24 tables use `userId`, 2 tables use `patientId` (incompatible)
- Database triggers reference `Patient.surgeryDate` instead of `User.surgeryDate`
- 3x redundant API calls on page load (`checkPatientProfile()` called multiple times)
- Orphaned records risk: `Patient.userId` can be NULL
- Data integrity issues: No constraints ensure User ↔ Patient consistency

**Audit Evidence**:
- See `ENTITY_ARCHITECTURE_AUDIT_REPORT.md` for comprehensive findings from 5 specialized agents
- See `SURGERY_DATE_AUDIT_REPORT.md` for surgery date propagation issues

**Timeline Constraint**: 2 days maximum for production-ready implementation
**Data Constraint**: Willing to wipe all existing user/patient/therapist/admin data
**Quality Requirement**: Industry-standard code quality, code-review ready

---

## Decision Drivers

1. **Single Source of Truth**: One user entity, one surgery date
2. **Data Integrity**: Eliminate sync issues and orphaned records
3. **Simplicity**: Reduce cognitive load for future developers
4. **Performance**: Eliminate redundant API calls and JOINs
5. **Scalability**: Clean architecture for app store distribution
6. **Maintainability**: Industry best practices for professional code review
7. **Timeline**: Must complete in 2 days with data wipe acceptable

---

## Considered Options

### Option A: Keep Patient Model with Sync Mechanism
**Approach**: Maintain dual entities, add synchronization triggers/hooks

**Pros**:
- Less migration work upfront
- Familiar to existing codebase

**Cons**:
- Ongoing maintenance burden (sync triggers for every field)
- Continued foreign key confusion (userId vs patientId)
- Complex data integrity constraints
- Does NOT fix root cause
- Technical debt persists

**Verdict**: ❌ REJECTED - Does not meet "industry quality" requirement

---

### Option B: Consolidate into User Model (CHOSEN)
**Approach**: User is the **single source of truth**, extended with JSONB for patient-specific data

**Architecture**:
```sql
-- User Model (Single Source of Truth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('patient', 'therapist', 'admin')),

  -- Core medical fields (for all patient users)
  surgeryDate DATE,           -- Single source of truth
  dateOfBirth DATE,
  gender VARCHAR,

  -- Therapist assignment (for patient users)
  therapistId UUID REFERENCES users(id),  -- FK to User with role='therapist'

  -- Extended patient data (JSONB for flexibility)
  medicalData JSONB,  -- Stores 100+ patient-specific fields

  -- Timestamps
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Example medicalData JSONB structure:
{
  "height": 175,
  "weight": 70,
  "bloodType": "A+",
  "allergies": ["penicillin"],
  "medications": [...],
  "chronicConditions": [...],
  "emergencyContact": {...}
}
```

**Foreign Key Strategy**:
- ALL tables use `userId` (no more `patientId`)
- `ExerciseLog`, `ExercisePrescription`, etc. reference `users.id`

**Role-Based Access**:
- User.role ENUM: 'patient', 'therapist', 'admin'
- Therapists: Query `SELECT * FROM users WHERE role='patient' AND therapistId = ?`
- Admins: Full access across all users

**Pros**:
- ✅ Single source of truth for user identity
- ✅ Single source of truth for surgery date
- ✅ Eliminates 105+ duplicate fields
- ✅ No sync issues (data exists in one place)
- ✅ Consistent foreign keys (all use userId)
- ✅ Simpler queries (no unnecessary JOINs)
- ✅ JSONB flexibility for patient-specific fields
- ✅ Clean architecture for code review
- ✅ Scalable for app store distribution

**Cons**:
- Requires migration of existing Patient data to User.medicalData JSONB
- Need to update 2 tables (ExerciseLog, ExercisePrescription) from patientId → userId
- Need to update 4 database triggers to reference User.surgeryDate

**Migration Complexity**: MEDIUM (2-3 hours with data wipe)

**Verdict**: ✅ ACCEPTED - Best long-term solution, meets quality requirements

---

## Decision Outcome

**Chosen Option**: **Option B - Consolidate into User Model**

### Implementation Strategy

**Phase 1: Database Schema (Day 1)**

1. **Create Reversible Migration**
   - Add `medicalData JSONB` column to User model
   - Add `therapistId UUID` FK to User model
   - Create indexes: `idx_users_role`, `idx_users_therapist_id`, `idx_users_surgery_date`
   - Migration should be **reversible** (up/down scripts)

2. **Update Database Triggers** (4 triggers)
   - `calculate_vitals_post_surgery_day`
   - `calculate_meals_post_surgery_day`
   - `calculate_sleep_post_surgery_day`
   - `calculate_medications_post_surgery_day`
   - Change: `SELECT p."surgeryDate" FROM patients p` → `SELECT u."surgeryDate" FROM users u`

3. **Update Foreign Keys** (2 tables)
   - `ExerciseLog`: Change `patientId` → `userId` (FK to users.id)
   - `ExercisePrescription`: Change `patientId` → `userId` (FK to users.id)

4. **Drop Patient Model**
   - Remove `backend/src/models/Patient.ts`
   - Drop `patients` table
   - Update associations in User model

**Phase 2: Backend Controllers (Day 1 Evening - 5 Agents)**

Launch 5 agents to parallelize controller updates:
- Agent 1: Vitals + Calendar controllers (2 files)
- Agent 2: Meals + Sleep controllers (2 files)
- Agent 3: Medications + ExerciseLogs controllers (2 files)
- Agent 4: ExercisePrescriptions + EducationProgress controllers (2 files)
- Agent 5: AuthController + PatientController consolidation (2 files)

**Surgery Date Default Pattern** (apply to ALL 18 endpoints):
```typescript
// BEFORE (broken):
if (start || end) {
  where.timestamp = {};
  if (start) where.timestamp[Op.gte] = new Date(start);
  if (end) where.timestamp[Op.lte] = new Date(end);
}

// AFTER (correct):
const user = await User.findByPk(userId);
if (!user?.surgeryDate) {
  return res.status(400).json({ error: 'Surgery date required' });
}

const startDate = start ? new Date(start) : new Date(user.surgeryDate);
const endDate = end ? new Date(end) : addMonths(new Date(), 1);

where.timestamp = {
  [Op.gte]: startDate,
  [Op.lte]: endDate
};
```

**Phase 3: Frontend Refactor (Day 2)**

1. **Create Professional SessionContext**
   - Merge AuthContext + PatientSelectionContext
   - Single `useSession()` hook exports: `{ user, selectedPatient, isTherapist, isAdmin }`
   - Eliminate 3x redundant `checkPatientProfile()` calls

2. **Create Custom Hooks**
   - `useSurgeryDate()`: Returns surgery date with fallback logic
   - `usePatientData()`: Returns patient medical data from JSONB
   - `useDateRange()`: Returns (startDate, endDate) based on timeView

3. **Fix Critical Page Bugs**
   - **DashboardPage.tsx** (lines 334-429): Fix 12-week chart to go FORWARD from surgery date
   - **VitalsPage.tsx**: Already gold standard, minor cleanup
   - **MealsPage.tsx**: Apply surgery date defaults
   - **MedicationsPage.tsx**: Apply surgery date defaults

**Phase 4: Integration Testing (Day 2 End)**
- ESLint: No warnings
- TypeScript: Strict mode, no `any` types
- Prettier: Consistent formatting
- Manual testing: All critical user flows
- Documentation: Update API docs

---

## Quality Standards

### Code Quality Checklist
- [ ] **ESLint**: 0 warnings, 0 errors
- [ ] **TypeScript**: Strict mode enabled, no `any` types
- [ ] **Prettier**: Consistent formatting (100% of files)
- [ ] **JSDoc**: All public functions documented
- [ ] **Error Handling**: Try-catch with proper error messages
- [ ] **Testing**: 80%+ coverage for critical paths
- [ ] **Migrations**: Reversible with proper rollback
- [ ] **No `console.log`**: Use proper logging library
- [ ] **Security**: No SQL injection, XSS, or OWASP top 10 vulnerabilities
- [ ] **Performance**: No N+1 queries, proper indexing

### Success Criteria
1. ✅ Single User entity (Patient model removed)
2. ✅ Single surgery date source of truth (User.surgeryDate)
3. ✅ All tables use userId FK (no patientId)
4. ✅ All 4 database triggers use User.surgeryDate
5. ✅ All 18 controllers default to surgery date range
6. ✅ DashboardPage 12-week chart goes FORWARD from surgery date
7. ✅ No redundant API calls (SessionContext optimized)
8. ✅ Code passes professional review standards

---

## Consequences

### Positive
- **Data Integrity**: Single source of truth eliminates sync issues
- **Simplicity**: 105+ fewer duplicate fields
- **Performance**: Fewer JOINs, optimized queries
- **Maintainability**: Clear architecture for future developers
- **Scalability**: Clean design for app store distribution
- **Quality**: Code-review ready for professional evaluation

### Negative
- **Migration Time**: 2 days intensive work
- **Data Loss**: Existing patient/user/therapist/admin data will be wiped
- **Learning Curve**: Team must understand new JSONB medicalData structure
- **Testing**: Requires comprehensive testing of all user flows

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration fails mid-process | HIGH | Reversible migrations with rollback scripts |
| JSONB query performance | MEDIUM | Create GIN indexes on medicalData JSONB fields |
| Missing patient fields in JSONB | LOW | Document JSONB schema in ADR and API docs |
| Frontend breaks during refactor | HIGH | Incremental deployment, feature flags if needed |
| TypeScript errors after model changes | MEDIUM | Update types first, then implementation |

---

## References

- **ENTITY_ARCHITECTURE_AUDIT_REPORT.md**: 5-agent audit findings
- **SURGERY_DATE_AUDIT_REPORT.md**: Surgery date propagation issues
- **MASTER_TODO_LIST.md**: Implementation task breakdown
- **PostgreSQL JSONB Documentation**: https://www.postgresql.org/docs/current/datatype-json.html
- **Sequelize JSONB Support**: https://sequelize.org/docs/v6/other-topics/other-data-types/#json--jsonb

---

## Notes

**Data Wipe Confirmation**: User confirmed willing to wipe all existing user/patient/therapist/admin records for clean architecture.

**Timeline**: 2 days maximum
- Day 1: Database architecture & controller updates
- Day 2: Frontend refactor & integration testing

**Quality Requirement**: "We need an industry quality product if software guys go through the code we cannot have 'you build shit code sir'" - User requirement for professional code quality.

---

**Approved By**: Development Team
**Implementation Start**: 2025-11-13
**Expected Completion**: 2025-11-15
