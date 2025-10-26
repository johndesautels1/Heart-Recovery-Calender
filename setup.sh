#!/bin/bash
# Heart Recovery Calendar - Linux/Mac Setup Script
# This script will set up the entire application with all dependencies

set -e  # Exit on error

echo "========================================"
echo "Heart Recovery Calendar Setup (Unix)"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check for Node.js
echo "[1/8] Checking for Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
print_status "Node.js found: $NODE_VERSION"
echo ""

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_status "npm found: v$NPM_VERSION"
echo ""

# Check for PostgreSQL
echo "[2/8] Checking for PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "psql command not found. Make sure PostgreSQL is installed."
    echo "Download from: https://www.postgresql.org/download/"
else
    PSQL_VERSION=$(psql --version)
    print_status "PostgreSQL found: $PSQL_VERSION"
fi
echo ""

# Install backend dependencies
echo "[3/8] Installing backend dependencies..."
if [ ! -f "backend/package.json" ]; then
    print_error "backend/package.json not found!"
    exit 1
fi
cd backend
npm install
print_status "Backend dependencies installed!"
cd ..
echo ""

# Install frontend dependencies
echo "[4/8] Installing frontend dependencies..."
if [ ! -f "frontend/package.json" ]; then
    print_error "frontend/package.json not found!"
    exit 1
fi
cd frontend
npm install
print_status "Frontend dependencies installed!"
cd ..
echo ""

# Setup backend .env
echo "[5/8] Setting up backend environment variables..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    print_status "Backend .env file created from template."
    print_warning "IMPORTANT: Edit backend/.env and update:"
    echo "  - DB_PASSWORD (your PostgreSQL password)"
    echo "  - JWT_SECRET (generate a secure random string)"
    echo "  - Other settings as needed"
    echo ""
    echo "Generate a secure JWT secret with:"
    echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
else
    print_status "Backend .env file already exists (skipping)"
fi
echo ""

# Setup frontend .env
echo "[6/8] Setting up frontend environment variables..."
if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    print_status "Frontend .env file created from template."
else
    print_status "Frontend .env file already exists (skipping)"
fi
echo ""

# Database setup
echo "[7/8] Setting up database..."
echo ""
echo "Please ensure you have created the PostgreSQL database."
echo "You can create it by running:"
echo "  psql -U postgres -c \"CREATE DATABASE heart_recovery_calendar;\""
echo ""
read -p "Run database migrations now? (y/n): " run_migrations

if [ "$run_migrations" = "y" ] || [ "$run_migrations" = "Y" ]; then
    cd backend
    if npm run migrate; then
        print_status "Database migrations completed successfully!"
    else
        print_warning "Database migration failed. Check your database connection settings."
        echo "Make sure to:"
        echo "  1. PostgreSQL is running"
        echo "  2. Database exists (CREATE DATABASE heart_recovery_calendar;)"
        echo "  3. backend/.env has correct DB credentials"
    fi
    cd ..
else
    print_warning "Skipping database migrations."
    echo "Remember to run: cd backend && npm run migrate"
fi
echo ""

# Final instructions
echo "[8/8] Setup complete!"
echo "========================================"
echo ""
print_status "Next steps:"
echo "  1. Edit backend/.env with your database password and JWT secret"
echo "  2. Create the database: psql -U postgres -c \"CREATE DATABASE heart_recovery_calendar;\""
echo "  3. Run migrations: cd backend && npm run migrate"
echo ""
echo "To start the application:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000/api"
echo ""
echo "========================================"
echo ""

read -p "Start both servers now? (y/n): " start_servers

if [ "$start_servers" = "y" ] || [ "$start_servers" = "Y" ]; then
    print_status "Starting servers in separate terminal windows..."

    # Check if we're on macOS or Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'/backend\" && npm run dev"'
        sleep 2
        osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'/frontend\" && npm run dev"'
        print_status "Both servers started in separate Terminal windows!"
    else
        # Linux - try different terminal emulators
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd backend && npm run dev; exec bash"
            sleep 2
            gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash"
            print_status "Both servers started in separate gnome-terminal windows!"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd backend && npm run dev" &
            sleep 2
            xterm -e "cd frontend && npm run dev" &
            print_status "Both servers started in separate xterm windows!"
        else
            print_warning "Could not find a terminal emulator. Please start the servers manually:"
            echo "  Terminal 1: cd backend && npm run dev"
            echo "  Terminal 2: cd frontend && npm run dev"
        fi
    fi
else
    print_status "Setup complete. You can start the servers manually."
fi

echo ""
