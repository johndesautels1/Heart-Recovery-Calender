# CASCADE DELETE FIX PLAN

**Document Date**: November 13, 2025
**Based On**: ENTITY_ARCHITECTURE_AUDIT_REPORT.md (lines 330-349)
**Status**: Planning Phase - NO DATABASE CHANGES IMPLEMENTED
**Author**: Database Architecture Review Team

---

## EXECUTIVE SUMMARY

The entity architecture audit identified **THREE CRITICAL CASCADE DELETE issues** that pose significant data loss and referential integrity risks. This document proposes specific SQL fixes with detailed migration and rollback strategies.

| Issue | Severity | Risk Level | Impact |
|-------|----------|------------|--------|
| Deleting therapist cascades to all patients | CATASTROPHIC | CRITICAL | Complete patient data loss |
| Deleting patient orphans exercise data | SEVERE | HIGH | Orphaned exercise records |
| CAIReport orphaned patientId | MODERATE | MEDIUM | Invalid patient references |

---

## ISSUE #1: THERAPIST CASCADE DELETE - CATASTROPHIC

### Current Behavior

When a therapist User record (role='therapist') is deleted, the following occurs:

```sql
-- Current cascade chain:
DELETE FROM users WHERE id = 5 AND role = 'therapist'
  ↓ CASCADE via Patient.therapistId FK
  ↓ All Patient records with therapistId=5 are DELETED
    ↓ CASCADE via exercise_logs.patientId FK
    ↓ All ExerciseLog records with patientId=<patient_id> are DELETED
      ↓ CASCADE via exercise_prescriptions.patientId FK
      ↓ All ExercisePrescription records are DELETED
```

### Specific Scenario

```
Therapist Dr. Smith (User.id=5):
  → Manages 50+ patients
    → Patient A (Patient.id=100, therapistId=5)
      → 200+ ExerciseLogs (patientId=100)
      → 50+ ExercisePrescriptions (patientId=100)
    → Patient B (Patient.id=101, therapistId=5)
      → 300+ ExerciseLogs (patientId=101)
      → 60+ ExercisePrescriptions (patientId=101)
    ... [50 more patients]

DELETE USER 5 = INSTANT LOSS OF:
  - 50+ Patient records
  - 10,000+ ExerciseLog records
  - 2,000+ ExercisePrescription records
```

### Risk Assessment

- **Risk Level**: CRITICAL
- **Likelihood**: MEDIUM (therapist account deactivations happen)
- **Impact**: CATASTROPHIC (permanent data loss)
- **Affected Entities**: ~10,000-50,000 records per therapist
- **Recovery**: Only possible via full database backup

### Root Cause

```sql
-- Current schema (from models):
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  therapistId INTEGER NOT NULL,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE  ← PROBLEM
);
```

The `ON DELETE CASCADE` constraint propagates therapist deletion to all assigned patients.

### Proposed Fix

**Step 1: Change Cascade Behavior**

```sql
-- Remove cascading delete from patients → users (therapist)
ALTER TABLE patients
DROP CONSTRAINT IF EXISTS patients_therapistId_fkey;

ALTER TABLE patients
ADD CONSTRAINT patients_therapistId_fkey
  FOREIGN KEY (therapistId) REFERENCES users(id)
  ON DELETE RESTRICT;  -- Prevent deletion if patients exist
```

**Step 2: Add Deactivation Alternative**

```sql
-- Add deactivation column to User
ALTER TABLE users
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Create index for therapist lookups
CREATE INDEX idx_users_role_active ON users(role, is_active);
```

**Step 3: Create Reassignment Trigger**

```sql
-- When therapist is "soft deleted", allow manual reassignment
CREATE FUNCTION handle_therapist_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    -- Log deactivation for manual patient reassignment
    INSERT INTO audit_log (event_type, table_name, record_id, details, created_at)
    VALUES (
      'THERAPIST_DEACTIVATED',
      'users',
      NEW.id,
      jsonb_build_object(
        'therapist_name', NEW.name,
        'patient_count', (SELECT COUNT(*) FROM patients WHERE therapistId = NEW.id),
        'requires_reassignment', true
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_therapist_deactivation
BEFORE UPDATE ON users
FOR EACH ROW
WHEN (NEW.role = 'therapist')
EXECUTE FUNCTION handle_therapist_deactivation();
```

**Step 4: Add Therapist Reassignment Stored Procedure**

```sql
-- Allow bulk reassignment of patients to new therapist
CREATE FUNCTION reassign_therapist_patients(
  old_therapist_id INTEGER,
  new_therapist_id INTEGER
)
RETURNS TABLE(reassigned_count INTEGER, affected_exercises INTEGER) AS $$
DECLARE
  v_patient_count INTEGER;
  v_exercise_count INTEGER;
BEGIN
  -- Count affected records
  SELECT COUNT(*) INTO v_patient_count
  FROM patients WHERE therapistId = old_therapist_id;

  SELECT COUNT(*) INTO v_exercise_count
  FROM exercise_logs el
  INNER JOIN patients p ON p.id = el.patientId
  WHERE p.therapistId = old_therapist_id;

  -- Perform reassignment
  UPDATE patients
  SET therapistId = new_therapist_id,
      updated_at = NOW()
  WHERE therapistId = old_therapist_id;

  RETURN QUERY SELECT v_patient_count, v_exercise_count;
END;
$$ LANGUAGE plpgsql;
```

### Migration Strategy

**Phase 1: Pre-Migration Validation (1 hour)**

1. Identify all active therapists and their patient counts:
   ```sql
   SELECT u.id, u.name, COUNT(p.id) as patient_count
   FROM users u
   LEFT JOIN patients p ON p.therapistId = u.id
   WHERE u.role = 'therapist'
   GROUP BY u.id, u.name
   ORDER BY patient_count DESC;
   ```

2. Create backup tables:
   ```sql
   CREATE TABLE therapist_patient_mapping_backup AS
   SELECT therapistId, id as patient_id, name, email, userId
   FROM patients;

   CREATE TABLE exercise_data_backup AS
   SELECT el.id, el.patientId, el.userId, el.exercise_name, el.created_at
   FROM exercise_logs el;
   ```

3. Document current foreign key constraints:
   ```sql
   SELECT constraint_name, table_name, column_name
   FROM information_schema.key_column_usage
   WHERE table_name IN ('patients', 'exercise_logs', 'exercise_prescriptions')
   AND referenced_table_name = 'users';
   ```

**Phase 2: Schema Migration (30 minutes)**

1. During maintenance window (off-peak hours):
   ```sql
   -- Step 1: Add is_active column
   ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

   -- Step 2: Drop CASCADE constraint
   ALTER TABLE patients
   DROP CONSTRAINT patients_therapistId_fkey;

   -- Step 3: Add new RESTRICT constraint
   ALTER TABLE patients
   ADD CONSTRAINT patients_therapistId_fkey
   FOREIGN KEY (therapistId) REFERENCES users(id)
   ON DELETE RESTRICT;

   -- Step 4: Create audit log table if not exists
   CREATE TABLE IF NOT EXISTS audit_log (
     id SERIAL PRIMARY KEY,
     event_type VARCHAR(100),
     table_name VARCHAR(100),
     record_id INTEGER,
     details JSONB,
     created_at TIMESTAMP DEFAULT NOW(),
     INDEX idx_audit_event (event_type, created_at)
   );
   ```

2. Update application logic:
   - Therapist deletion endpoint should:
     - Set `is_active = false` instead of hard delete
     - Return list of reassignments needed
     - Require admin confirmation and new therapist ID

3. Deploy updated controller:
   ```typescript
   // Example: backend/src/controllers/usersController.ts
   async deactivateTherapist(req: Request, res: Response) {
     const { therapistId, reassignToTherapistId } = req.body;

     // Verify new therapist exists
     const newTherapist = await User.findByPk(reassignToTherapistId);
     if (!newTherapist || newTherapist.role !== 'therapist') {
       return res.status(400).json({
         error: 'New therapist not found or invalid role'
       });
     }

     // Check for patients requiring reassignment
     const affectedPatients = await Patient.count({
       where: { therapistId }
     });

     if (affectedPatients > 0 && !reassignToTherapistId) {
       return res.status(400).json({
         error: 'Patients must be reassigned before deactivating therapist',
         affected_patient_count: affectedPatients
       });
     }

     // Perform reassignment if needed
     if (reassignToTherapistId) {
       await Patient.update(
         { therapistId: reassignToTherapistId },
         { where: { therapistId } }
       );
     }

     // Deactivate therapist
     await User.update(
       { is_active: false },
       { where: { id: therapistId } }
     );

     res.json({ success: true, reassigned: affectedPatients });
   }
   ```

**Phase 3: Testing (2 hours)**

1. Test in staging environment:
   ```sql
   -- Create test therapist
   INSERT INTO users (email, name, role, is_active)
   VALUES ('test-therapist@example.com', 'Test Therapist', 'therapist', true);

   -- Create test patients
   INSERT INTO patients (therapistId, userId, name)
   VALUES
     (LAST_INSERT_ID(), 1, 'Patient 1'),
     (LAST_INSERT_ID(), 2, 'Patient 2');

   -- Test deactivation
   UPDATE users SET is_active = false
   WHERE id = LAST_INSERT_ID();

   -- Verify RESTRICT prevents deletion
   DELETE FROM users WHERE id = LAST_INSERT_ID();
   -- Should error: "Cannot delete therapist with assigned patients"
   ```

2. Test reassignment:
   ```sql
   -- Reassign patients to another therapist
   SELECT reassign_therapist_patients(OLD_THERAPIST_ID, NEW_THERAPIST_ID);
   ```

### Rollback Procedure

**If Issues Detected Before Production:**

```sql
-- Restore original CASCADE behavior
ALTER TABLE patients
DROP CONSTRAINT patients_therapistId_fkey;

ALTER TABLE patients
ADD CONSTRAINT patients_therapistId_fkey
FOREIGN KEY (therapistId) REFERENCES users(id)
ON DELETE CASCADE;

-- Restore deleted therapists from backup
RESTORE FROM backup_pre_cascade_fix_YYYYMMDD.sql;

-- Remove new columns
ALTER TABLE users DROP COLUMN is_active;
```

**If Issues Detected After Production:**

1. Full database restore from backup
2. Re-test migration before retry

---

## ISSUE #2: PATIENT CASCADE DELETE - ORPHANED EXERCISE DATA

### Current Behavior

When a Patient record is deleted (either directly or via User deletion), exercise-related data is orphaned:

```sql
-- Current cascade chain:
DELETE FROM patients WHERE id = 100
  ↓ Patient.userId SET NULL (via ON DELETE SET NULL)
  ├─ exercise_logs (patientId=100) NOT CASCADED - ORPHANED
  └─ exercise_prescriptions (patientId=100) NOT CASCADED - ORPHANED

-- Or when User is deleted:
DELETE FROM users WHERE id = 1 (patient user)
  ↓ CASCADE via Patient.userId FK
  ├─ Patient (userId=1) deleted
  ├─ exercise_logs.patientId becomes invalid
  └─ exercise_prescriptions.patientId becomes invalid
```

### Specific Scenario

```
Patient John Doe (User.id=1, Patient.id=100):
  → 150+ ExerciseLogs (patientId=100)
    - 6 months of cardiac recovery data
    - 300+ individual exercise records
  → 20+ ExercisePrescriptions (patientId=100)

SCENARIO 1 - User Deletion:
DELETE FROM users WHERE id=1
  → Patient (userId=1) CASCADE DELETED
  → exercise_logs.patientId=100 is now orphaned
  → exercise_prescriptions.patientId=100 is now orphaned
  → No FK constraint prevents orphaning
  → Lost patient context for all 350+ exercise records

SCENARIO 2 - Direct Patient Deletion:
DELETE FROM patients WHERE id=100
  → exercise_logs.patientId=100 is now orphaned
  → exercise_prescriptions.patientId=100 is now orphaned
  → Data survives but is detached from patient
```

### Risk Assessment

- **Risk Level**: HIGH
- **Likelihood**: HIGH (patients are frequently archived/deleted)
- **Impact**: SEVERE (exercise history lost permanently)
- **Affected Entities**: 100-300 exercise records per patient
- **Data Recovery**: Difficult without application logic changes

### Root Cause

```sql
-- Current schema issues:
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  userId INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL  ← Orphans patients
);

CREATE TABLE exercise_logs (
  id SERIAL PRIMARY KEY,
  patientId INTEGER,
  FOREIGN KEY (patientId) REFERENCES patients(id)  ← NO CASCADE DELETE!
  -- Missing: ON DELETE CASCADE or ON DELETE SET NULL
);

CREATE TABLE exercise_prescriptions (
  id SERIAL PRIMARY KEY,
  patientId INTEGER,
  FOREIGN KEY (patientId) REFERENCES patients(id)  ← NO CASCADE DELETE!
  -- Missing: ON DELETE CASCADE or ON DELETE SET NULL
);
```

The inconsistency between `ON DELETE SET NULL` for Patient.userId and missing constraints for exercise tables creates orphaned data.

### Proposed Fix

**Option A: CASCADE DELETE (Conservative - Prevents Orphaning)**

```sql
-- Add CASCADE DELETE to exercise tables
ALTER TABLE exercise_logs
ADD CONSTRAINT exercise_logs_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE CASCADE;

ALTER TABLE exercise_prescriptions
ADD CONSTRAINT exercise_prescriptions_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE CASCADE;
```

**Advantage**: Prevents orphaned records
**Disadvantage**: Deletes all exercise data when patient is deleted

**Option B: SOFT DELETE (Recommended)**

```sql
-- Add soft-delete columns
ALTER TABLE exercise_logs
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;

ALTER TABLE exercise_prescriptions
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;

ALTER TABLE patients
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;

-- Create indexes for active records
CREATE INDEX idx_exercise_logs_active ON exercise_logs(patientId)
WHERE is_deleted = false;

CREATE INDEX idx_exercise_prescriptions_active ON exercise_prescriptions(patientId)
WHERE is_deleted = false;

-- Add soft-delete constraint (no actual FK cascade)
ALTER TABLE exercise_logs
ADD CONSTRAINT exercise_logs_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE RESTRICT;

ALTER TABLE exercise_prescriptions
ADD CONSTRAINT exercise_prescriptions_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE RESTRICT;

-- Create soft-delete function
CREATE FUNCTION soft_delete_patient(patient_id INTEGER)
RETURNS TABLE(
  patients_marked INTEGER,
  exercises_marked INTEGER,
  prescriptions_marked INTEGER
) AS $$
DECLARE
  v_patient_count INTEGER;
  v_exercise_count INTEGER;
  v_prescription_count INTEGER;
BEGIN
  -- Mark patient as deleted
  UPDATE patients
  SET is_deleted = true, deleted_at = NOW()
  WHERE id = patient_id;
  GET DIAGNOSTICS v_patient_count = ROW_COUNT;

  -- Mark exercise logs as deleted
  UPDATE exercise_logs
  SET is_deleted = true, deleted_at = NOW()
  WHERE patientId = patient_id;
  GET DIAGNOSTICS v_exercise_count = ROW_COUNT;

  -- Mark prescriptions as deleted
  UPDATE exercise_prescriptions
  SET is_deleted = true, deleted_at = NOW()
  WHERE patientId = patient_id;
  GET DIAGNOSTICS v_prescription_count = ROW_COUNT;

  RETURN QUERY SELECT v_patient_count, v_exercise_count, v_prescription_count;
END;
$$ LANGUAGE plpgsql;
```

**Advantage**: Preserves data for recovery/auditing, prevents accidental deletion
**Disadvantage**: Requires application changes to filter is_deleted = false

**Option C: ARCHIVE + DELETE (Hybrid)**

```sql
-- Create archive tables
CREATE TABLE exercise_logs_archive (
  id INTEGER PRIMARY KEY,
  patientId INTEGER,
  userId INTEGER,
  exercise_name VARCHAR,
  -- ... all other fields
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_reason VARCHAR
);

CREATE TABLE exercise_prescriptions_archive (
  id INTEGER PRIMARY KEY,
  patientId INTEGER,
  -- ... all other fields
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_reason VARCHAR
);

-- Create archive function
CREATE FUNCTION archive_patient_exercises(patient_id INTEGER)
RETURNS TABLE(
  archived_exercises INTEGER,
  archived_prescriptions INTEGER
) AS $$
DECLARE
  v_exercise_count INTEGER;
  v_prescription_count INTEGER;
BEGIN
  -- Archive exercise logs
  INSERT INTO exercise_logs_archive
  SELECT el.*, 'PATIENT_DELETED' as archived_reason
  FROM exercise_logs el
  WHERE patientId = patient_id;
  GET DIAGNOSTICS v_exercise_count = ROW_COUNT;

  -- Archive prescriptions
  INSERT INTO exercise_prescriptions_archive
  SELECT ep.*, 'PATIENT_DELETED' as archived_reason
  FROM exercise_prescriptions ep
  WHERE patientId = patient_id;
  GET DIAGNOSTICS v_prescription_count = ROW_COUNT;

  -- Delete original records
  DELETE FROM exercise_logs WHERE patientId = patient_id;
  DELETE FROM exercise_prescriptions WHERE patientId = patient_id;

  RETURN QUERY SELECT v_exercise_count, v_prescription_count;
END;
$$ LANGUAGE plpgsql;
```

**Advantage**: Preserves full audit trail, clean deletion
**Disadvantage**: Requires archive table management

### Recommended Fix: Option B (SOFT DELETE)

Soft delete is the safest approach for healthcare data:
- Complies with healthcare record retention requirements
- Allows data recovery for errors/disputes
- Maintains referential integrity
- Minimal performance impact with indexes

### Migration Strategy

**Phase 1: Schema Addition (30 minutes)**

```sql
-- Add soft-delete columns
ALTER TABLE exercise_logs
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP,
ADD CONSTRAINT exercise_logs_patientId_fkey
  FOREIGN KEY (patientId) REFERENCES patients(id)
  ON DELETE RESTRICT;

ALTER TABLE exercise_prescriptions
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP,
ADD CONSTRAINT exercise_prescriptions_patientId_fkey
  FOREIGN KEY (patientId) REFERENCES patients(id)
  ON DELETE RESTRICT;

ALTER TABLE patients
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP;

-- Create indexes
CREATE INDEX idx_exercise_logs_active ON exercise_logs(patientId)
WHERE is_deleted = false;

CREATE INDEX idx_exercise_prescriptions_active ON exercise_prescriptions(patientId)
WHERE is_deleted = false;

CREATE INDEX idx_patients_active ON patients(therapistId, is_deleted);
```

**Phase 2: Application Code Updates (1-2 hours)**

Update all queries to filter soft-deleted records:

```typescript
// Before:
const exercises = await ExerciseLog.findAll({
  where: { patientId }
});

// After:
const exercises = await ExerciseLog.findAll({
  where: {
    patientId,
    is_deleted: false  // Add this filter
  }
});

// Create helper scope
ExerciseLog.addScope('active', {
  where: { is_deleted: false }
});

// Use it:
const exercises = await ExerciseLog.scope('active').findAll({
  where: { patientId }
});
```

**Phase 3: Replace Delete Logic (1 hour)**

```typescript
// Before:
await patient.destroy();

// After:
await patient.update({
  is_deleted: true,
  deleted_at: new Date()
});

// Create helper method
async deletePatient(patientId: number) {
  return await Patient.update(
    { is_deleted: true, deleted_at: new Date() },
    { where: { id: patientId } }
  );
}
```

**Phase 4: Testing (2 hours)**

```sql
-- Create test patient with exercise data
INSERT INTO patients (id, therapistId, userId, name, is_deleted)
VALUES (999, 1, 1, 'Test Patient', false);

INSERT INTO exercise_logs (patientId, userId, exercise_name, is_deleted)
VALUES
  (999, 1, 'Walking', false),
  (999, 1, 'Stretching', false);

-- Test soft delete
UPDATE patients SET is_deleted = true, deleted_at = NOW() WHERE id = 999;

-- Verify RESTRICT prevents hard delete
DELETE FROM patients WHERE id = 999;
-- Should error: "Cannot delete patient with active exercises"

-- Verify soft-deleted records are filtered
SELECT * FROM exercise_logs WHERE patientId = 999 AND is_deleted = false;
-- Should return 0 rows
```

### Rollback Procedure

**If Issues Found Before Production:**

```sql
-- Remove is_deleted columns
ALTER TABLE exercise_logs DROP COLUMN is_deleted;
ALTER TABLE exercise_logs DROP COLUMN deleted_at;

ALTER TABLE exercise_prescriptions DROP COLUMN is_deleted;
ALTER TABLE exercise_prescriptions DROP COLUMN deleted_at;

ALTER TABLE patients DROP COLUMN is_deleted;
ALTER TABLE patients DROP COLUMN deleted_at;

-- Remove RESTRICT constraint (if needed)
ALTER TABLE exercise_logs
DROP CONSTRAINT exercise_logs_patientId_fkey;

-- Restore original behavior
```

**If Data Integrity Issues After Production:**

```sql
-- Restore from backup
RESTORE FROM backup_pre_soft_delete_YYYYMMDD.sql;

-- Verify restored data
SELECT COUNT(*) FROM exercise_logs;
SELECT COUNT(*) FROM exercise_prescriptions;
```

---

## ISSUE #3: CAI REPORT ORPHANED PATIENT ID

### Current Behavior

CAIReport records maintain both `userId` and `patientId` fields, but lack proper foreign key constraints on `patientId`:

```sql
-- Current schema:
CREATE TABLE cai_reports (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  patientId INTEGER,  -- Optional FK with NO constraint!
  -- ... other fields
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- When Patient is deleted:
DELETE FROM patients WHERE id = 100
  ↓ No FK constraint on cai_reports.patientId
  ↓ cai_reports.patientId = 100 becomes orphaned
  ↓ Reference to non-existent patient remains
```

### Specific Scenario

```
CAI Report for Patient John Doe (Patient.id=100, User.id=1):
- cai_reports.id = 50
- cai_reports.userId = 1 (valid)
- cai_reports.patientId = 100 (Patient.id)
- cai_reports.analysis_data = { ... }

DELETION SCENARIO:
DELETE FROM patients WHERE id = 100
  → Patient record deleted
  → cai_reports.patientId = 100 is now orphaned
  → Reference to non-existent Patient ID
  → Query issues when joining:
    SELECT * FROM cai_reports
    WHERE patientId = 100
    INNER JOIN patients p ON p.id = patientId
    → Returns 0 rows (patient doesn't exist)
```

### Risk Assessment

- **Risk Level**: MEDIUM
- **Likelihood**: MEDIUM (patients are archived/deleted)
- **Impact**: MEDIUM (data exists but reference is invalid)
- **Affected Entities**: 10-100 CAI reports per patient
- **Data Recovery**: Possible via userId reference

### Root Cause

```sql
-- Issues in schema:
1. No FK constraint on patientId:
   patientId INTEGER  -- orphaned!

2. Dual reference without synchronization:
   userId INTEGER     -- hard constraint
   patientId INTEGER  -- soft reference

3. No check constraint:
   -- Missing: patientId must point to patient owned by userId
```

### Current Data Integrity Risk

```sql
-- Query to find orphaned CAI reports:
SELECT cr.id, cr.userId, cr.patientId
FROM cai_reports cr
LEFT JOIN patients p ON p.id = cr.patientId
WHERE cr.patientId IS NOT NULL
  AND p.id IS NULL;  -- patientId references deleted patient

-- Potential data:
-- id  | userId | patientId
-- 50  | 1      | 100       ← Patient 100 doesn't exist!
-- 51  | 1      | 101       ← Patient 101 doesn't exist!
```

### Proposed Fix

**Step 1: Add Proper Foreign Key Constraint**

```sql
-- Add FK constraint with SET NULL
ALTER TABLE cai_reports
ADD CONSTRAINT cai_reports_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE SET NULL;
-- When Patient deleted, cai_reports.patientId becomes NULL
```

**Step 2: Add Check Constraint (Data Integrity)**

```sql
-- Ensure patientId belongs to patient owned by userId
ALTER TABLE cai_reports
ADD CONSTRAINT check_patient_belongs_to_user
CHECK (
  patientId IS NULL OR
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patientId AND p.userId = userId
  )
);
```

**Step 3: Create Validation Function**

```sql
-- Verify orphaned CAI reports don't exist
CREATE FUNCTION validate_cai_report_references()
RETURNS TABLE(orphaned_count INTEGER, issue_details TEXT) AS $$
DECLARE
  v_orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphaned_count
  FROM cai_reports cr
  LEFT JOIN patients p ON p.id = cr.patientId
  WHERE cr.patientId IS NOT NULL AND p.id IS NULL;

  RETURN QUERY SELECT v_orphaned_count,
    CASE
      WHEN v_orphaned_count > 0 THEN
        'Found ' || v_orphaned_count || ' CAI reports with orphaned patientId'
      ELSE 'All CAI reports have valid references'
    END;
END;
$$ LANGUAGE plpgsql;
```

**Step 4: Create Remediation Function**

```sql
-- For existing orphaned records, set patientId to NULL
CREATE FUNCTION remediate_orphaned_cai_reports()
RETURNS TABLE(remediated_count INTEGER) AS $$
DECLARE
  v_remediated_count INTEGER;
BEGIN
  UPDATE cai_reports
  SET patientId = NULL
  WHERE patientId IS NOT NULL
    AND patientId NOT IN (SELECT id FROM patients);

  GET DIAGNOSTICS v_remediated_count = ROW_COUNT;
  RETURN QUERY SELECT v_remediated_count;
END;
$$ LANGUAGE plpgsql;
```

### Migration Strategy

**Phase 1: Pre-Migration Audit (30 minutes)**

```sql
-- 1. Check for orphaned CAI reports
SELECT COUNT(*) as orphaned_count
FROM cai_reports cr
LEFT JOIN patients p ON p.id = cr.patientId
WHERE cr.patientId IS NOT NULL AND p.id IS NULL;

-- 2. Identify affected records
SELECT cr.id, cr.userId, cr.patientId, cr.created_at
FROM cai_reports cr
LEFT JOIN patients p ON p.id = cr.patientId
WHERE cr.patientId IS NOT NULL AND p.id IS NULL
ORDER BY cr.created_at DESC;

-- 3. Create backup
CREATE TABLE cai_reports_backup AS SELECT * FROM cai_reports;
```

**Phase 2: Data Remediation (15 minutes)**

```sql
-- Option 1: Set orphaned patientId to NULL
UPDATE cai_reports
SET patientId = NULL,
    updated_at = NOW()
WHERE patientId IS NOT NULL
  AND patientId NOT IN (SELECT id FROM patients);

-- Verify remediation
SELECT COUNT(*) as remaining_orphaned
FROM cai_reports cr
LEFT JOIN patients p ON p.id = cr.patientId
WHERE cr.patientId IS NOT NULL AND p.id IS NULL;
-- Should return 0
```

**Phase 3: Schema Migration (30 minutes)**

During maintenance window:

```sql
-- Step 1: Add FK constraint with SET NULL
ALTER TABLE cai_reports
ADD CONSTRAINT cai_reports_patientId_fkey
FOREIGN KEY (patientId) REFERENCES patients(id)
ON DELETE SET NULL;

-- Step 2: Verify constraint was applied
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'cai_reports'
  AND constraint_name = 'cai_reports_patientId_fkey';

-- Step 3: Create index for join queries
CREATE INDEX idx_cai_reports_patientId ON cai_reports(patientId)
WHERE patientId IS NOT NULL;
```

**Phase 4: Application Testing (1 hour)**

```typescript
// Test 1: Create CAI report for patient
const report = await CAIReport.create({
  userId: 1,
  patientId: 100,
  analysis_data: { ... }
});
expect(report.patientId).toBe(100);

// Test 2: Attempt invalid patientId (should fail)
try {
  await CAIReport.create({
    userId: 1,
    patientId: 999,  // Non-existent patient
    analysis_data: { ... }
  });
  fail('Should have thrown FK constraint error');
} catch (error) {
  expect(error.message).toContain('FOREIGN KEY constraint');
}

// Test 3: Delete patient, verify CAI report patientId is set to NULL
const patient = await Patient.findByPk(100);
await patient.destroy();

const orphanedReport = await CAIReport.findByPk(50);
expect(orphanedReport.patientId).toBeNull();
expect(orphanedReport.userId).toBe(1);  // Still has userId
```

### Rollback Procedure

**If Issues Found Before Production:**

```sql
-- Remove FK constraint
ALTER TABLE cai_reports
DROP CONSTRAINT IF EXISTS cai_reports_patientId_fkey;

ALTER TABLE cai_reports
DROP CONSTRAINT IF EXISTS check_patient_belongs_to_user;

-- Restore from backup
RESTORE FROM backup_pre_cai_fix_YYYYMMDD.sql;
```

**If Data Issues Found After Production:**

```sql
-- Restore backup
RESTORE FROM backup_pre_cai_fix_YYYYMMDD.sql;

-- Verify restoration
SELECT COUNT(*) FROM cai_reports WHERE patientId IS NOT NULL;
```

---

## CONSOLIDATED MIGRATION SEQUENCE

### Pre-Migration Checklist

- [ ] Create full database backup
- [ ] Backup all critical tables (patients, users, exercise_logs, etc.)
- [ ] Create audit log table if not exists
- [ ] Document all therapist → patient mappings
- [ ] Identify orphaned records for each issue
- [ ] Notify users of maintenance window (4-6 hours)
- [ ] Brief DBA/DevOps on rollback procedures

### Migration Timeline

**Maintenance Window: 4-6 hours (off-peak)**

| Phase | Duration | Task | Owner |
|-------|----------|------|-------|
| Pre-Migration | 30 min | Backup, validation, audit | DBA |
| Issue #3 Fix | 45 min | CAI reports FK + remediation | DBA |
| Issue #2 Fix | 45 min | Exercise tables soft delete | DBA |
| Issue #1 Fix | 30 min | Therapist deactivation | DBA |
| Code Deployment | 30 min | Deploy application updates | DevOps |
| Testing | 60 min | Smoke tests, data validation | QA |
| Verification | 30 min | Health checks, monitoring | Ops |

### Execution Order

**Why This Order:**

1. **Fix #3 First**: CAI reports is simplest, lowest risk
2. **Fix #2 Second**: Exercise soft delete is prerequisite for #1
3. **Fix #1 Last**: Therapist deactivation is most complex

**Dependency Chain:**
```
#3 (CAI) ← Independent
#2 (Exercise soft delete) ← Independent
#1 (Therapist deactivation) ← Requires #2 for patient protection
```

### Monitoring Post-Migration

**Immediate (First 24 hours):**

```sql
-- Monitor constraint violations
SELECT COUNT(*) as deletion_attempts
FROM information_schema.referential_constraints
WHERE table_name IN ('patients', 'exercise_logs', 'exercise_prescriptions')
AND constraint_name LIKE '%_fkey';

-- Check for application errors
SELECT COUNT(*) FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND message LIKE '%FK%' OR message LIKE '%CONSTRAINT%';

-- Verify soft-delete functionality
SELECT COUNT(*) as soft_deleted_patients
FROM patients WHERE is_deleted = true;

SELECT COUNT(*) as soft_deleted_exercises
FROM exercise_logs WHERE is_deleted = true;
```

**Weekly (First 4 weeks):**

- Monitor for DELETE statement errors in application logs
- Check therapist deactivation workflows
- Verify exercise data remains accessible for all users
- Monitor CAI report creation/access

---

## RISK MITIGATION SUMMARY

### Risk: Data Loss During Migration

**Mitigation:**
- Full database backup before each phase
- Test migrations in staging environment
- Rollback procedures documented and tested
- Verification queries run after each phase

### Risk: Application Errors Post-Migration

**Mitigation:**
- Update ORM scopes to filter soft-deleted records
- Add comprehensive error handling
- Gradual rollout with feature flags
- Monitor error logs continuously

### Risk: Therapist Workflows Disrupted

**Mitigation:**
- Soft delete therapists instead of hard delete
- UI shows reassignment workflow before deactivation
- Reassignment function handles bulk patients
- Audit log tracks all reassignments

### Risk: Patient Unable to Access Data

**Mitigation:**
- RESTRICT constraints prevent cascading deletes
- Exercise data preserved with is_deleted flag
- CAI reports remain accessible via userId
- Comprehensive data validation post-migration

---

## TESTING CHECKLIST

### Unit Tests

```typescript
// Therapist deactivation
- [ ] Deactivate therapist with patients
- [ ] Cannot hard-delete therapist with patients
- [ ] Reassign therapist's patients
- [ ] Verify patients accessible after reassignment

// Exercise soft delete
- [ ] Soft delete patient
- [ ] Exercise logs marked is_deleted=true
- [ ] Queries filter soft-deleted exercises
- [ ] Cannot hard-delete patient with exercises

// CAI Reports
- [ ] Create CAI report with valid patientId
- [ ] Cannot create CAI report with invalid patientId
- [ ] Delete patient, verify CAIReport.patientId becomes NULL
- [ ] Verify CAI report still accessible via userId
```

### Integration Tests

```sql
-- Full workflow test
BEGIN;

-- Create therapist
INSERT INTO users (email, name, role, is_active)
VALUES ('therapist@test.com', 'Test Therapist', 'therapist', true);

-- Create patients
INSERT INTO patients (therapistId, userId, name)
VALUES
  ((SELECT id FROM users WHERE email='therapist@test.com'), 1, 'Patient 1'),
  ((SELECT id FROM users WHERE email='therapist@test.com'), 2, 'Patient 2');

-- Create exercise data
INSERT INTO exercise_logs (patientId, userId, exercise_name)
VALUES
  (1, 1, 'Walking'),
  (2, 2, 'Cycling');

-- Create CAI report
INSERT INTO cai_reports (userId, patientId)
VALUES (1, 1);

-- Test deactivation
UPDATE users SET is_active=false WHERE email='therapist@test.com';

-- Verify constraints
INSERT INTO patients (therapistId, userId, name)
VALUES (999, 3, 'Invalid');  -- Should fail

-- Verify soft delete
UPDATE patients SET is_deleted=true WHERE id=1;
SELECT COUNT(*) FROM exercise_logs WHERE patientId=1 AND is_deleted=false;
-- Should return 0

-- Verify CAI report survived
SELECT patientId FROM cai_reports WHERE id=1;
-- Should return NULL (SET NULL worked)

ROLLBACK;
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All backups verified and tested
- [ ] Rollback scripts tested in staging
- [ ] Application code updated and tested
- [ ] Migration SQL scripts reviewed by 2+ DBAs
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified of maintenance window
- [ ] Support team briefed on changes

### Deployment

- [ ] Stop application servers
- [ ] Take database backup (final)
- [ ] Execute migration script #3 (CAI)
- [ ] Execute migration script #2 (Exercise)
- [ ] Execute migration script #1 (Therapist)
- [ ] Deploy application code
- [ ] Run verification queries
- [ ] Restart application servers

### Post-Deployment

- [ ] Monitor application logs for errors
- [ ] Verify therapist deactivation workflow
- [ ] Test patient deletion with exercises
- [ ] Check CAI report creation/access
- [ ] Query orphaned record counts (should be 0)
- [ ] Monitor database performance metrics
- [ ] Notify stakeholders of successful deployment

---

## CONCLUSION

These three CASCADE delete issues represent critical data integrity risks that must be addressed before production deployment:

1. **Therapist CASCADE Delete** → Implement soft delete with reassignment
2. **Patient Exercise Orphaning** → Implement soft delete with RESTRICT FK
3. **CAI Report Orphaning** → Add proper FK constraint with SET NULL

**Estimated Total Effort**: 4-6 hours migration + 2-4 hours testing = 6-10 hours
**Risk Level**: MEDIUM (with proper backups and testing)
**Recommended Window**: Off-peak, 6-8 hour maintenance window

---

**Document Status**: Final Plan - Ready for DBA Review
**Generated**: November 13, 2025
**Review Required**: Yes - DBA + DevOps + Product Lead
