# Heart Recovery Calendar

A comprehensive heart health management calendar application designed to help cardiac patients track their recovery, medications, vital signs, and appointments.

## Features

- 📅 **Multi-Calendar Support** - Separate calendars for medications, appointments, exercise, and more
- 💊 **Medication Reminders** - Never miss a dose with smart notifications
- 📊 **Vital Signs Tracking** - Monitor blood pressure, heart rate, and other vital signs
- 🍽️ **Meal Tracking** - Track nutrition and dietary compliance
- 📱 **Multi-Channel Notifications** - Email, SMS, and push notifications
- 🔐 **Secure Authentication** - Google and Apple sign-in support
- 📈 **Health Analytics** - Track compliance and progress over time
- 🔄 **Recurring Events** - Set up repeating medications and appointments

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- Sequelize ORM
- PostgreSQL
- Passport.js (OAuth)
- JWT Authentication
- Twilio (SMS)
- Firebase (Push Notifications)
- Nodemailer (Email)

### Frontend
- React 18 + TypeScript
- Material-UI
- React Big Calendar
- Recharts (Data Visualization)
- React Query
- Zustand (State Management)

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
cd Heart-Recovery-Calendar
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
```bash
cd ../backend
cp .env.example .env
# Edit .env with your configuration
```

5. Set up the database:
```bash
npm run db:migrate
```

6. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## Project Structure

```
Heart-Recovery-Calendar/
├── backend/
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration files
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   └── styles/         # CSS styles
│   └── package.json
└── README.md
```

## API Endpoints

- `GET /api/calendars` - Get user's calendars
- `POST /api/calendars` - Create a new calendar
- `GET /api/events` - Get calendar events
- `POST /api/events` - Create a new event
- `GET /api/meals` - Get meal entries
- `POST /api/meals` - Log a meal
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/apple` - Apple sign-in

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For support, please open an issue in the GitHub repository.