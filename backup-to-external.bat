@echo off
echo ========================================
echo Heart Recovery Calendar Backup Script
echo ========================================
echo.

REM Set backup location on D: drive
set BACKUP_ROOT=D:\Heart-Recovery-Backups
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=%BACKUP_ROOT%\backup_%TIMESTAMP%

echo Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul
mkdir "%BACKUP_DIR%\code" 2>nul
mkdir "%BACKUP_DIR%\database" 2>nul

echo.
echo [1/3] Backing up code from C:\Users\broke\Heart-Recovery-Calender...
xcopy "C:\Users\broke\Heart-Recovery-Calender" "%BACKUP_DIR%\code\" /E /I /H /Y /EXCLUDE:C:\Users\broke\Heart-Recovery-Calender\backup-exclude.txt

echo.
echo [2/3] Backing up database...
set PGPASSWORD=2663
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U postgres -d heartbeat_calendar -F c -f "%BACKUP_DIR%\database\heartbeat_calendar_%TIMESTAMP%.backup"

if %ERRORLEVEL% EQU 0 (
    echo Database backup successful!
) else (
    echo WARNING: Database backup failed! Error code: %ERRORLEVEL%
)

echo.
echo [3/3] Creating backup info file...
echo Backup created: %TIMESTAMP% > "%BACKUP_DIR%\backup-info.txt"
echo Database: heartbeat_calendar >> "%BACKUP_DIR%\backup-info.txt"
echo Code directory: C:\Users\broke\Heart-Recovery-Calender >> "%BACKUP_DIR%\backup-info.txt"

echo.
echo ========================================
echo BACKUP COMPLETE!
echo ========================================
echo Location: %BACKUP_DIR%
echo.
echo To restore:
echo   1. Code: Copy from %BACKUP_DIR%\code\
echo   2. Database: Use pg_restore with the .backup file
echo.
pause
