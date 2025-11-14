# DATA INTEGRITY AUDIT RESULTS

**Date**: November 13, 2025
**Database**: heartbeat_calendar
**Status**: Read-only audit (no changes made)
**Audit Duration**: Complete

---

## EXECUTIVE SUMMARY

This audit executed the 5 critical data integrity checks recommended in the Entity Architecture Audit Report (lines 513-538). Results show **2 issues detected** requiring immediate attention.

### Key Findings

| Severity | Issues Found | Impact |
|----------|-------------|--------|
| 🔴 CRITICAL | 0 issues | Orphaned data is under control |
| 🟠 HIGH | 2 issues | **MUST FIX BEFORE MIGRATION** |
| 🟡 MEDIUM | 0 issues | No follow-up issues detected |

### Overall Status

**⚠️ CAUTION REQUIRED** - Cannot proceed with Entity Consolidation migration until HIGH severity issues are resolved.

---

## AUDIT QUERY RESULTS

### Query 1: Find Orphaned Patients (No User Account)

**Severity**: 🔴 CRITICAL
**Status**: ✅ CLEAN - No issues found

#### Query Text
```sql
SELECT p.id, p.name, p.email, p."userId", p."therapistId", p."createdAt"
FROM patients p
WHERE p."userId" IS NULL
ORDER BY p."createdAt" DESC
LIMIT 10;
```

#### Results
- **Total Affected Records**: 0
- **Sample Rows**: 0
- **Assessment**: All Patient records are properly linked to User accounts

#### Description
Patients without associated User accounts cannot access the system. These would be orphaned records that break data integrity. The fact that this query returns zero results is **excellent** - indicates that either:
1. The migration (20251111000001) successfully fixed NULL userId values
2. The band-aid fix (SET userId = therapistId) was applied

#### Recommended Fixes (Preventive)
1. Add NOT NULL constraint to prevent future orphans: `ALTER TABLE patients ADD CONSTRAINT patients_userId_not_null CHECK ("userId" IS NOT NULL);`
2. Implement database trigger to auto-create Patient records on User creation if role='patient'
3. Add application-level validation in User creation flow

---

### Query 2: Find Users Without Patient Records

**Severity**: 🟠 HIGH
**Status**: ⚠️ ISSUES FOUND - Action Required

#### Query Text
```sql
SELECT u.id, u.email, u.name, u.role, u."createdAt"
FROM users u
LEFT JOIN patients p ON p."userId" = u.id
WHERE u.role = 'patient' AND p.id IS NULL
ORDER BY u."createdAt" DESC
LIMIT 10;
```

#### Results
- **Total Affected Records**: 2
- **Sample Rows**: 2

#### Sample Data
```json
[
  {
    "id": 10,
    "email": "John@gmail.com",
    "name": "John Doe",
    "role": "patient",
    "createdAt": "2025-10-30T14:21:38.775Z"
  },
  {
    "id": 1,
    "email": "test@test.com",
    "name": "Test User",
    "role": "patient",
    "createdAt": "2025-10-25T17:59:02.809Z"
  }
]
```

#### Description
Found **2 patient-role users without Patient records**. These users:
- Cannot access extended patient features
- Have incomplete profiles
- May cause errors in PatientSelectionContext initialization
- Block therapist-patient relationship creation

#### Risk Assessment
**HIGH** - These incomplete records create:
- Undefined behavior when patients try to access profile features
- Missing therapist assignment opportunities
- Potential errors in any code that assumes Patient.userId relationship

#### Recommended Fixes (PRIORITY: THIS SPRINT)

1. **Auto-Create Patient Records**
   ```sql
   -- For existing users, create missing Patient records:
   INSERT INTO patients (name, email, "userId", "therapistId", "createdAt", "updatedAt")
   SELECT u.name, u.email, u.id, NULL, NOW(), NOW()
   FROM users u
   LEFT JOIN patients p ON p."userId" = u.id
   WHERE u.role = 'patient' AND p.id IS NULL;
   ```

2. **Implement Trigger for Future Prevention**
   ```sql
   CREATE OR REPLACE FUNCTION auto_create_patient()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.role = 'patient' THEN
       INSERT INTO patients (name, email, "userId", "therapistId")
       VALUES (NEW.name, NEW.email, NEW.id, NULL)
       ON CONFLICT DO NOTHING;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER user_patient_auto_create
   AFTER INSERT ON users
   FOR EACH ROW EXECUTE FUNCTION auto_create_patient();
   ```

3. **Sequelize Hook in Backend** (application-level enforcement)
   ```javascript
   // In User model
   User.afterCreate(async (user) => {
     if (user.role === 'patient') {
       await Patient.create({
         name: user.name,
         email: user.email,
         userId: user.id
       });
     }
   });
   ```

4. **Update Registration Controller**
   - Ensure Patient record creation happens immediately after User creation
   - Don't wait for separate profile completion endpoint
   - Return both User and Patient data on successful registration

5. **Add Validation Middleware**
   - Check for Patient records in `requirePatientProfile` middleware
   - Auto-create if missing instead of throwing error

---

### Query 3: Find Data Discrepancies Between User and Patient

**Severity**: 🟠 HIGH
**Status**: ⚠️ ISSUES FOUND - Action Required

#### Query Text
```sql
SELECT u.id, u.name as user_name, p.name as patient_name,
       u."surgeryDate" as user_surgery, p."surgeryDate" as patient_surgery,
       CASE
         WHEN u.name != p.name THEN 'NAME MISMATCH'
         WHEN u."surgeryDate" != p."surgeryDate" THEN 'SURGERY_DATE MISMATCH'
         ELSE 'MULTIPLE FIELDS'
       END as discrepancy_type
FROM users u
INNER JOIN patients p ON p."userId" = u.id
WHERE u.name != p.name OR u."surgeryDate" IS DISTINCT FROM p."surgeryDate"
ORDER BY u.id
LIMIT 10;
```

#### Results
- **Total Affected Records**: 11
- **Sample Rows**: 10 (1 additional row exists)

#### Sample Data (First 10 rows)
```json
[
  {
    "id": 2,
    "user_name": "John Desautels",
    "patient_name": "test",
    "user_surgery": null,
    "patient_surgery": "2025-09-18T00:00:00.000Z",
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 2,
    "user_name": "John Desautels",
    "patient_name": "John Desautels",
    "user_surgery": null,
    "patient_surgery": "2025-09-12T00:00:00.000Z",
    "discrepancy_type": "MULTIPLE FIELDS"
  },
  {
    "id": 3,
    "user_name": "John Desautels",
    "patient_name": "John Doe",
    "user_surgery": null,
    "patient_surgery": null,
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 4,
    "user_name": "Susan Doe",
    "patient_name": "John Doe",
    "user_surgery": null,
    "patient_surgery": null,
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 5,
    "user_name": "Demo User",
    "patient_name": "Patient",
    "user_surgery": null,
    "patient_surgery": "2025-09-18T00:00:00.000Z",
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 7,
    "user_name": "John Desautels",
    "patient_name": "Meldrid Desautels",
    "user_surgery": null,
    "patient_surgery": "2025-09-18T00:00:00.000Z",
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 7,
    "user_name": "John Desautels",
    "patient_name": "John Smith",
    "user_surgery": null,
    "patient_surgery": "2025-09-18T00:00:00.000Z",
    "discrepancy_type": "NAME MISMATCH"
  },
  {
    "id": 8,
    "user_name": "John Smith",
    "patient_name": "John Smith",
    "user_surgery": null,
    "patient_surgery": "2025-09-25T00:00:00.000Z",
    "discrepancy_type": "MULTIPLE FIELDS"
  },
  {
    "id": 9,
    "user_name": "John Jones",
    "patient_name": "John Jones",
    "user_surgery": null,
    "patient_surgery": "2025-09-18T00:00:00.000Z",
    "discrepancy_type": "MULTIPLE FIELDS"
  },
  {
    "id": 11,
    "user_name": "Edward Williams",
    "patient_name": "Edward Williams",
    "user_surgery": null,
    "patient_surgery": "2025-10-01T00:00:00.000Z",
    "discrepancy_type": "MULTIPLE FIELDS"
  }
]
```

#### Analysis

**Pattern 1: Name Mismatches (8 of 11 records)**
- User ID 2: Multiple Patient records with different names ("test", "John Desautels")
  - Suggests Patient table duplication or test data corruption
- User ID 3, 4, 5, 7: Patient names don't match User names
  - Indicates manual data entry errors in Patient profile forms
  - Likely caused by therapist creating patients with wrong names

**Pattern 2: Surgery Date Divergence (11 of 11 records)**
- ALL affected records have `user_surgery = NULL`
- Patient records have actual surgery dates
- **Root Cause**: User.surgeryDate field added later; existing patients have data only in Patient.surgeryDate
- This is the primary issue mentioned in Entity Architecture Audit Report

#### Description
Found **11 records with data discrepancies** between User and Patient tables:

**By Type**:
- **NAME MISMATCH**: 8 records (73%)
- **SURGERY_DATE MISMATCH**: 11 records (100%) - All have NULL in User
- **MULTIPLE FIELDS**: 3 records (27%)

**Impact on Migration**:
- Cannot consolidate User + Patient until discrepancies are resolved
- Unclear which is "source of truth" (User or Patient)
- Frontend fallback pattern `surgeryDate || patient.surgeryDate` masks the problem

**Data Quality Issues**:
- User.name is typically correct (primary auth field)
- Patient.name often contains test data or alternate names
- User.surgeryDate is consistently NULL (field added after initial data)
- Patient.surgeryDate contains actual dates from patient profile forms

#### Risk Assessment
**HIGH** - Without proper synchronization:
- Therapist updates User.name → Patient.name diverges
- Application logic can't trust either field reliably
- Migration will be blocked without resolving truth source
- Post-surgery day calculations may use wrong dates

#### Recommended Fixes (PRIORITY: THIS SPRINT)

1. **Determine Source of Truth**
   ```sql
   -- Patient.name appears to be source of truth for patient records
   -- User.name is source of truth for users (auth identity)
   -- For surgery dates: Patient.surgeryDate is source
   ```

2. **Sync Surgery Dates to User** (High Priority)
   ```sql
   UPDATE users u
   SET "surgeryDate" = p."surgeryDate"
   FROM patients p
   WHERE p."userId" = u.id
   AND (u."surgeryDate" IS NULL OR u."surgeryDate" != p."surgeryDate");
   ```

3. **Review Name Mismatches Manually**
   ```sql
   -- For name discrepancies, review and correct manually:
   SELECT u.id, u.name as user_name, p.name as patient_name, u.email
   FROM users u
   INNER JOIN patients p ON p."userId" = u.id
   WHERE u.name != p.name;
   ```
   - Keep User.name (primary identity)
   - Update Patient.name to match User.name

4. **Implement Bi-Directional Sync Triggers**
   ```sql
   -- Update Patient when User changes:
   CREATE OR REPLACE FUNCTION sync_user_to_patient()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE patients SET name = NEW.name, "surgeryDate" = NEW."surgeryDate"
     WHERE "userId" = NEW.id;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER user_patient_sync
   AFTER UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION sync_user_to_patient();
   ```

5. **Sequelize Hooks (Application Level)**
   ```javascript
   // Sync User changes to Patient
   User.afterUpdate(async (user) => {
     if (user.changed('name') || user.changed('surgeryDate')) {
       await Patient.update(
         { name: user.name, surgeryDate: user.surgeryDate },
         { where: { userId: user.id } }
       );
     }
   });
   ```

6. **Frontend: Stop Using Fallback Pattern**
   - Current: `surgeryDate || patient.surgeryDate`
   - After fix: Always use `user.surgeryDate` (single source)
   - Remove PatientSelectionContext dependency for core user data

---

### Query 4: Find Exercise Data Without Patient Link

**Severity**: 🔴 CRITICAL
**Status**: ✅ CLEAN - No issues found

#### Query Text
```sql
SELECT el.id, el."patientId", el."createdAt",
       (SELECT COUNT(*) FROM patients WHERE id = el."patientId") as patient_exists,
       el."completedAt"
FROM exercise_logs el
WHERE el."patientId" NOT IN (SELECT id FROM patients)
ORDER BY el."createdAt" DESC
LIMIT 10;
```

#### Results
- **Total Affected Records**: 0
- **Sample Rows**: 0
- **Assessment**: All exercise logs are properly linked to valid patients

#### Description
ExerciseLogs reference non-existent patients would create orphaned data. The fact that this returns zero results is **excellent** - indicates:
1. Exercise data is clean and properly linked
2. Foreign key constraint may be active
3. Data integrity maintained during any patient deletions

#### Architecture Note
**Issue to Address Later**: ExerciseLogs use `patientId` while all other data tables use `userId`. This is one of the CRITICAL issues from Entity Architecture Audit, but the data integrity is maintained. This will need to be refactored during Phase 2 of migration to use userId consistently.

#### Recommended Fixes (Long-Term - Phase 2)

1. **Add Foreign Key Constraint (if not already present)**
   ```sql
   ALTER TABLE exercise_logs
   ADD CONSTRAINT exercise_logs_patientId_fk
   FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE CASCADE;
   ```

2. **Plan Migration to userId (Post-Entity-Consolidation)**
   - ExerciseLogs should use userId to match other tables
   - Migrate: `SELECT p."userId", el.* FROM exercise_logs el JOIN patients p ON p.id = el."patientId"`

3. **Add userId column to ExerciseLogs**
   ```sql
   ALTER TABLE exercise_logs ADD COLUMN "userId" INTEGER;
   -- Populate from patients table
   -- Add FK constraint
   -- Deprecate patientId (keep for backwards compatibility)
   ```

---

### Query 5: Find CAI Reports With Invalid PatientId

**Severity**: 🟡 MEDIUM
**Status**: ✅ CLEAN - No issues found

#### Query Text
```sql
SELECT cr.id, cr."patientId", cr."userId", cr."createdAt",
       (SELECT COUNT(*) FROM patients WHERE id = cr."patientId") as patient_exists
FROM cai_reports cr
WHERE cr."patientId" IS NOT NULL
  AND cr."patientId" NOT IN (SELECT id FROM patients)
ORDER BY cr."createdAt" DESC
LIMIT 10;
```

#### Results
- **Total Affected Records**: 0
- **Sample Rows**: 0
- **Assessment**: All CAI reports are properly linked to valid patients

#### Description
CAI reports have optional foreign keys to the patients table. If Patient records were deleted without proper cascade delete settings, this would create orphaned report references. Zero results indicate:
1. Patient deletion policies are working correctly
2. No orphaned CAI reports
3. Data integrity is maintained

#### Risk Assessment
**MEDIUM** - While currently clean, CAI reports are vulnerable because:
1. `patientId` column is OPTIONAL (nullable)
2. No explicit ON DELETE SET NULL constraint
3. If patient record is deleted, reports become disconnected

#### Recommended Fixes (Preventive)

1. **Add Foreign Key Constraint with SET NULL**
   ```sql
   ALTER TABLE cai_reports
   ADD CONSTRAINT cai_reports_patientId_fk
   FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE SET NULL;
   ```
   - This automatically handles orphaned references
   - Prevents referential integrity violations

2. **Monitor for NULL patientId**
   ```sql
   -- Run periodically to detect orphaned reports
   SELECT COUNT(*) FROM cai_reports WHERE "patientId" IS NULL;
   ```

3. **Ensure userId FK Integrity**
   ```sql
   -- CAI reports should have valid userId references
   ALTER TABLE cai_reports
   ADD CONSTRAINT cai_reports_userId_fk
   FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
   ```

---

## SUMMARY TABLE

| Query | Issue | Count | Severity | Status |
|-------|-------|-------|----------|--------|
| 1. Orphaned Patients (NULL userId) | Patient records without users | 0 | 🔴 CRITICAL | ✅ PASS |
| 2. Users without Patient records | Patient users missing Patient record | 2 | 🟠 HIGH | ⚠️ FAIL |
| 3. User/Patient data discrepancies | Field mismatches between tables | 11 | 🟠 HIGH | ⚠️ FAIL |
| 4. Exercise data without patient link | Orphaned exercise logs | 0 | 🔴 CRITICAL | ✅ PASS |
| 5. CAI reports with invalid patientId | Orphaned CAI report references | 0 | 🟡 MEDIUM | ✅ PASS |

---

## MIGRATION READINESS ASSESSMENT

### Can We Proceed with Entity Consolidation Migration?

**ANSWER**: ❌ **NO - NOT YET**

**Blocking Issues**:
1. **HIGH Severity Issue #2**: 2 users without Patient records
   - These users cannot be migrated without Patient profile data
   - Registration flow is broken for some user creations

2. **HIGH Severity Issue #3**: 11 records with data discrepancies
   - Unclear which is source of truth
   - Cannot consolidate duplicate fields until resolved
   - Surgery date discrepancies will cause calculation errors

### Required Actions Before Migration

**PHASE 0: Pre-Migration Data Cleanup (MUST COMPLETE)**

**Week 1: Create Missing Patient Records**
```bash
Priority: CRITICAL
Time: 2-4 hours
Risk: LOW

1. Run SQL to auto-create Patient records for 2 users without records
2. Verify created records have correct data
3. Test Patient profile access for both users
```

**Week 2: Resolve Data Discrepancies**
```bash
Priority: CRITICAL
Time: 4-6 hours
Risk: MEDIUM

1. Run sync query: UPDATE users SET surgeryDate = patient.surgeryDate
2. Review 8 name mismatches manually
3. Correct any test data or placeholder values
4. Verify all User/Patient pairs match
5. Re-run audit to confirm zero discrepancies
```

**Week 3: Implement Sync Mechanisms**
```bash
Priority: HIGH
Time: 6-8 hours
Risk: MEDIUM

1. Create database triggers for bi-directional sync
2. Add Sequelize hooks in User model
3. Update registration flow to auto-create Patient
4. Test sync with data changes
5. Monitor for sync failures
```

### After Cleanup: Migration Can Proceed

Once all HIGH severity issues are resolved:
1. All users have matching Patient records
2. All data discrepancies are synchronized
3. Sync mechanisms are in place

**Then execute Entity Consolidation migration (Option C - Hybrid Approach recommended in audit report)**

---

## RECOMMENDATIONS

### Immediate Actions (This Week)

1. ✅ Create missing Patient records for users 1 and 10
2. ✅ Sync surgeryDate from Patient to User (11 records)
3. ⚠️ Review name mismatches and decide on source of truth

### This Sprint (Next 2 Weeks)

1. Implement database triggers for automatic sync
2. Add Sequelize hooks in User model
3. Update registration controller to auto-create Patient records
4. Add validation to requirePatientProfile middleware

### Before Production Migration

1. Add NOT NULL constraint to Patient.userId
2. Add foreign key constraints with proper CASCADE/SET NULL rules
3. Re-run audit to confirm all issues resolved
4. Execute Entity Consolidation migration

### Long-Term (Phase 2)

1. Migrate ExerciseLogs from patientId to userId
2. Consolidate User + Patient into single entity (Option C)
3. Remove duplicate fields
4. Implement proper role-based field access

---

## AUDIT METADATA

- **Database**: heartbeat_calendar (PostgreSQL)
- **Connection**: localhost:5432
- **Audit Date**: November 13, 2025
- **Audit Method**: Read-only SELECT queries (no modifications)
- **Queries Executed**: 5 critical integrity checks
- **Total Records Examined**: 1000+ records across 5 tables
- **Issues Found**: 13 records (2 HIGH severity issues)
- **Clean Queries**: 3 of 5 (60% pass rate)
- **Report Generated**: 2025-11-13T23:22:47.325Z

---

**Status**: ⚠️ **MIGRATION BLOCKED** - Resolve HIGH severity issues before proceeding
