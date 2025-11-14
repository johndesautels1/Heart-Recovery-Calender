const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection config
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'heartbeat_calendar',
  user: 'postgres',
  password: '2663'
});

// Severity levels and fix recommendations
const auditQueries = [
  {
    id: 1,
    title: 'Find orphaned patients (no User account)',
    query: `SELECT p.id, p.name, p.email, p."userId", p."therapistId", p."createdAt"
FROM patients p
WHERE p."userId" IS NULL
ORDER BY p."createdAt" DESC
LIMIT 10;`,
    countQuery: `SELECT COUNT(*) as total FROM patients WHERE "userId" IS NULL;`,
    severity: 'CRITICAL',
    description: 'Patients without associated User accounts cannot access the system. These are orphaned records that break data integrity.',
    fixes: [
      'Review Patient records with NULL userId',
      'Create User accounts for legitimate patients',
      'Link newly created users to patients via userId',
      'Archive or delete invalid orphaned records',
      'Add database constraint: ALTER TABLE patients ADD CONSTRAINT patients_userId_not_null CHECK ("userId" IS NOT NULL);'
    ]
  },
  {
    id: 2,
    title: 'Find users without patient records',
    query: `SELECT u.id, u.email, u.name, u.role, u."createdAt"
FROM users u
LEFT JOIN patients p ON p."userId" = u.id
WHERE u.role = 'patient' AND p.id IS NULL
ORDER BY u."createdAt" DESC
LIMIT 10;`,
    countQuery: `SELECT COUNT(*) as total FROM users u
LEFT JOIN patients p ON p."userId" = u.id
WHERE u.role = 'patient' AND p.id IS NULL;`,
    severity: 'HIGH',
    description: 'Patient users without patient records cannot complete their profile or access extended features.',
    fixes: [
      'Auto-create Patient records for patient-role users during registration',
      'Run batch script to create missing Patient records',
      'Add database trigger to auto-create Patient when User.role=\'patient\'',
      'Require Patient profile completion before access to patient features'
    ]
  },
  {
    id: 3,
    title: 'Find data discrepancies between User and Patient',
    query: `SELECT u.id, u.name as user_name, p.name as patient_name,
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
LIMIT 10;`,
    countQuery: `SELECT COUNT(*) as total FROM users u
INNER JOIN patients p ON p."userId" = u.id
WHERE u.name != p.name OR u."surgeryDate" IS DISTINCT FROM p."surgeryDate";`,
    severity: 'HIGH',
    description: 'Data inconsistencies between User and Patient tables create sync problems and confusion about source of truth.',
    fixes: [
      'Identify which field is source of truth (User or Patient)',
      'Implement two-way sync with Sequelize hooks',
      'Create database triggers for automatic sync',
      'Add data validation triggers before update/insert',
      'Run batch cleanup script to align all discrepancies'
    ]
  },
  {
    id: 4,
    title: 'Find exercise data without patient link',
    query: `SELECT el.id, el."patientId", el."createdAt",
       (SELECT COUNT(*) FROM patients WHERE id = el."patientId") as patient_exists,
       el."completedAt"
FROM exercise_logs el
WHERE el."patientId" NOT IN (SELECT id FROM patients)
ORDER BY el."createdAt" DESC
LIMIT 10;`,
    countQuery: `SELECT COUNT(*) as total FROM exercise_logs
WHERE "patientId" NOT IN (SELECT id FROM patients);`,
    severity: 'CRITICAL',
    description: 'Exercise logs reference non-existent patients. This creates orphaned data and potential cascade delete issues.',
    fixes: [
      'Migrate ExerciseLogs to use userId instead of patientId',
      'Identify correct patient for each orphaned exercise log',
      'Update foreign key constraint to reference patients table properly',
      'Add database constraint: ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_patientId_fk FOREIGN KEY ("patientId") REFERENCES patients(id);',
      'Archive invalid orphaned exercise records'
    ]
  },
  {
    id: 5,
    title: 'Find CAI reports with invalid patientId',
    query: `SELECT cr.id, cr."patientId", cr."userId", cr."createdAt",
       (SELECT COUNT(*) FROM patients WHERE id = cr."patientId") as patient_exists
FROM cai_reports cr
WHERE cr."patientId" IS NOT NULL
  AND cr."patientId" NOT IN (SELECT id FROM patients)
ORDER BY cr."createdAt" DESC
LIMIT 10;`,
    countQuery: `SELECT COUNT(*) as total FROM cai_reports
WHERE "patientId" IS NOT NULL
  AND "patientId" NOT IN (SELECT id FROM patients);`,
    severity: 'MEDIUM',
    description: 'CAI reports have invalid foreign keys to patients table. This could occur if patient records were deleted without cascade.',
    fixes: [
      'Set patientId to NULL for invalid references: UPDATE cai_reports SET "patientId" = NULL WHERE "patientId" NOT IN (SELECT id FROM patients);',
      'Add foreign key constraint with SET NULL: ALTER TABLE cai_reports ADD CONSTRAINT cai_reports_patientId_fk FOREIGN KEY ("patientId") REFERENCES patients(id) ON DELETE SET NULL;',
      'Identify correct patient for each CAI report if data recovery is needed',
      'Review cascade delete policies on therapist deletion'
    ]
  }
];

async function executeAudit() {
  let client;
  let markdownReport = '';

  try {
    client = await pool.connect();
    console.log('Connected to database: heartbeat_calendar\n');

    // Generate markdown header
    markdownReport += `# DATA INTEGRITY AUDIT RESULTS\n\n`;
    markdownReport += `**Date**: ${new Date().toISOString()}\n`;
    markdownReport += `**Database**: heartbeat_calendar\n`;
    markdownReport += `**Status**: Read-only audit (no changes made)\n\n`;

    // Execute each audit query
    for (const audit of auditQueries) {
      console.log(`\n${audit.id}. ${audit.title}`);
      console.log('='.repeat(70));

      // Get count
      const countResult = await client.query(audit.countQuery);
      const totalCount = countResult.rows[0]?.total || 0;

      // Get sample rows
      const dataResult = await client.query(audit.query);
      const sampleRows = dataResult.rows;

      console.log(`Total affected records: ${totalCount}`);
      console.log(`Sample rows returned: ${sampleRows.length}`);

      // Build markdown section
      markdownReport += `\n## Query ${audit.id}: ${audit.title}\n\n`;

      markdownReport += `### Description\n${audit.description}\n\n`;

      markdownReport += `### Query Text\n\`\`\`sql\n${audit.query}\n\`\`\`\n\n`;

      markdownReport += `### Count Query\n\`\`\`sql\n${audit.countQuery}\n\`\`\`\n\n`;

      markdownReport += `### Results\n`;
      markdownReport += `- **Total Affected Records**: ${totalCount}\n`;
      markdownReport += `- **Severity**: ${audit.severity}\n`;
      markdownReport += `- **Sample Rows**: ${sampleRows.length}\n\n`;

      // Add sample data table
      if (sampleRows.length > 0) {
        markdownReport += `### Sample Data (First ${sampleRows.length} rows)\n\n`;
        markdownReport += `\`\`\`json\n`;
        markdownReport += JSON.stringify(sampleRows, null, 2);
        markdownReport += `\n\`\`\`\n\n`;
      } else {
        markdownReport += `### Sample Data\nNo rows found - this is good!\n\n`;
      }

      // Add severity assessment
      markdownReport += `### Severity Assessment\n`;
      markdownReport += `**Level**: ${audit.severity}\n\n`;

      const severityDetails = {
        'CRITICAL': 'Immediate action required. Data integrity is at risk. Migration should not proceed without resolution.',
        'HIGH': 'Should be fixed in current sprint. Creates significant data sync problems.',
        'MEDIUM': 'Plan for next sprint. Less critical but still impacts data consistency.'
      };

      markdownReport += `${severityDetails[audit.severity]}\n\n`;

      // Add recommended fixes
      markdownReport += `### Recommended Fixes\n\n`;
      audit.fixes.forEach((fix, index) => {
        markdownReport += `${index + 1}. ${fix}\n`;
      });

      markdownReport += `\n---\n`;
    }

    // Add summary section
    markdownReport += `\n## AUDIT SUMMARY\n\n`;
    markdownReport += `### Total Issues Found\n\n`;

    let totalIssues = 0;
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };

    for (const audit of auditQueries) {
      const countResult = await client.query(audit.countQuery);
      const count = countResult.rows[0]?.total || 0;
      if (count > 0) {
        totalIssues += count;
        severityCounts[audit.severity]++;
      }
    }

    markdownReport += `| Severity | Queries with Issues | Total Records |\n`;
    markdownReport += `|----------|-------------------|---------------|\n`;
    markdownReport += `| CRITICAL | ${severityCounts.CRITICAL} | TBD |\n`;
    markdownReport += `| HIGH | ${severityCounts.HIGH} | TBD |\n`;
    markdownReport += `| MEDIUM | ${severityCounts.MEDIUM} | TBD |\n`;
    markdownReport += `| **TOTAL** | **${auditQueries.length}** | **${totalIssues}** |\n\n`;

    markdownReport += `### Priority Actions\n\n`;
    markdownReport += `1. **IMMEDIATE**: Address CRITICAL issues before migration\n`;
    markdownReport += `2. **THIS SPRINT**: Fix HIGH severity data discrepancies\n`;
    markdownReport += `3. **NEXT SPRINT**: Plan MEDIUM severity cleanup\n\n`;

    markdownReport += `### Migration Readiness\n\n`;
    if (severityCounts.CRITICAL > 0) {
      markdownReport += `**❌ NOT READY** - Must resolve all CRITICAL issues before proceeding with entity consolidation migration.\n\n`;
    } else {
      markdownReport += `**⚠️ CAUTION** - Review all findings before migration.\n\n`;
    }

    markdownReport += `---\n\n`;
    markdownReport += `**Report Generated**: ${new Date().toISOString()}\n`;
    markdownReport += `**Audit Status**: Complete - Read-only (no database changes made)\n`;

    // Write to file
    const outputPath = path.join(__dirname, 'DATA_INTEGRITY_AUDIT_RESULTS.md');
    fs.writeFileSync(outputPath, markdownReport);
    console.log(`\n\n✓ Report saved to: ${outputPath}`);
    console.log(`Report size: ${(markdownReport.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('Error executing audit:', error);
    process.exit(1);
  } finally {
    if (client) await client.release();
    await pool.end();
  }
}

// Run the audit
executeAudit();
