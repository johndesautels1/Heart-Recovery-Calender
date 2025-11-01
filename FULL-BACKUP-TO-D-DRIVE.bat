@echo off
echo ========================================
echo FULL BACKUP - Heart Recovery Calendar
echo ========================================
echo Source: C:\Users\broke\Heart-Recovery-Calender
echo Destination: D:\Heart-Recovery-Backups
echo.
echo This will backup:
echo   - All frontend code
echo   - All backend code
echo   - Database dump
echo   - Git history
echo.
pause

REM Create timestamped backup folder
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=D:\Heart-Recovery-Backups\FULL-BACKUP_%TIMESTAMP%

echo.
echo Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo.
echo [1/2] Copying ALL code (including node_modules for safety)...
xcopy "C:\Users\broke\Heart-Recovery-Calender" "%BACKUP_DIR%\Heart-Recovery-Calender\" /E /I /H /Y

echo.
echo [2/2] Backing up database...
set PGPASSWORD=2663
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U postgres -d heartbeat_calendar -F c -f "%BACKUP_DIR%\heartbeat_calendar_BACKUP.backup"

if %ERRORLEVEL% EQU 0 (
    echo Database backup successful!
) else (
    echo WARNING: Database backup may have failed! Error code: %ERRORLEVEL%
)

echo.
echo Creating README...
echo FULL BACKUP - %TIMESTAMP% > "%BACKUP_DIR%\README.txt"
echo. >> "%BACKUP_DIR%\README.txt"
echo SOURCE: C:\Users\broke\Heart-Recovery-Calender >> "%BACKUP_DIR%\README.txt"
echo DATABASE: heartbeat_calendar >> "%BACKUP_DIR%\README.txt"
echo. >> "%BACKUP_DIR%\README.txt"
echo TO RESTORE: >> "%BACKUP_DIR%\README.txt"
echo 1. Copy Heart-Recovery-Calender folder to C:\Users\broke\ >> "%BACKUP_DIR%\README.txt"
echo 2. Run: pg_restore -h localhost -U postgres -d heartbeat_calendar heartbeat_calendar_BACKUP.backup >> "%BACKUP_DIR%\README.txt"
echo 3. Run: npm install in both backend and frontend folders >> "%BACKUP_DIR%\README.txt"

echo.
echo ========================================
echo BACKUP COMPLETE!
echo ========================================
echo Location: %BACKUP_DIR%
echo.
pause
