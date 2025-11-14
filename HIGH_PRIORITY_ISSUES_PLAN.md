# HIGH PRIORITY ISSUES ACTION PLAN
**Date**: November 13, 2025
**Source**: ENTITY_ARCHITECTURE_AUDIT_REPORT.md
**Classification**: Documentation Only - No Code Changes

---

## EXECUTIVE SUMMARY

Three HIGH priority issues threaten data integrity and application performance:

1. **100+ Duplicate Fields in Patient Model** - Core architectural flaw
2. **No Automatic Sync between User and Patient** - Manual sync creates drift
3. **CalendarEvent Naming Confusion** - Field semantics are misleading

**Combined Impact**: Data loss risk, performance degradation, orphaned records
**Total Estimated Fix Effort**: 3-5 weeks
**Fix Order**: Issue #3 → Issue #2 → Issue #1

---

## ISSUE #1: 100+ DUPLICATE FIELDS IN PATIENT MODEL

### Severity Level
**🔴 HIGH** - Architectural flaw impacting entire system

### Issue Description

The Patient model contains 105+ duplicate fields that already exist in the User model:

**Duplicate Core Fields:**
- `name` (required in both)
- `email` (required in both)
- `surgeryDate` (optional in both)
- `dateOfBirth` (optional in both)
- `gender` (optional in both)

**Duplicate Medical History Fields** (100+ additional):
- Measurement fields (height, weight, etc.)
- Medical history entries
- Contact information
- Insurance details
- Emergency contacts

### Current System State

**User Model** (`backend/src/models/User.ts`):
- 22 fields total
- Contains core patient data (surgeryDate, dateOfBirth, gender)
- Used by 24 tables as foreign key
- Single source of truth for authentication

**Patient Model** (`backend/src/models/Patient.ts`):
- 105+ fields total
- Contains identical core fields (surgeryDate, dateOfBirth, gender)
- Used by 2 tables (ExerciseLogs, ExercisePrescriptions)
- Contains extended medical history (legitimate use)
- Has relationship to User via `userId` (nullable) and `therapistId`

### Current Impact on Application

#### 1. Data Integrity Risks
- **Field Divergence**: User.surgeryDate can differ from Patient.surgeryDate
  - Example: User profile updated to "2024-05-15" but Patient still shows "2024-05-10"
  - Affects all 4 database triggers that calculate post-surgery days
- **Multiple Sources of Truth**: No code-level or database-level enforcement of sync
- **Orphaned Records Risk**: Patient.userId can be NULL, making records inaccessible

#### 2. Frontend Complexity
- **105+ Fallback Patterns**: Code throughout frontend follows pattern:
  ```typescript
  const surgeryDate = patientData?.surgeryDate || user?.surgeryDate;
  ```
  - Found in 100+ locations across pages and components
  - Creates two possible values for every field
  - Makes debugging difficult (which value is actually being used?)

- **Example from VitalsPage.tsx (line 368)**:
  ```typescript
  const surgeryDate = patientData?.surgeryDate || user?.surgeryDate;
  const weight = patientData?.weight || user?.weight;
  ```

#### 3. API Response Bloat
- Every patient load returns duplicate data
- Network efficiency decreased
- Type definitions are confusing (User type vs Patient type)

#### 4. Database Schema Confusion
- **Foreign Key Inconsistency**:
  - 24 tables use `userId` (correct)
  - 2 tables use `patientId` (incorrect - should be userId)
  - Mixed references create inconsistent access patterns

- **Profile Update Complications**:
  - ProfileEditModal saves to User.surgeryDate
  - No guarantee Patient.surgeryDate gets updated
  - Creates gradual field divergence

### Root Cause Analysis

**Why This Happened:**
- Patient model was created to extend User with additional medical data
- Original design intended Patient as "extended profile"
- Core fields were duplicated instead of referenced
- No synchronization mechanism was ever implemented

**Why It's Hard to Fix:**
- 105+ field migration requires careful data mapping
- Existing code expects both User and Patient objects
- Frontend has conditional logic for both sources
- Database migrations would be complex

### Data Synchronization Status

**Current**: ❌ NONE
**Needed**: Automatic sync for 5 core fields (name, email, surgeryDate, dateOfBirth, gender)

**Evidence of Drift Risk:**
- Migration 20251111000001 fixed many NULL values in Patient.userId
- Indicates previous data corruption from missing records
- No query found that audits for field divergence

### Recommended Fix Approach

#### Short-Term Solution (1-2 weeks)
**Goal**: Stop duplicate field divergence immediately

1. **Establish User as Single Source of Truth**
   - All 5 core fields (name, email, surgeryDate, dateOfBirth, gender) read from User only
   - Keep Patient table for extended medical data only
   - Update ProfileEditModal to only write to User fields

2. **Add Frontend Consolidation**
   - Remove Patient object from AuthContext
   - Patient selection returns extended data only
   - All core fields accessed via user object

3. **Remove Fallback Patterns**
   - Replace `patientData?.surgeryDate || user?.surgeryDate`
   - Use single source: `user?.surgeryDate`
   - Reduces 100+ locations of code complexity

4. **Effort**: 2-3 weeks (frontend changes minimal, backend simple)

#### Long-Term Solution (8-10 weeks)
**Goal**: Complete architectural consolidation

1. **Merge Patient into User** (Option A from audit)
   - Add 100+ medical fields to User table
   - Migrate all Patient data to User
   - Delete Patient table
   - Update all controllers and relationships

2. **Or Hybrid Approach** (Option C from audit - RECOMMENDED)
   - Keep Patient table for extended data only
   - Remove duplicate core fields from Patient
   - Make User.surgeryDate source of truth
   - Update ExerciseLogs to use userId instead of patientId
   - Effort: 3-5 weeks, lower risk

### Dependencies

**Before Fixing This Issue:**
- None (can fix independently)

**Issues This Blocks:**
- Issue #2 (No Automatic Sync) - depends on consolidating what needs to sync
- Issue #3 (CalendarEvent naming) - affected by field confusion

**Other Code Requiring Updates:**
- ProfileEditModal (saves to User.surgeryDate only)
- All 100+ frontend locations with fallback patterns
- Patient model definition (remove duplicate fields)
- Controllers querying Patient fields

### Estimated Effort

| Approach | Effort | Risk | Timeline |
|----------|--------|------|----------|
| Short-term (establish User as source) | 2-3 weeks | LOW | Weeks 1-3 |
| Long-term Option C (hybrid) | 3-5 weeks | MEDIUM | Weeks 4-8 |
| Full consolidation Option A | 8-10 weeks | MEDIUM-HIGH | Weeks 9-18 |

---

## ISSUE #2: NO AUTOMATIC SYNC BETWEEN USER AND PATIENT

### Severity Level
**⚠️ HIGH** - Data integrity risk at runtime

### Issue Description

User and Patient tables contain duplicate fields with **zero synchronization mechanism**:

**Core Duplicate Fields:**
- name
- email
- surgeryDate
- dateOfBirth
- gender

**Current State**: Manual updates required - can diverge at any time

### Current System State

**Sync Mechanisms Implemented**: 0
- ❌ No Sequelize hooks on User.update()
- ❌ No database triggers for automatic sync
- ❌ No frontend code that syncs fields
- ❌ No audit logging of field changes

**Evidence from Audit:**
```
| Field | User | Patient | Sync Mechanism | Risk |
|-------|------|---------|----------------|------|
| name | Required | Required | ❌ NONE | HIGH |
| email | Required | Optional | ❌ NONE | HIGH |
| surgeryDate | Optional | Optional | ❌ NONE | HIGH |
| dateOfBirth | Optional | Optional | ❌ NONE | MEDIUM |
| gender | Optional | Optional | ❌ NONE | MEDIUM |
```

### Current Impact on Application

#### 1. Data Divergence Risk - CRITICAL

**Scenario A: ProfileEditModal Updates User**
```
User (id=42):
  name: "John Doe"
  surgeryDate: "2024-05-15"

Patient (id=7, userId=42):
  name: "John Doe"
  surgeryDate: "2024-05-10"  ← DIFFERENT VALUE!
```

**Impact**:
- Surgery day calculations use different dates
- One version is "correct", other is stale
- No way to know which is authoritative

**Scenario B: Direct Database Update**
```
Admin runs: UPDATE users SET surgeryDate = '2024-04-01' WHERE id = 42;
Patient.surgeryDate remains '2024-05-15'
→ All calculations based on Patient.surgeryDate now wrong
```

#### 2. Database Trigger Failures

All 4 triggers reference `Patient.surgeryDate`:
```sql
SELECT p."surgeryDate" INTO surgery_date
FROM patients p
WHERE p."userId" = NEW."userId";
```

**Triggers Affected:**
- calculate_vitals_post_surgery_day
- calculate_meals_post_surgery_day
- calculate_sleep_post_surgery_day
- calculate_medications_post_surgery_day

**Problem**: If User.surgeryDate is updated but Patient.surgeryDate isn't, triggers will use stale value

#### 3. API Inconsistency

Different endpoints return different surgery dates:
- `GET /api/me` → returns User.surgeryDate (source of truth for auth)
- `GET /api/patients?userId={id}` → returns Patient.surgeryDate (extended profile)

**Frontend Receives Two Values:**
```typescript
const user = await api.getMe();  // surgeryDate: "2024-05-15"
const patient = await api.getPatientProfile();  // surgeryDate: "2024-05-10"
→ Which one to use?
```

#### 4. Registration Flow Inconsistency

**Flow 1: Patient Self-Registration**
1. Creates User record (with surgeryDate)
2. Calls `/api/patients/complete-profile`
3. Creates separate Patient record (with surgeryDate)
4. **No link-up between the two**

**Flow 2: Therapist Creates Patient**
1. Creates Patient first
2. Creates User linked via Patient.userId
3. **Creates initial divergence**

#### 5. Editing Complications

**ProfileEditModal** (CardiacRecoveryApp.jsx lines 1203-1328):
```typescript
const handleSave = async (updatedProfile) => {
  // Only updates User.surgeryDate
  await updateUserProfile({
    name: updatedProfile.name,
    surgeryDate: updatedProfile.surgeryDate
  });

  // Patient.surgeryDate never updated!
  // CloudSyncService may or may not sync it
};
```

**No guarantee that Patient gets updated**

### Root Cause Analysis

**Why No Sync Was Implemented:**
1. Patient table created as afterthought for extended profile
2. No explicit decision to keep fields in sync
3. Frontend handles divergence with fallback patterns (workaround)
4. Lack of enforcement at database level

**Why It's Hard to Fix:**
1. Difficult to implement in running system without downtime
2. Must choose which is source of truth (User vs Patient)
3. Existing code already adapted to divergence (fallback patterns)
4. Historical data may already be diverged

### Recommended Fix Approach

#### Short-Term Solution (1-2 weeks)
**Goal**: Establish User as single source of truth, eliminate Patient duplicates

1. **Step 1: Establish Source of Truth**
   - Declare User fields as authoritative
   - Patient fields become read-only caches (deprecated)
   - All writes go to User table only

2. **Step 2: Add Data Audit**
   - Query to find divergent records:
   ```sql
   SELECT u.id, u.name as user_name, p.name as patient_name,
          u.surgeryDate as user_surgery, p.surgeryDate as patient_surgery
   FROM users u
   INNER JOIN patients p ON p.userId = u.id
   WHERE u.name != p.name OR u.surgeryDate != p.surgeryDate;
   ```
   - Fix identified divergences (use User values as correct)
   - Log changes for audit trail

3. **Step 3: Update Controllers**
   - ExerciseLogs, HydrationLogs, CaloriesController
   - Query User table for surgeryDate instead of Patient
   - Keep Patient for extended medical data only

4. **Step 4: Frontend Changes**
   - Remove Patient from AuthContext
   - Use user.surgeryDate everywhere
   - Remove 100+ fallback patterns

5. **Effort**: 1-2 weeks

#### Medium-Term Solution (2-3 weeks)
**Goal**: Add enforcement if keeping dual system

If organization decides to keep both tables:

1. **Database-Level Sync**
   ```sql
   CREATE TRIGGER sync_user_to_patient_on_update
   AFTER UPDATE ON users
   FOR EACH ROW
   BEGIN
     UPDATE patients
     SET name = NEW.name,
         email = NEW.email,
         surgeryDate = NEW.surgeryDate,
         dateOfBirth = NEW.dateOfBirth,
         gender = NEW.gender
     WHERE userId = NEW.id;
   END;
   ```

2. **Reverse Sync (Dangerous - not recommended)**
   ```sql
   CREATE TRIGGER sync_patient_to_user_on_update
   AFTER UPDATE ON patients
   FOR EACH ROW
   BEGIN
     UPDATE users
     SET name = NEW.name,
         surgeryDate = NEW.surgeryDate
     WHERE id = NEW.userId;
   END;
   ```
   ⚠️ Risk: Creates bidirectional sync complexity

3. **Application-Level Hooks (Sequelize)**
   ```typescript
   User.addHook('afterUpdate', 'syncToPatient', async (user) => {
     if (user.changed('surgeryDate') || user.changed('name') || ...) {
       await Patient.update({
         name: user.name,
         surgeryDate: user.surgeryDate,
         // ... other fields
       }, { where: { userId: user.id } });
     }
   });
   ```

4. **Effort**: 2-3 weeks (includes testing of complex sync logic)

#### Long-Term Solution (8-10 weeks)
**Goal**: Remove duplication entirely (Option A from audit)
- Merge Patient into User
- Delete Patient table
- Update all foreign keys
- Full schema migration

### Dependencies

**Before Fixing This Issue:**
- Issue #1 should be partially addressed (identify source of truth)
- Issue #3 has no dependency on this

**Issues This Unblocks:**
- Issue #1 mitigation (establishes sync mechanism)
- Full system consolidation (enables cleaner merge)

**Blocking Issues:**
- Exercise data inconsistency (Issue #3 related)
- Database trigger accuracy

### Estimated Effort

| Approach | Effort | Risk | Complexity |
|----------|--------|------|-----------|
| Short-term (User as source) | 1-2 weeks | LOW | Simple |
| Medium-term (Database sync) | 2-3 weeks | MEDIUM | Complex |
| Long-term (Full merge) | 8-10 weeks | MEDIUM-HIGH | Very Complex |

---

## ISSUE #3: CALENDAR EVENT NAMING CONFUSION (patientId References User.id)

### Severity Level
**⚠️ HIGH** - Naming/semantics confusion, moderate data integrity impact

### Issue Description

The CalendarEvent model contains a field named `patientId` that actually references `User.id`, not `Patient.id`:

**Database Schema Issue:**
```sql
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  patientId INTEGER REFERENCES users(id),  ← confusing! Should be userId
  eventType VARCHAR,
  ...
);
```

**The Problem:**
- Field is named `patientId` (implies Patient table reference)
- Actually stores `users.id` (references User table)
- Creates semantic confusion in code
- Inconsistent with other tables using userId

### Current System State

**From Backend Models Audit:**
```
**Mixed References:**
- CAIReport has BOTH userId AND patientId
- CalendarEvent.patientId references users.id (NOT patients.id) - confusing naming
```

**Usage Pattern:**
```typescript
// In calendarController
const event = await CalendarEvent.create({
  userId: req.user.id,           // Therapist who created event
  patientId: selectedPatient.id,  // Patient the event is about
                                  // But selectedPatient.id is actually User.id!
});
```

**In Frontend (from audit):**
```typescript
// CalendarPage expects:
calendarEvent.patientId  // Expected to be Patient.id
              // Actually contains User.id

// But Patient.id !== User.id
// So code working is accidental!
```

### Current Impact on Application

#### 1. Code Confusion and Bugs

**Developer Understanding Breaks Down:**
```typescript
// Looking at this code:
const eventsByPatient = await CalendarEvent.findAll({
  where: { patientId: patient.id }
});

// Developer thinks: "Getting events for Patient id=42"
// Reality: "Getting events for User id=42"
// If Patient.id != User.id, query returns wrong results!
```

#### 2. Potential Query Errors

**Scenario: Therapist Selecting Different Patient**
```typescript
const selectedPatient = await Patient.findById(42);
const events = await CalendarEvent.findAll({
  where: { patientId: selectedPatient.id }  // selectedPatient.id = 42 (Patient.id)
});

// But CalendarEvent.patientId contains User.id!
// If Patient.id=42 maps to User.id=15
// Query returns: 0 results (wrong!)
```

**Evidence from Audit:**
```
Chain 3: Patient Data Access (DUAL PATH)
- Path A: Patient User logs in → userId=1 → direct access
- Path B: Therapist selects patient → userId=1 → same access

But if CalendarEvent stores patientId=User.id
And query uses patientId=Patient.id
→ Path B returns no results!
```

#### 3. Inconsistency with Other Tables

**All Other Tables Use userId Consistently:**
```
calendars → userId
meal_entries → userId
vitals_samples → userId
medications → userId
exercise_logs → patientId (DIFFERENT PROBLEM - uses Patient.id)
exercise_prescriptions → patientId (DIFFERENT PROBLEM - uses Patient.id)
```

**CalendarEvent:**
```
calendar_events → userId (correct)
calendar_events → patientId (wrong - should be removed or renamed)
```

#### 4. Migration Headache

When Issue #1 (duplication) is fixed:
- If Patient table is deleted/merged
- Code searching for `patientId` on CalendarEvent becomes invalid
- Field semantics must be corrected before that migration

#### 5. WebSocket Issues

**From Frontend Audit:**
```typescript
// WebSocketContext joins room with user.id
// But should track which patient therapist is viewing

useEffect(() => {
  socket.emit('join', { userId: user.id });
  // Missing: patientId (when therapist selects patient)
}, [user]);
```

**Real Problem:**
- Therapist selects Patient A
- WebSocket room is user.id (therapist's ID)
- If another therapist viewing same calendar
- Both see events, but shouldn't share private patient events

### Root Cause Analysis

**Why This Happened:**
1. Calendar designed to show both User and Patient events
2. userId = person viewing (Therapist or Patient)
3. patientId = person's data being displayed
4. Named patientId to indicate "patient perspective"
5. But inconsistent with Patient table foreign key semantics

**Why It's Hard to Fix:**
1. Requires understanding context (is patientId a User or Patient reference?)
2. Code has adapted to this confusion
3. Database migration needed if consolidated
4. Frontend must update all event queries

### Recommended Fix Approach

#### Immediate Fix (1 week)
**Goal**: Clarify semantics without major refactoring

1. **Rename Field in Database**
   ```sql
   ALTER TABLE calendar_events RENAME COLUMN patientId TO viewedAsUserId;
   ```

2. **Update Model Definition**
   ```typescript
   // Before
   calendar_events: {
     patientId: INTEGER
   }

   // After
   calendar_events: {
     viewedAsUserId: INTEGER  // References users.id
   }
   ```

3. **Update All Queries**
   ```typescript
   // Before
   where: { patientId: selectedPatient.id }

   // After
   where: { viewedAsUserId: selectedPatient.userId }
   ```

4. **Update Frontend**
   - Replace all references from `event.patientId` to `event.viewedAsUserId`
   - Add comment: `// viewedAsUserId = User.id for the patient being viewed`

5. **Effort**: 1 week (straightforward rename + find/replace)

#### Better Solution (2-3 weeks)
**Goal**: Redesign for clarity with therapist views

1. **Add Explicit Relationships**
   ```typescript
   CalendarEvent {
     id
     userId: FK users (person creating/owning event)
     relatedTo: ENUM('user', 'patient')  // What type of event
     relatedUserId: FK users (if viewing patient's data)
     therapistId: FK users (if therapist created it)
   }
   ```

2. **Clarify Event Types**
   ```typescript
   enum EventType {
     PATIENT_SCHEDULE = 'patient_schedule',      // Patient's own event
     THERAPIST_NOTE = 'therapist_note',          // Therapist viewing patient
     MEDICATION_REMINDER = 'medication_reminder' // System event
   }
   ```

3. **Frontend Updates**
   ```typescript
   // Clear intent
   const patientEvents = await CalendarEvent.findAll({
     where: {
       relatedTo: 'patient',
       relatedUserId: selectedPatient.userId
     }
   });
   ```

4. **WebSocket Improvements**
   ```typescript
   socket.emit('subscribe_to_patient', {
     therapistId: user.id,
     patientUserId: selectedPatient.userId
   });
   ```

5. **Effort**: 2-3 weeks (includes schema and semantic redesign)

#### Solution with Full Consolidation (Issue #1)
**Goal**: Fix during Patient→User migration

When Patient table is merged into User:
- Remove confusing field entirely
- Use only `userId` (person creating event)
- Use `eventRelatedToUserId` (person event is about)
- No more ambiguity

### Dependencies

**Before Fixing This Issue:**
- Issue #1 should be partially addressed for clarity
- ExerciseLog patientId issue (uses Patient.id correctly, opposite problem) doesn't block this

**Issues This Enables:**
- Cleaner database schema
- Proper therapist patient assignment
- Correct WebSocket room management

**Blocking Other Fixes:**
- None currently, but confusion delays both Issues #1 and #2 fixes

### Estimated Effort

| Approach | Effort | Risk | Clarity |
|----------|--------|------|---------|
| Immediate rename | 1 week | LOW | Moderate |
| Redesign with relations | 2-3 weeks | MEDIUM | High |
| Fix during consolidation | (part of Issue #1) | MEDIUM | High |

---

## PRIORITY SEQUENCING AND DEPENDENCIES

### Fix Order (Recommended)

**1. Issue #3 First (1 week)**
- Lowest risk, highest clarity gain
- Removes semantic confusion blocking other fixes
- Rename `patientId` → `viewedAsUserId`
- Unblocks Issues #1 and #2 decision-making

**2. Issue #2 Second (1-2 weeks)**
- Establish User as source of truth
- Add data audit query
- Update controllers to reference User.surgeryDate
- Removes field divergence risk

**3. Issue #1 Third (3-5 weeks)**
- Once Issues #2 and #3 clear naming confusion
- Implement Option C (hybrid) or Option A (full consolidation)
- Migrate to single source of truth
- Delete Patient duplicate fields

### Timeline Overview

```
Week 1: Issue #3 (CalendarEvent rename)
  └─ Rename field, update queries

Week 2-3: Issue #2 (Sync establishment)
  ├─ Audit for divergences
  ├─ Fix User as source of truth
  └─ Update controllers

Week 4-8: Issue #1 (Consolidation)
  ├─ Option C (hybrid): 3-4 weeks
  └─ Option A (full): 6-8 weeks
```

### Effort Summary

| Issue | Approach | Effort | Risk | Total Time |
|-------|----------|--------|------|-----------|
| #3 | Rename field | 1 week | LOW | Week 1 |
| #2 | User as source | 1-2 weeks | LOW | Weeks 2-3 |
| #1 | Option C (hybrid) | 3-5 weeks | MEDIUM | Weeks 4-8 |
| **TOTAL** | **3-phase approach** | **5-8 weeks** | **LOW-MEDIUM** | **2 months** |

---

## IMPLEMENTATION ROADMAP

### Phase 1: Semantic Clarity (Week 1)
**Owner**: Backend Team
**Deliverables**:
- CalendarEvent.patientId → viewedAsUserId rename complete
- All queries updated and tested
- No breaking changes to API

### Phase 2: Data Integrity (Weeks 2-3)
**Owner**: Backend + Database Team
**Deliverables**:
- Data audit completed (divergences identified)
- User established as source of truth
- Controllers updated to reference User fields
- Frontend fallback patterns removed

### Phase 3: Architecture Consolidation (Weeks 4-8)
**Owner**: Full Team
**Deliverables**:
- Option C (hybrid) implemented (recommended)
  - Patient table limited to extended medical data
  - ExerciseLogs migrated to userId
  - 100+ duplicate fields removed
  - OR
- Option A (full consolidation) completed
  - Patient merged into User
  - New schema with therapistId in User
  - Complete database migration

### Validation Checkpoints

**After Issue #3:**
- CalendarEvent queries return correct results ✓
- No regression in calendar functionality ✓

**After Issue #2:**
- Data audit shows no divergences ✓
- User.surgeryDate matches Patient.surgeryDate ✓
- Controllers use consistent field source ✓

**After Issue #1:**
- Patient.userId always populated (no NULL) ✓
- ExerciseLogs use userId (not patientId) ✓
- No more fallback patterns in frontend ✓

---

## RISK MITIGATION

### Before Any Changes
1. **Full Database Backup**
   ```bash
   pg_dump heart_recovery > backup_pre_migration_$(date +%Y%m%d).sql
   ```

2. **Data Integrity Audit** (Issue #2)
   ```sql
   -- Find divergences
   SELECT u.id, u.name as user_name, p.name as patient_name,
          u.surgeryDate as user_surgery, p.surgeryDate as patient_surgery
   FROM users u
   INNER JOIN patients p ON p.userId = u.id
   WHERE u.name != p.name OR u.surgeryDate != p.surgeryDate;

   -- Find orphaned patients
   SELECT COUNT(*) FROM patients WHERE userId IS NULL;

   -- Find data without patient link
   SELECT COUNT(*) FROM exercise_logs
   WHERE patientId NOT IN (SELECT id FROM patients);
   ```

3. **Staging Environment Testing**
   - All changes tested on staging clone
   - No production changes until verified

### Rollback Procedures

**After Issue #3 (SafePoint)**
- Rename field back: `viewedAsUserId` → `patientId`
- Quick 1-hour rollback

**After Issue #2 (SafePoint)**
- Update User fields back to Patient
- Reinstate fallback patterns
- 2-3 hour rollback

**After Issue #1 (SafePoint)**
- Restore from backup if consolidation fails
- Keep manual backup for 30 days
- Full rollback possible within 4 hours

### Monitoring During Implementation

**Issue #3 Metrics:**
- Calendar event query latency
- Event retrieval success rate
- Query error logs

**Issue #2 Metrics:**
- Field divergence detection (should drop to 0%)
- Surgery date calculation accuracy
- API response consistency

**Issue #1 Metrics:**
- NULL userId count in Patient table
- Exercise log query success rate
- Controller error logs

---

## SUCCESS CRITERIA

### Issue #3 Complete When:
- [ ] CalendarEvent.patientId renamed to viewedAsUserId
- [ ] All queries updated and tested
- [ ] API documentation updated
- [ ] No regression in calendar functionality
- [ ] Frontend tests pass

### Issue #2 Complete When:
- [ ] Data audit shows 0 divergences between User and Patient core fields
- [ ] All controllers query User for surgeryDate (not Patient)
- [ ] 100+ frontend fallback patterns removed
- [ ] Database triggers reference User.surgeryDate correctly
- [ ] Integration tests pass

### Issue #1 Complete When:
- [ ] Option C (hybrid) OR Option A (full) consolidation implemented
- [ ] All 105+ duplicate fields removed from Patient
- [ ] ExerciseLogs use userId instead of patientId
- [ ] Patient.userId never NULL (cascade or constraint enforced)
- [ ] All tests pass
- [ ] Performance metrics unchanged or improved

---

## CONCLUSION

These three HIGH priority issues threaten data integrity and system reliability:

1. **100+ Duplicate Fields** - Root architectural problem
2. **No Automatic Sync** - Allows runtime divergence
3. **Naming Confusion** - Creates semantic misunderstanding

**Recommended Solution:**
- 3-phase approach: Semantic clarity → Data integrity → Architecture consolidation
- Total effort: 5-8 weeks
- Risk level: LOW-MEDIUM with proper backups and staged rollout
- Expected outcome: Clean, maintainable architecture with single source of truth

**Next Steps:**
1. Stakeholder review of this plan
2. Assign team members to each phase
3. Execute pre-migration data integrity audit
4. Begin Phase 1 (CalendarEvent rename)
5. Monitor metrics and document learnings

---

**Document Status**: Ready for Implementation
**Last Updated**: November 13, 2025
**Prepared By**: Architecture Review Team
