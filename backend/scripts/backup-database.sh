#!/bin/bash

# ============================================================================
# Database Backup Script for Heart Recovery Calendar
# ============================================================================
# This script creates automated PostgreSQL backups with verification
# Run daily via cron job for production environments
#
# Usage: ./backup-database.sh
# Requires: PostgreSQL client tools (pg_dump), .env file with DB credentials
# ============================================================================

# Configuration
BACKUP_DIR="/var/backups/heart-recovery-calendar"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') - WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Load database credentials from .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | grep -v '^$' | xargs)
    log "Loaded database credentials from .env"
else
    log_error ".env file not found at $PROJECT_ROOT/.env"
    exit 1
fi

# Validate required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    log_error "Missing required environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER)"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"
if [ $? -ne 0 ]; then
    log_error "Failed to create backup directory: $BACKUP_DIR/$DATE"
    exit 1
fi

# Check disk space (require at least 1GB free)
AVAILABLE_SPACE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
MIN_SPACE=1048576  # 1GB in KB
if [ $AVAILABLE_SPACE -lt $MIN_SPACE ]; then
    log_error "Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${MIN_SPACE}KB"
    exit 1
fi

# Log start
log "=========================================="
log "Backup started"
log "Database: $DB_NAME"
log "Host: $DB_HOST:$DB_PORT"
log "=========================================="

# Construct backup filename
BACKUP_FILE="$BACKUP_DIR/$DATE/heart_recovery_$TIMESTAMP.backup"

# Perform backup
log "Creating backup: $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE" \
  --verbose \
  "$DB_NAME" 2>> "$LOG_FILE"

# Check if backup succeeded
if [ $? -eq 0 ]; then
    log_success "Backup completed successfully"

    # Get backup file size
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        BACKUP_SIZE_BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
        log "Backup size: $BACKUP_SIZE ($BACKUP_SIZE_BYTES bytes)"

        # Verify backup is not empty
        if [ $BACKUP_SIZE_BYTES -lt 1024 ]; then
            log_warning "Backup file suspiciously small (< 1KB). May be corrupt."
        fi
    else
        log_error "Backup file was not created"
        exit 1
    fi

    # Verify backup integrity
    log "Verifying backup integrity..."
    PGPASSWORD="$DB_PASSWORD" pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "Backup integrity verified"
    else
        log_error "Backup integrity check failed! File may be corrupted."
        exit 1
    fi

    # Create latest symlink
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.backup"
    log "Created symlink: $BACKUP_DIR/latest.backup -> $BACKUP_FILE"

else
    log_error "Backup failed! Check logs for details."
    exit 1
fi

# Calculate backup statistics
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.backup" -type f | wc -l)
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "Total backups: $TOTAL_BACKUPS"
log "Total backup storage: $TOTAL_BACKUP_SIZE"

# Remove old backups (older than RETENTION_DAYS)
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
DELETED_COUNT=0
while IFS= read -r old_backup; do
    rm -rf "$old_backup"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log "Deleted old backup: $old_backup"
done < <(find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS)

if [ $DELETED_COUNT -gt 0 ]; then
    log "Removed $DELETED_COUNT old backup(s)"
else
    log "No old backups to remove"
fi

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if command -v aws &> /dev/null; then
#     log "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://your-bucket/backups/$DATE/" --sse AES256
#     if [ $? -eq 0 ]; then
#         log_success "Backup uploaded to S3"
#     else
#         log_error "S3 upload failed"
#     fi
# fi

# Optional: Send notification (uncomment and configure)
# if [ -f "/usr/bin/mail" ]; then
#     echo "Backup completed: $BACKUP_FILE (Size: $BACKUP_SIZE)" | \
#         mail -s "Database Backup Successful - $DATE" admin@example.com
# fi

log "=========================================="
log "Backup process completed successfully"
log "=========================================="

exit 0
