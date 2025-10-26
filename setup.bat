@echo off
REM Heart Recovery Calendar - Windows Setup Script
REM This script will set up the entire application with all dependencies

echo ========================================
echo Heart Recovery Calendar Setup (Windows)
echo ========================================
echo.

REM Check for Node.js
echo [1/8] Checking for Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo Node.js found!
echo.

REM Check for PostgreSQL
echo [2/8] Checking for PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: psql command not found. Make sure PostgreSQL is installed.
    echo Download from: https://www.postgresql.org/download/windows/
) else (
    psql --version
    echo PostgreSQL found!
)
echo.

REM Install backend dependencies
echo [3/8] Installing backend dependencies...
cd backend
if not exist "package.json" (
    echo ERROR: backend/package.json not found!
    pause
    exit /b 1
)
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo Backend dependencies installed!
cd ..
echo.

REM Install frontend dependencies
echo [4/8] Installing frontend dependencies...
cd frontend
if not exist "package.json" (
    echo ERROR: frontend/package.json not found!
    pause
    exit /b 1
)
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
echo Frontend dependencies installed!
cd ..
echo.

REM Setup backend .env
echo [5/8] Setting up backend environment variables...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo Backend .env file created from template.
    echo IMPORTANT: Edit backend\.env and update:
    echo   - DB_PASSWORD (your PostgreSQL password^)
    echo   - JWT_SECRET (generate a secure random string^)
    echo   - Other settings as needed
) else (
    echo Backend .env file already exists (skipping^)
)
echo.

REM Setup frontend .env
echo [6/8] Setting up frontend environment variables...
if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env"
    echo Frontend .env file created from template.
) else (
    echo Frontend .env file already exists (skipping^)
)
echo.

REM Database setup
echo [7/8] Setting up database...
echo.
echo Please ensure you have created the PostgreSQL database.
echo You can create it by running:
echo   psql -U postgres -c "CREATE DATABASE heart_recovery_calendar;"
echo.
set /p run_migrations="Run database migrations now? (y/n): "
if /i "%run_migrations%"=="y" (
    cd backend
    call npm run migrate
    if %ERRORLEVEL% NEQ 0 (
        echo WARNING: Database migration failed. Check your database connection settings.
        echo Make sure to:
        echo   1. PostgreSQL is running
        echo   2. Database exists (CREATE DATABASE heart_recovery_calendar;^)
        echo   3. backend\.env has correct DB credentials
    ) else (
        echo Database migrations completed successfully!
    )
    cd ..
) else (
    echo Skipping database migrations.
    echo Remember to run: cd backend ^&^& npm run migrate
)
echo.

REM Final instructions
echo [8/8] Setup complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit backend\.env with your database password and JWT secret
echo   2. Create the database: psql -U postgres -c "CREATE DATABASE heart_recovery_calendar;"
echo   3. Run migrations: cd backend ^&^& npm run migrate
echo.
echo To start the application:
echo   Backend:  cd backend ^&^& npm run dev
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo The application will be available at:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:4000/api
echo.
echo ========================================
echo.

set /p start_servers="Start both servers now? (y/n): "
if /i "%start_servers%"=="y" (
    echo Starting servers...
    echo Press Ctrl+C in each window to stop the servers
    echo.
    start cmd /k "cd backend && npm run dev"
    timeout /t 2 /nobreak >nul
    start cmd /k "cd frontend && npm run dev"
    echo Both servers started in separate windows!
) else (
    echo Setup complete. You can start the servers manually.
)

pause
