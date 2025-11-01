# Full Backup Script for Heart Recovery Calendar
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FULL BACKUP - Heart Recovery Calendar" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create timestamped backup directory
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "D:\Heart-Recovery-Backups\FULL-BACKUP_$timestamp"

Write-Host "Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\Heart-Recovery-Calender" -Force | Out-Null

Write-Host ""
Write-Host "[1/2] Copying ALL code (this may take a few minutes)..." -ForegroundColor Yellow

# Use robocopy for efficient copying
$robocopyResult = robocopy "C:\Users\broke\Heart-Recovery-Calender" "$backupDir\Heart-Recovery-Calender" /E /Z /R:3 /W:5 /NFL /NDL
# Robocopy exit codes: 0-7 are success, 8+ are failures
if ($LASTEXITCODE -le 7) {
    Write-Host "Code backup complete!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Code backup may have issues! Exit code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/2] Backing up database..." -ForegroundColor Yellow

# Set PostgreSQL password environment variable
$env:PGPASSWORD = "2663"

# Run pg_dump
$pgDumpPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
$dbBackupFile = "$backupDir\heartbeat_calendar_BACKUP.backup"

& $pgDumpPath -h localhost -U postgres -d heartbeat_calendar -F c -f $dbBackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database backup successful!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Database backup failed! Error code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Creating README..." -ForegroundColor Yellow

# Create README file
$readmeContent = @"
FULL BACKUP - $timestamp

SOURCE: C:\Users\broke\Heart-Recovery-Calender
DATABASE: heartbeat_calendar

TO RESTORE:
1. Copy Heart-Recovery-Calender folder to C:\Users\broke\
2. Run: pg_restore -h localhost -U postgres -d heartbeat_calendar heartbeat_calendar_BACKUP.backup
3. Run: npm install in both backend and frontend folders
4. Run: npm run dev in both backend and frontend folders

BACKUP CONTENTS:
- Complete source code (frontend + backend)
- All node_modules for immediate recovery
- Git repository history
- PostgreSQL database dump (custom format)

Created: $timestamp
"@

$readmeContent | Out-File -FilePath "$backupDir\README.txt" -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Location: $backupDir" -ForegroundColor Cyan
Write-Host ""

# List backup contents
Write-Host "Backup Contents:" -ForegroundColor Yellow
Get-ChildItem -Path $backupDir -Recurse -Depth 1 | Format-Table Name, Length, LastWriteTime -AutoSize
