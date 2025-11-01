# Database Backup and Recovery Guide

**Database:** PostgreSQL
**Application:** Heart Recovery Calendar
**Last Updated:** November 1, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Automated Backup Scripts](#automated-backup-scripts)
5. [Restore Procedures](#restore-procedures)
6. [Backup Testing](#backup-testing)
7. [Disaster Recovery](#disaster-recovery)
8. [HIPAA Compliance](#hipaa-compliance)
9. [Backup Monitoring](#backup-monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Heart Recovery Calendar stores **Protected Health Information (PHI)** including:
- Patient medical records
- Vital signs (blood pressure, heart rate, weight)
- Medication logs
- Exercise and therapy data
- Personal health information

**CRITICAL:** Regular backups are essential for:
- Data protection and recovery
- HIPAA compliance requirements
- Business continuity
- Disaster recovery preparedness

---

## Backup Strategy

### Backup Types

1. **Full Backups** (Complete database dump)
   - Frequency: Daily at 2:00 AM
   - Retention: 30 days
   - Storage: Encrypted offsite storage

2. **Incremental Backups** (Changes since last full backup)
   - Frequency: Every 6 hours
   - Retention: 7 days
   - Storage: Local and offsite

3. **Transaction Log Backups** (Continuous)
   - Frequency: Every 15 minutes
   - Retention: 48 hours
   - Purpose: Point-in-time recovery

### 3-2-1 Backup Rule

Our backup strategy follows the industry-standard **3-2-1 rule**:
- **3** copies of data (original + 2 backups)
- **2** different storage media types
- **1** copy offsite (cloud or remote location)

---

## Manual Backup Procedures

### Prerequisites

1. PostgreSQL client tools installed (`pg_dump`, `psql`)
2. Database connection credentials (from `.env` file)
3. Sufficient disk space (estimate 2x your database size)
4. Write permissions to backup directory

### Full Database Backup (pg_dump)

#### Standard Backup

```bash
# Set environment variables
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=heart_recovery_calendar
export PGUSER=postgres
export PGPASSWORD=your_postgres_password

# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Perform backup
pg_dump \
  --format=custom \
  --compress=9 \
  --file="backups/$(date +%Y-%m-%d)/heart_recovery_$(date +%Y%m%d_%H%M%S).backup" \
  $PGDATABASE

# Verify backup file was created
ls -lh backups/$(date +%Y-%m-%d)/
```

#### SQL Format Backup (Human-readable)

```bash
# Create SQL dump (useful for inspection)
pg_dump \
  --format=plain \
  --file="backups/$(date +%Y-%m-%d)/heart_recovery_$(date +%Y%m%d_%H%M%S).sql" \
  $PGDATABASE

# Compress SQL file
gzip backups/$(date +%Y-%m-%d)/heart_recovery_*.sql
```

#### Schema-Only Backup

```bash
# Backup database structure only (no data)
pg_dump \
  --schema-only \
  --file="backups/schema/heart_recovery_schema_$(date +%Y%m%d).sql" \
  $PGDATABASE
```

#### Data-Only Backup

```bash
# Backup data only (no schema)
pg_dump \
  --data-only \
  --format=custom \
  --file="backups/data/heart_recovery_data_$(date +%Y%m%d).backup" \
  $PGDATABASE
```

### Table-Specific Backups (Critical Tables)

```bash
# Backup critical patient data tables
pg_dump \
  --table=users \
  --table=patients \
  --table=vitals_samples \
  --table=medications \
  --table=medication_logs \
  --file="backups/critical/patient_data_$(date +%Y%m%d_%H%M%S).sql" \
  $PGDATABASE
```

### Backup with Encryption (Recommended for PHI)

```bash
# Backup and encrypt with GPG
pg_dump \
  --format=custom \
  $PGDATABASE | \
  gpg --encrypt --recipient your-key-id \
  > backups/encrypted/heart_recovery_$(date +%Y%m%d_%H%M%S).backup.gpg

# Backup and encrypt with OpenSSL
pg_dump \
  --format=custom \
  $PGDATABASE | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -out backups/encrypted/heart_recovery_$(date +%Y%m%d_%H%M%S).backup.enc
```

---

## Automated Backup Scripts

### Linux/Mac Backup Script

Create `backend/scripts/backup-database.sh`:

```bash
#!/bin/bash

# Database Backup Script for Heart Recovery Calendar
# Run this script daily via cron job

# Configuration
BACKUP_DIR="/var/backups/heart-recovery-calendar"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"

# Load database credentials from .env
if [ -f "$(dirname $0)/../.env" ]; then
    export $(cat $(dirname $0)/../.env | grep -v '^#' | xargs)
else
    echo "ERROR: .env file not found" >> $LOG_FILE
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Log start
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup started" >> $LOG_FILE

# Perform backup
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/$DATE/heart_recovery_$TIMESTAMP.backup" \
  $DB_NAME

# Check if backup succeeded
if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed successfully" >> $LOG_FILE

    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$DATE/heart_recovery_$TIMESTAMP.backup" | cut -f1)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup size: $BACKUP_SIZE" >> $LOG_FILE

    # Verify backup integrity
    pg_restore --list "$BACKUP_DIR/$DATE/heart_recovery_$TIMESTAMP.backup" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup integrity verified" >> $LOG_FILE
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Backup integrity check failed!" >> $LOG_FILE
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Backup failed!" >> $LOG_FILE
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
find $BACKUP_DIR -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;
echo "$(date '+%Y-%m-%d %H:%M:%S') - Old backups cleaned up (retention: $RETENTION_DAYS days)" >> $LOG_FILE

# Optional: Upload to cloud storage
# aws s3 cp "$BACKUP_DIR/$DATE/" s3://your-bucket/backups/$DATE/ --recursive
# echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup uploaded to S3" >> $LOG_FILE

echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup process completed" >> $LOG_FILE
```

Make the script executable:

```bash
chmod +x backend/scripts/backup-database.sh
```

### Windows Backup Script

Create `backend/scripts/backup-database.bat`:

```batch
@echo off
REM Database Backup Script for Heart Recovery Calendar (Windows)

REM Configuration
set BACKUP_DIR=C:\Backups\heart-recovery-calendar
set RETENTION_DAYS=30
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set LOG_FILE=%BACKUP_DIR%\backup.log

REM Load database credentials
REM You should set these as environment variables or load from .env
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=heart_recovery_calendar
set DB_USER=postgres

REM Create backup directory
if not exist "%BACKUP_DIR%\%DATE%" mkdir "%BACKUP_DIR%\%DATE%"

REM Log start
echo %date% %time% - Backup started >> %LOG_FILE%

REM Perform backup
pg_dump ^
  --host=%DB_HOST% ^
  --port=%DB_PORT% ^
  --username=%DB_USER% ^
  --format=custom ^
  --compress=9 ^
  --file="%BACKUP_DIR%\%DATE%\heart_recovery_%TIMESTAMP%.backup" ^
  %DB_NAME%

if %ERRORLEVEL% EQU 0 (
    echo %date% %time% - Backup completed successfully >> %LOG_FILE%
) else (
    echo %date% %time% - ERROR: Backup failed! >> %LOG_FILE%
    exit /b 1
)

REM Clean up old backups
forfiles /p %BACKUP_DIR% /m *.backup /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul

echo %date% %time% - Backup process completed >> %LOG_FILE%
```

### Schedule Automated Backups

#### Linux (crontab)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * /path/to/backend/scripts/backup-database.sh

# Add incremental backup every 6 hours
0 */6 * * * /path/to/backend/scripts/backup-database.sh
```

#### Windows (Task Scheduler)

```powershell
# Create scheduled task for daily backup at 2:00 AM
schtasks /create /tn "Heart Recovery DB Backup" /tr "C:\path\to\backend\scripts\backup-database.bat" /sc daily /st 02:00
```

---

## Restore Procedures

### Full Database Restore

**⚠️ WARNING:** Restoring will **overwrite** all existing data!

#### Step 1: Stop the Application

```bash
# Stop backend server
# (If running as service: sudo systemctl stop heart-recovery-backend)
pkill -f "node.*server.ts"
```

#### Step 2: Drop Existing Database (Optional)

```bash
# Connect as postgres superuser
psql -U postgres

# Drop and recreate database
DROP DATABASE heart_recovery_calendar;
CREATE DATABASE heart_recovery_calendar;
\q
```

#### Step 3: Restore from Custom Format Backup

```bash
# Restore custom format backup
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=heart_recovery_calendar \
  --verbose \
  --clean \
  --if-exists \
  backups/2025-11-01/heart_recovery_20251101_020000.backup

# Enter password when prompted
```

#### Step 4: Restore from SQL Format Backup

```bash
# Restore SQL dump
psql \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=heart_recovery_calendar \
  < backups/2025-11-01/heart_recovery_20251101_020000.sql
```

#### Step 5: Verify Restoration

```bash
# Connect to database
psql -U postgres -d heart_recovery_calendar

# Check table counts
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM quote_ident(schemaname)||'.'||quote_ident(tablename)) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

# Check most recent data
SELECT * FROM users ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM vitals_samples ORDER BY "recordedAt" DESC LIMIT 5;

\q
```

#### Step 6: Restart Application

```bash
# Restart backend server
cd backend
npm run dev
```

### Point-in-Time Recovery (PITR)

For point-in-time recovery, you need continuous WAL (Write-Ahead Log) archiving enabled.

#### Enable WAL Archiving (postgresql.conf)

```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
```

#### Restore to Specific Point in Time

```bash
# Restore base backup
pg_restore -d heart_recovery_calendar backups/base_backup.backup

# Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2025-11-01 14:30:00'
recovery_target_action = 'promote'
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Table-Level Restore

Restore specific tables without affecting others:

```bash
# Restore only specific tables
pg_restore \
  --dbname=heart_recovery_calendar \
  --table=users \
  --table=patients \
  backups/2025-11-01/heart_recovery_20251101_020000.backup
```

### Decrypt and Restore

```bash
# Decrypt GPG backup and restore
gpg --decrypt backups/encrypted/heart_recovery_20251101.backup.gpg | \
pg_restore --dbname=heart_recovery_calendar

# Decrypt OpenSSL backup and restore
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in backups/encrypted/heart_recovery_20251101.backup.enc | \
pg_restore --dbname=heart_recovery_calendar
```

---

## Backup Testing

**CRITICAL:** Backups are worthless if you can't restore from them!

### Monthly Restore Test Procedure

1. **Create Test Database**

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE heart_recovery_test;"
```

2. **Restore Latest Backup to Test Database**

```bash
# Restore to test database
pg_restore \
  --dbname=heart_recovery_test \
  --verbose \
  backups/latest/heart_recovery_latest.backup
```

3. **Verify Data Integrity**

```bash
# Connect and verify
psql -U postgres -d heart_recovery_test

-- Check row counts match production
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM patients;
SELECT COUNT(*) FROM vitals_samples;

-- Check data quality
SELECT * FROM patients WHERE "createdAt" > NOW() - INTERVAL '7 days';

\q
```

4. **Document Test Results**

Create `backups/test-results/restore-test-YYYY-MM-DD.txt`:

```
Restore Test Results
Date: 2025-11-01
Tester: [Your Name]

Backup File: heart_recovery_20251101_020000.backup
Backup Size: 156 MB
Backup Date: 2025-11-01 02:00:00

Restore Test Database: heart_recovery_test
Restore Start Time: 14:30:00
Restore End Time: 14:32:15
Restore Duration: 2 minutes 15 seconds

Data Verification:
✓ Users table: 45 rows
✓ Patients table: 12 rows
✓ VitalsSamples table: 1,234 rows
✓ Medications table: 34 rows
✓ Recent data present (last 7 days)
✓ Foreign key constraints intact
✓ Indexes present

Result: PASS
Notes: All data restored successfully, no errors encountered.
```

5. **Cleanup Test Database**

```bash
# Drop test database
psql -U postgres -c "DROP DATABASE heart_recovery_test;"
```

---

## Disaster Recovery

### Disaster Recovery Plan (DRP)

#### Recovery Time Objective (RTO)

**Target:** 4 hours
- Time to restore service after disaster

#### Recovery Point Objective (RPO)

**Target:** 15 minutes
- Maximum acceptable data loss (via transaction log backups)

### Disaster Scenarios

#### Scenario 1: Database Corruption

**Detection:** Database queries failing, data inconsistencies

**Recovery Steps:**
1. Stop application
2. Assess extent of corruption
3. Restore from most recent valid backup
4. Apply transaction logs if available
5. Verify data integrity
6. Restart application
7. Notify users of any data loss

**Estimated Recovery Time:** 1-2 hours

#### Scenario 2: Server Hardware Failure

**Detection:** Server unresponsive, disk failure

**Recovery Steps:**
1. Provision new server
2. Install PostgreSQL
3. Restore database from offsite backup
4. Update DNS/load balancer to point to new server
5. Verify application functionality
6. Resume normal operations

**Estimated Recovery Time:** 2-4 hours

#### Scenario 3: Ransomware Attack

**Detection:** Files encrypted, ransom demand

**Recovery Steps:**
1. Isolate infected systems immediately
2. **DO NOT pay ransom**
3. Restore from clean, offline backups
4. Verify backups were not compromised
5. Scan restored systems for malware
6. Implement additional security measures
7. Report to authorities and HIPAA breach notification if PHI affected

**Estimated Recovery Time:** 4-8 hours

#### Scenario 4: Accidental Data Deletion

**Detection:** User reports missing data

**Recovery Steps:**
1. Identify what was deleted and when
2. Check if transaction logs available for PITR
3. Restore specific tables or perform PITR
4. Verify restored data
5. Communicate resolution to users

**Estimated Recovery Time:** 30 minutes - 2 hours

### Emergency Contact List

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Database Administrator | [Your Name] | [Phone] | [Email] |
| System Administrator | [Name] | [Phone] | [Email] |
| Application Developer | [Name] | [Phone] | [Email] |
| HIPAA Compliance Officer | [Name] | [Phone] | [Email] |

---

## HIPAA Compliance

### HIPAA Backup Requirements

Per **45 CFR § 164.308(a)(7)(ii)(A)** - Contingency Plan:

> "Establish and implement procedures to create and maintain retrievable exact copies of electronic protected health information (ePHI)."

### Compliance Checklist

- [ ] **Encryption at Rest:** All backups encrypted with AES-256 or stronger
- [ ] **Encryption in Transit:** Backups transferred over secure channels (SFTP, HTTPS)
- [ ] **Access Controls:** Only authorized personnel can access backups
- [ ] **Audit Logging:** All backup/restore operations logged
- [ ] **Offsite Storage:** Backups stored in secure offsite location
- [ ] **Backup Testing:** Regular restore tests documented
- [ ] **Retention Policy:** Backups retained for required period (minimum 6 years)
- [ ] **Disposal Policy:** Secure deletion of old backups
- [ ] **Business Associate Agreements:** BAAs with any third-party backup providers
- [ ] **Disaster Recovery Plan:** Documented and tested annually

### Backup Audit Log

All backup and restore operations should be logged:

```sql
-- Create audit table
CREATE TABLE backup_audit_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL, -- 'backup' or 'restore'
    backup_file VARCHAR(255),
    initiated_by VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20), -- 'success', 'failed', 'in_progress'
    file_size_mb INTEGER,
    error_message TEXT,
    notes TEXT
);

-- Example log entry
INSERT INTO backup_audit_log (operation, backup_file, initiated_by, status, file_size_mb)
VALUES ('backup', 'heart_recovery_20251101_020000.backup', 'automated_script', 'success', 156);
```

---

## Backup Monitoring

### Backup Health Checks

Create monitoring script `backend/scripts/check-backups.sh`:

```bash
#!/bin/bash

# Backup Monitoring Script
# Check if backups are current and valid

BACKUP_DIR="/var/backups/heart-recovery-calendar"
ALERT_EMAIL="admin@example.com"
MAX_AGE_HOURS=26  # Alert if no backup in 26 hours (daily + 2hr buffer)

# Find most recent backup
LATEST_BACKUP=$(find $BACKUP_DIR -name "*.backup" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found!"
    echo "No backups found in $BACKUP_DIR" | mail -s "ALERT: Database Backup Missing" $ALERT_EMAIL
    exit 1
fi

# Check age of most recent backup
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE_HOURS hours old"
    echo "Latest backup is $BACKUP_AGE_HOURS hours old: $LATEST_BACKUP" | \
        mail -s "ALERT: Database Backup Stale" $ALERT_EMAIL
    exit 1
fi

# Verify backup integrity
pg_restore --list "$LATEST_BACKUP" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: Latest backup file is corrupted!"
    echo "Backup file is corrupted: $LATEST_BACKUP" | \
        mail -s "ALERT: Database Backup Corrupted" $ALERT_EMAIL
    exit 1
fi

# Check disk space
DISK_USAGE=$(df -h $BACKUP_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "WARNING: Backup disk usage at ${DISK_USAGE}%"
    echo "Backup disk usage at ${DISK_USAGE}%: $BACKUP_DIR" | \
        mail -s "ALERT: Backup Disk Space Low" $ALERT_EMAIL
fi

echo "Backup health check passed"
echo "Latest backup: $LATEST_BACKUP"
echo "Backup age: $BACKUP_AGE_HOURS hours"
echo "Disk usage: ${DISK_USAGE}%"
```

### Alerting

Set up cron job to check backups every 6 hours:

```bash
# Add to crontab
0 */6 * * * /path/to/backend/scripts/check-backups.sh
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Backup Takes Too Long

**Problem:** Backup exceeds maintenance window

**Solutions:**
- Use `--compress=0` to disable compression (faster but larger files)
- Use `--format=directory` for parallel backup
- Implement incremental backups
- Upgrade hardware (faster disks, more RAM)

```bash
# Parallel backup (4 jobs)
pg_dump \
  --format=directory \
  --jobs=4 \
  --file=backups/parallel_backup \
  heart_recovery_calendar
```

#### Issue 2: Insufficient Disk Space

**Problem:** Backup fails due to lack of disk space

**Solutions:**
- Clean up old backups
- Compress backups more aggressively
- Move backups to larger storage
- Implement backup rotation

```bash
# Compress old backups
find /backups -name "*.sql" -mtime +7 -exec gzip {} \;

# Remove backups older than 30 days
find /backups -name "*.backup*" -mtime +30 -delete
```

#### Issue 3: pg_dump Permission Denied

**Problem:** User doesn't have sufficient privileges

**Solutions:**
```bash
# Grant necessary permissions
psql -U postgres -d heart_recovery_calendar << EOF
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
EOF
```

#### Issue 4: Restore Fails with Dependency Errors

**Problem:** Foreign key constraints or dependencies cause restore failures

**Solutions:**
```bash
# Restore with --disable-triggers (use with caution)
pg_restore \
  --disable-triggers \
  --dbname=heart_recovery_calendar \
  backup_file.backup

# Or restore in specific order
pg_restore --list backup_file.backup > restore.list
# Edit restore.list to change order
pg_restore --use-list=restore.list backup_file.backup
```

#### Issue 5: Backup File Corrupted

**Problem:** Cannot restore from backup file

**Solutions:**
- Try restoring from previous backup
- Check backup script logs for errors
- Verify disk integrity
- Implement backup verification immediately after creation

#### Issue 6: Password Authentication Failed

**Problem:** pg_dump prompts for password or authentication fails

**Solutions:**

```bash
# Option 1: Use .pgpass file (recommended)
echo "localhost:5432:heart_recovery_calendar:postgres:your_password" > ~/.pgpass
chmod 600 ~/.pgpass

# Option 2: Set PGPASSWORD environment variable (less secure)
export PGPASSWORD=your_password
pg_dump heart_recovery_calendar > backup.sql
unset PGPASSWORD

# Option 3: Use pg_service.conf
# Create ~/.pg_service.conf
cat > ~/.pg_service.conf << EOF
[heart_recovery]
host=localhost
port=5432
dbname=heart_recovery_calendar
user=postgres
password=your_password
EOF

# Use service
pg_dump "service=heart_recovery" > backup.sql
```

---

## Best Practices Summary

✅ **DO:**
- Test restores regularly (monthly minimum)
- Encrypt all backups containing PHI
- Store backups offsite
- Monitor backup success/failure
- Document all procedures
- Automate backups
- Verify backup integrity immediately after creation
- Keep multiple backup generations
- Test disaster recovery plan annually

❌ **DON'T:**
- Store backups on same server as database
- Use unencrypted backups for PHI
- Forget to test restore procedures
- Keep backups indefinitely (storage costs, compliance)
- Run backups during peak usage hours
- Store backup credentials in plaintext
- Rely on a single backup method

---

## Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Disaster Recovery Planning Guide](https://www.ready.gov/business/emergency-plans/recovery-plan)

---

**Last Updated:** November 1, 2025
**Next Review Date:** February 1, 2026
