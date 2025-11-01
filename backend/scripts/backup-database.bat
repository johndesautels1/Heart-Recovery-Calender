@echo off
REM ============================================================================
REM Database Backup Script for Heart Recovery Calendar (Windows)
REM ============================================================================
REM This script creates automated PostgreSQL backups on Windows systems
REM Run daily via Windows Task Scheduler for production environments
REM
REM Usage: backup-database.bat
REM Requires: PostgreSQL client tools (pg_dump), database credentials set
REM ============================================================================

setlocal EnableDelayedExpansion

REM Configuration
set BACKUP_DIR=C:\Backups\heart-recovery-calendar
set RETENTION_DAYS=30
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set LOG_FILE=%BACKUP_DIR%\backup.log

REM Database credentials (load from environment or set manually)
REM IMPORTANT: In production, set these as Windows environment variables
REM or use a secure credential store
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=heart_recovery_calendar
set DB_USER=postgres
REM Note: PGPASSWORD environment variable or .pgpass file should be used

echo ========================================== >> "%LOG_FILE%"
echo %date% %time% - Backup started >> "%LOG_FILE%"
echo Database: %DB_NAME% >> "%LOG_FILE%"
echo Host: %DB_HOST%:%DB_PORT% >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"

REM Create backup directory
if not exist "%BACKUP_DIR%\%DATE%" (
    mkdir "%BACKUP_DIR%\%DATE%"
    if errorlevel 1 (
        echo %date% %time% - ERROR: Failed to create backup directory >> "%LOG_FILE%"
        exit /b 1
    )
)

REM Construct backup filename
set BACKUP_FILE=%BACKUP_DIR%\%DATE%\heart_recovery_%TIMESTAMP%.backup

REM Perform backup
echo %date% %time% - Creating backup: %BACKUP_FILE% >> "%LOG_FILE%"

pg_dump ^
  --host=%DB_HOST% ^
  --port=%DB_PORT% ^
  --username=%DB_USER% ^
  --format=custom ^
  --compress=9 ^
  --file="%BACKUP_FILE%" ^
  %DB_NAME%

REM Check if backup succeeded
if errorlevel 1 (
    echo %date% %time% - ERROR: Backup failed! >> "%LOG_FILE%"
    exit /b 1
) else (
    echo %date% %time% - Backup completed successfully >> "%LOG_FILE%"

    REM Get backup file size
    for %%A in ("%BACKUP_FILE%") do (
        set BACKUP_SIZE=%%~zA
        echo %date% %time% - Backup size: !BACKUP_SIZE! bytes >> "%LOG_FILE%"
    )

    REM Verify backup integrity
    echo %date% %time% - Verifying backup integrity... >> "%LOG_FILE%"
    pg_restore --list "%BACKUP_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo %date% %time% - WARNING: Backup integrity check failed! >> "%LOG_FILE%"
    ) else (
        echo %date% %time% - Backup integrity verified >> "%LOG_FILE%"
    )
)

REM Clean up old backups (older than RETENTION_DAYS)
echo %date% %time% - Cleaning up old backups... >> "%LOG_FILE%"
forfiles /p "%BACKUP_DIR%" /s /m *.backup /d -%RETENTION_DAYS% /c "cmd /c del @path" 2>nul
if errorlevel 1 (
    echo %date% %time% - No old backups to remove >> "%LOG_FILE%"
) else (
    echo %date% %time% - Old backups cleaned up ^(retention: %RETENTION_DAYS% days^) >> "%LOG_FILE%"
)

REM Optional: Upload to cloud storage (configure as needed)
REM if exist "C:\Program Files\Amazon\AWSCLIV2\aws.exe" (
REM     echo %date% %time% - Uploading to S3... >> "%LOG_FILE%"
REM     aws s3 cp "%BACKUP_FILE%" "s3://your-bucket/backups/%DATE%/" --sse AES256
REM     if errorlevel 1 (
REM         echo %date% %time% - ERROR: S3 upload failed >> "%LOG_FILE%"
REM     ) else (
REM         echo %date% %time% - Backup uploaded to S3 >> "%LOG_FILE%"
REM     )
REM )

echo ========================================== >> "%LOG_FILE%"
echo %date% %time% - Backup process completed >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"

endlocal
exit /b 0
