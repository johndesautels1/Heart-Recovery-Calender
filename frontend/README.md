# Heart Recovery Calendar - Frontend

React-based frontend application for the Heart Recovery Calendar, providing an intuitive health monitoring dashboard for patients and therapists.

## Features

- **Patient Dashboard**: Track medications, vitals, meals, exercise, and symptoms
- **Interactive Calendar**: Full calendar view with event scheduling and medication reminders
- **Vital Signs Tracking**: Blood pressure, heart rate, weight, oxygen saturation
- **Medication Management**: Medication schedules, dosage tracking, and reminders
- **Device Integration UI**: Connect and sync data from Strava, Polar, and Samsung Health
- **Therapist Portal**: View and manage multiple patient records
- **Real-time Charts**: Visualize health trends with Recharts
- **Multi-language Support**: i18next internationalization
- **QR Code Generation**: Share profile or appointment data
- **Responsive Design**: Tailwind CSS for mobile-friendly interface

## Tech Stack

- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM 7.x
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Calendar**: FullCalendar
- **Charts**: Recharts
- **Date Handling**: date-fns, dayjs
- **UI Components**: Headless UI, Lucide React icons
- **Notifications**: React Hot Toast, Sonner
- **QR Codes**: qrcode.react, html5-qrcode

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Backend API running (see backend/README.md)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
   cd Heart-Recovery-Calender/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Create a `.env` file in the frontend directory:
   ```bash
   VITE_API_URL=http://localhost:4000
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
Application will start on `http://localhost:3000` with hot module replacement.

### Production Build
```bash
npm run build
npm run preview
```

### Linting
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React Context providers
│   ├── pages/           # Page components
│   ├── services/        # API client
│   ├── types/           # TypeScript types
│   └── App.tsx
├── dist/                # Build output
└── package.json
```

## Key Routes

- `/dashboard` - Patient dashboard
- `/calendar` - Interactive calendar
- `/vitals` - Vital signs tracking
- `/medications` - Medication management
- `/devices` - Device integrations
- `/profile` - User profile

## Device Integration

Connect Strava, Polar, or Samsung Health from the Devices page to automatically sync heart rate and fitness data.

## Contributing

See the main repository README for contribution guidelines.

## License

MIT

## Author

John Desautels
