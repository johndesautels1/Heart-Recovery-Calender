# Heart Recovery Calendar

A comprehensive health tracking application designed for cardiac recovery patients and their therapists. Features include calendar management, vital signs tracking, medication management, meal planning, exercise prescriptions, QR code sharing, and more.

## Features

### Patient Features
- 📅 **Calendar Management** - Track appointments, medications, meals, and exercises
- 💊 **Medication Tracking** - Manage medications with dosage logs and schedules
- ❤️ **Vital Signs** - Track heart rate, blood pressure, weight, temperature, and hydration
- 🍽️ **Meal Planning** - Log meals and track nutritional compliance with food database
- 📊 **Analytics Dashboard** - Visualize health trends and progress
- 📱 **Export Calendar** - Export to Google Calendar, Apple Calendar, Calendly, or JSON
- 📄 **Print Calendar** - Generate printable calendar views
- 📲 **QR Code Sharing** - Share calendar via QR code

### Therapist Features
- 👥 **Patient Management** - Manage multiple patients with surgery date tracking
- 🏃 **Exercise Library** - Create and manage exercise prescriptions with categories
- 📋 **Exercise Prescriptions** - Assign customized exercise programs to patients
- 📈 **Patient Progress** - Monitor patient compliance and recovery
- 🔄 **View Toggle** - Switch between therapist and patient views
- 📊 **Statistics** - View aggregated patient and prescription statistics
- 📲 **QR Patient Onboarding** - Generate QR codes for easy patient enrollment

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling with custom design system
- **React Router v6** for navigation
- **React Hook Form** with Zod validation
- **FullCalendar** for advanced calendar views
- **Chart.js** + **react-chartjs-2** for data visualization
- **React Query** (@tanstack/react-query) for server state management
- **qrcode.react** for QR code generation
- **date-fns** for date manipulation

### Backend
- **Node.js 18+** with Express
- **TypeScript** for type safety
- **Sequelize ORM** with PostgreSQL
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** enabled for frontend communication

## Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** or **yarn**
- **Git**

### Quick Start with Setup Script

**Windows:**
```bash
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar
setup.bat
```

**Linux/Mac:**
```bash
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. Install all dependencies (frontend + backend)
2. Create `.env` files from templates
3. Set up the PostgreSQL database
4. Run migrations
5. Start both servers

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api

### Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

#### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=heart_recovery_calendar
   DB_USER=postgres
   DB_PASSWORD=your_password

   # Server
   PORT=4000
   NODE_ENV=development

   # Security (CHANGE THESE!)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # CORS
   CORS_ORIGIN=http://localhost:3000
   ```

4. Create PostgreSQL database:
   ```sql
   CREATE DATABASE heart_recovery_calendar;
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

6. Start server:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:4000/api

   # App Configuration
   VITE_APP_NAME=Heart Recovery Calendar
   VITE_APP_URL=http://localhost:3000
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

</details>

## 🚀 Cloning for Other Applications

This template is designed to be easily cloned and customized for other health tracking or calendar-based applications.

### Quick Clone Guide

```bash
# 1. Clone this repository with a new name
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git my-new-app
cd my-new-app

# 2. Remove existing git history and start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from Heart Recovery Calendar template"

# 3. Set new remote
git remote add origin your-new-repo-url
git push -u origin master

# 4. Run the customization script
node customize.js
```

### Customization Checklist

#### 1. Branding
- [ ] Update `VITE_APP_NAME` in `frontend/.env`
- [ ] Replace logo files in `frontend/public/`
- [ ] Update `package.json` name in both `frontend/` and `backend/`
- [ ] Customize colors in `frontend/src/index.css` (CSS custom properties)
- [ ] Update favicon and app icons

#### 2. Database
- [ ] Create new PostgreSQL database with unique name
- [ ] Update `DB_NAME` in `backend/.env`
- [ ] Run migrations: `cd backend && npm run migrate`

#### 3. Environment Variables
- [ ] Generate new `JWT_SECRET` (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Update all API URLs for your domain
- [ ] Configure any third-party service keys

#### 4. Features (Optional)
- [ ] Enable/disable features in `frontend/src/config/features.ts`
- [ ] Customize user roles in `backend/src/models/User.ts`
- [ ] Add custom models in `backend/src/models/`
- [ ] Add custom API routes in `backend/src/routes/`

### Customization Script

Run the interactive customization script:

```bash
node customize.js
```

This will prompt you for:
- Application name
- Database name
- Company/organization name
- Primary color scheme
- Features to enable/disable

## Database Schema

### Core Tables
- `Users` - User accounts (patients/therapists)
- `Calendars` - User calendars
- `Events` - Calendar events (appointments, meds, meals, exercises)
- `Patients` - Patient profiles (managed by therapists)
- `Medications` - Medication records
- `MedicationLogs` - Dose tracking
- `VitalsSamples` - Vital sign measurements
- `MealEntries` - Meal logs
- `Exercises` - Exercise library
- `ExercisePrescriptions` - Assigned exercises to patients
- `ExerciseLogs` - Exercise completion tracking
- `FoodCategories` - Food categorization
- `FoodItems` - Food database
- `TherapyGoals` - Recovery goals
- `Alerts` - System alerts

## API Documentation

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user (patient/therapist) | No |
| POST | `/api/auth/login` | Login with email/password | No |
| GET | `/api/auth/me` | Get current user info | Yes |

### Calendars
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendars` | List user's calendars |
| POST | `/api/calendars` | Create calendar |
| GET | `/api/calendars/:id` | Get calendar details |
| PUT | `/api/calendars/:id` | Update calendar |
| DELETE | `/api/calendars/:id` | Delete calendar |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (with filters) |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get event details |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| PATCH | `/api/events/:id/status` | Update event status |
| POST | `/api/events/:id/instances` | Get recurring instances |

### Medications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medications` | List medications |
| POST | `/api/medications` | Add medication |
| GET | `/api/medications/:id` | Get medication |
| PUT | `/api/medications/:id` | Update medication |
| DELETE | `/api/medications/:id` | Delete medication |
| POST | `/api/medications/:id/log-dose` | Log dose taken |
| GET | `/api/medications/schedule` | Get schedule |
| GET | `/api/medications/logs` | Get dose logs |

### Vitals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vitals` | List vitals |
| POST | `/api/vitals` | Add vital reading |
| GET | `/api/vitals/latest` | Get latest reading |
| GET | `/api/vitals/trends` | Get trend data |

### Meals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meals` | List meals |
| POST | `/api/meals` | Log meal |
| GET | `/api/meals/daily-summary` | Get daily summary |
| GET | `/api/meals/compliance` | Get compliance stats |

### Patients (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List patients |
| POST | `/api/patients` | Add patient |
| GET | `/api/patients/:id` | Get patient details |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |
| GET | `/api/patients/:id/post-op-week` | Get recovery week |

### Exercises (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exercises` | List exercises |
| POST | `/api/exercises` | Create exercise |
| GET | `/api/exercises/:id` | Get exercise |
| PUT | `/api/exercises/:id` | Update exercise |
| DELETE | `/api/exercises/:id` | Delete exercise |
| GET | `/api/exercises/categories/list` | Get categories |
| GET | `/api/exercises/stats` | Get statistics |

### Exercise Prescriptions (Therapist Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exercise-prescriptions` | List prescriptions |
| POST | `/api/exercise-prescriptions` | Create prescription |
| GET | `/api/exercise-prescriptions/:id` | Get prescription |
| PUT | `/api/exercise-prescriptions/:id` | Update prescription |
| DELETE | `/api/exercise-prescriptions/:id` | Delete prescription |
| GET | `/api/exercise-prescriptions/:id/logs` | Get exercise logs |
| GET | `/api/exercise-prescriptions/stats` | Get statistics |

## User Roles

### Patient Role
- Access to personal health dashboard
- Calendar event management
- Medication tracking and logging
- Vital signs recording
- Meal logging
- View assigned exercise prescriptions
- Export/print calendar
- Generate QR code for calendar sharing

### Therapist Role
- All patient role features
- Patient management (add, edit, view patients)
- Exercise library management
- Exercise prescription creation and assignment
- Patient progress monitoring
- View aggregated statistics
- Toggle between therapist and patient views
- Generate patient onboarding QR codes

## QR Code Features

### Patient Calendar Sharing
Patients can generate a QR code that contains their calendar data:
- Navigate to Calendar page
- Click "Share" button
- Generate QR code
- Other users scan to import calendar

### Therapist Patient Onboarding
Therapists can generate QR codes for patient enrollment:
- Navigate to Patients page
- Click "Add Patient" → "Generate QR Code"
- Patient scans code to auto-register with therapist assignment

## Deployment

### Environment Variables for Production

**Backend (`backend/.env`):**
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=heart_recovery_prod
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_secure_random_64_char_string
PORT=4000
CORS_ORIGIN=https://your-domain.com
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=https://api.your-domain.com/api
VITE_APP_NAME=Heart Recovery Calendar
VITE_APP_URL=https://your-domain.com
```

### Deployment Platforms

<details>
<summary>Vercel (Frontend)</summary>

1. Connect GitHub repository
2. Framework Preset: **Vite**
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variables
7. Deploy

</details>

<details>
<summary>Render (Backend + Database)</summary>

1. Create PostgreSQL database
2. Create Web Service
3. Build Command: `cd backend && npm install && npm run build`
4. Start Command: `cd backend && npm start`
5. Add environment variables
6. Deploy

</details>

<details>
<summary>Railway (Full Stack)</summary>

1. Connect GitHub repository
2. Add PostgreSQL plugin
3. Configure backend service:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Configure frontend service:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
5. Add environment variables
6. Deploy

</details>

## Development

### Project Structure
```
Heart-Recovery-Calendar/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validation
│   │   ├── config/           # DB config
│   │   └── server.ts         # Entry point
│   ├── migrations/           # DB migrations
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utilities
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── .env.example
│   └── package.json
├── setup.bat                 # Windows setup
├── setup.sh                  # Linux/Mac setup
├── customize.js              # Customization script
└── README.md
```

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

### Database Operations

**Create migration:**
```bash
cd backend
npx sequelize-cli migration:generate --name migration-name
```

**Run migrations:**
```bash
npm run migrate
```

**Rollback:**
```bash
npm run migrate:undo
```

**Seed database:**
```bash
npm run seed
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Email**: support@heartrecovery.com
- **Issues**: [GitHub Issues](https://github.com/johndesautels1/Heart-Recovery-Calender/issues)
- **Discussions**: [GitHub Discussions](https://github.com/johndesautels1/Heart-Recovery-Calender/discussions)

## Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- [FullCalendar](https://fullcalendar.io/) for calendar functionality
- [Chart.js](https://www.chartjs.org/) for data visualization
- [React](https://react.dev/) ecosystem
- [Express](https://expressjs.com/) and [Sequelize](https://sequelize.org/) for backend

---

**⚠️ Security Notice**: Remember to change all default passwords, secrets, and API keys before deploying to production!

**Made with ❤️ for cardiac recovery**
