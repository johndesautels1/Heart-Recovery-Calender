# Heart Recovery Calendar - Setup Guide

## Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- Git installed

## Quick Start (5 Minutes)

### 1. Install Dependencies

#### Backend:
cd backend
npm install

#### Frontend:
cd frontend
npm install


### 2. Create PostgreSQL Database

#### Option A: Using psql command line
psql -U postgres
CREATE DATABASE heartbeat_calendar;
\q


#### Option B: Using pgAdmin
1. Open pgAdmin
2. Right-click on "Databases"
3. Create > Database
4. Name: heartbeat_calendar
5. Click Save


### 3. Configure Environment Variables

cd backend
cp .env.example .env


Edit backend/.env and update these required values:

DB_NAME=heartbeat_calendar
DB_USER=postgres
DB_PASS=YOUR_ACTUAL_PASSWORD_HERE
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=change-this-to-a-random-secret-string


### 4. Run Database Migrations

This creates all the tables (users, calendars, events, meals, vitals, medications):

cd backend
npx sequelize-cli db:migrate


You should see output like:

Sequelize CLI [Node: 16.x.x]

Loaded configuration file "src/config/database.js".
Using environment "development".
== 20251024000001-create-users: migrating =======
== 20251024000001-create-users: migrated (0.123s)
== 20251024000002-create-calendars: migrating =======
...


### 5. Start the Backend Server

cd backend
npm run dev


You should see:

Server running on port 8080
Database connected


### 6. Start the Frontend (in a new terminal)

cd frontend
npm start


Frontend should open at: http://localhost:3000


## Testing the Setup

### 1. Check Backend Health
curl http://localhost:8080/api/auth/me


Should return 401 (Unauthorized) - this is correct! It means the API is running.

### 2. Register a Test User
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'


Should return a JSON with a token.

### 3. Test Protected Endpoint
Replace YOUR_TOKEN with the token from step 2:

curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"


Should return your user info!

## Available API Endpoints

### Authentication (Public)
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login with email/password
- GET /api/auth/google - OAuth with Google
- POST /api/auth/apple/callback - OAuth with Apple

### Protected Endpoints (Require JWT Token)

#### Users
- GET /api/users/profile
- PUT /api/users/profile
- DELETE /api/users/account

#### Calendars
- GET /api/calendars
- POST /api/calendars
- GET /api/calendars/:id
- PUT /api/calendars/:id
- DELETE /api/calendars/:id

#### Events
- GET /api/events
- POST /api/events
- GET /api/events/:id
- PUT /api/events/:id
- DELETE /api/events/:id
- PATCH /api/events/:id/status
- POST /api/events/:id/instances

#### Meals
- GET /api/meals
- POST /api/meals
- GET /api/meals/daily-summary
- GET /api/meals/compliance
- GET /api/meals/:id
- PUT /api/meals/:id
- DELETE /api/meals/:id

#### Vitals
- GET /api/vitals
- POST /api/vitals
- GET /api/vitals/latest
- GET /api/vitals/trends
- GET /api/vitals/:id
- PUT /api/vitals/:id
- DELETE /api/vitals/:id

#### Medications
- GET /api/medications
- POST /api/medications
- GET /api/medications/schedule
- GET /api/medications/:id
- PUT /api/medications/:id
- DELETE /api/medications/:id
- PATCH /api/medications/:id/toggle-active
- POST /api/medications/:id/log-dose

## Troubleshooting

### "Database connection error"
1. Check PostgreSQL is running: pg_ctl status (Windows) or ps aux | grep postgres (Mac/Linux)
2. Verify credentials in backend/.env match your PostgreSQL setup
3. Try connecting manually: psql -U postgres -d heartbeat_calendar

### "Migration failed"
1. Drop and recreate database:
   psql -U postgres
   DROP DATABASE heartbeat_calendar;
   CREATE DATABASE heartbeat_calendar;
   \q
   
2. Run migrations again: npx sequelize-cli db:migrate

### "Cannot find module 'bcrypt'"
npm install bcrypt jsonwebtoken sequelize pg


### "Port 8080 already in use"
1. Find process: netstat -ano | findstr :8080 (Windows) or lsof -i :8080 (Mac/Linux)
2. Kill process or change PORT in backend/.env

## Next Steps

1. Open http://localhost:3000 in your browser
2. Click "Sign in with Email" (if implemented) or use OAuth
3. Create your first calendar
4. Add some events, meals, or vitals
5. Explore the dashboard!

## Optional: Sample Data

To add sample data for testing:

cd backend
npx sequelize-cli db:seed:all


(Note: Seeders not implemented yet, but you can create them in backend/src/seeders/)

## Production Deployment

See DEPLOYMENT.md for instructions on deploying to:
- Heroku
- AWS
- Google Cloud
- Docker/Kubernetes

## Support

- GitHub Issues: https://github.com/johndesautels1/Heart-Recovery-Calender/issues
- Documentation: https://github.com/johndesautels1/Heart-Recovery-Calender/wiki

Built with ❤️ by Claude Code
