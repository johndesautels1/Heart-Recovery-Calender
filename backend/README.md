# Heart Recovery Calendar - Backend API

Backend API server for the Heart Recovery Calendar application, a comprehensive health monitoring platform for tracking heart health, medications, vitals, and fitness device integrations.

## Features

- **User Authentication**: JWT-based authentication with role-based access control (patients, therapists, admins)
- **Health Data Tracking**: Medications, vitals, meals, exercise, symptoms, and more
- **Device Integrations**:
  - Strava (heart rate & exercise data)
  - Polar (heart rate monitoring)
  - Samsung Health (fitness data)
- **Patient Management**: Therapists can view and manage multiple patient records
- **Calendar & Scheduling**: Track appointments, medication schedules, and health events
- **File Uploads**: Profile pictures and document attachments
- **Real-time Notifications**: Email and SMS reminders via Nodemailer and Twilio

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (jsonwebtoken), Passport.js (OAuth)
- **External APIs**: Strava API, Polar API, Samsung Health API
- **Notifications**: Nodemailer (email), Twilio (SMS)
- **Scheduled Jobs**: node-cron
- **Security**: bcrypt (password hashing), express-rate-limit

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/johndesautels1/Heart-Recovery-Calender.git
   cd Heart-Recovery-Calender/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and configure the following required variables:

   ```bash
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=heart_recovery_calendar
   DB_USER=postgres
   DB_PASSWORD=your_password

   # Server
   PORT=4000
   NODE_ENV=development

   # Security (CRITICAL - generate a secure key for production!)
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

   # CORS
   CORS_ORIGIN=http://localhost:3000
   FRONTEND_URL=http://localhost:3000

   # Strava API (for heart rate data sync - CRITICAL)
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
   ```

   See `.env.example` for all available configuration options.

4. **Set up the database**

   Create a PostgreSQL database:
   ```bash
   createdb heart_recovery_calendar
   ```

   Run migrations (if using Sequelize migrations):
   ```bash
   npx sequelize-cli db:migrate
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
Server will start on `http://localhost:4000` with hot-reloading via nodemon.

### Production Mode
```bash
# Build TypeScript to JavaScript
npm run build

# Start the production server
npm start
```

### Testing
```bash
npm test
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers and business logic
│   ├── middleware/      # Express middleware (auth, error handling)
│   ├── models/          # Sequelize database models
│   ├── routes/          # API route definitions
│   ├── services/        # External API integrations (Strava, etc.)
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript (generated)
├── .env                 # Environment variables (not in git)
├── .env.example         # Example environment variables
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token

### Health Data
- `GET /api/vitals` - Get vital signs
- `POST /api/vitals` - Record vital signs
- `GET /api/medications` - Get medications
- `POST /api/medications` - Add medication
- `GET /api/meals` - Get meal logs
- `POST /api/meals` - Log a meal
- `GET /api/exercise` - Get exercise logs
- `POST /api/exercise` - Log exercise

### Device Integrations
- `GET /api/strava/auth` - Initiate Strava OAuth
- `GET /api/strava/callback` - Strava OAuth callback
- `POST /api/strava/sync` - Manual sync from Strava

### Patient Management (Therapists only)
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient profile

See API documentation for complete endpoint list.

## Security Considerations

### CRITICAL - Production Deployment Checklist

1. **JWT Secret**: NEVER use the default `'your-secret-key'` fallback
   ```bash
   # Generate a secure secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Environment Variables**: Use proper secret management
   - AWS Secrets Manager
   - HashiCorp Vault
   - Environment-specific .env files (never commit to git)

3. **Database Security**:
   - Use strong database passwords
   - Enable SSL/TLS for database connections
   - Restrict database access by IP

4. **CORS**: Set `CORS_ORIGIN` to your production frontend URL

5. **Rate Limiting**: Configure appropriate rate limits for your use case

6. **HTTPS**: Always use HTTPS in production (terminate SSL at load balancer or reverse proxy)

## Device Integration Setup

### Strava (Critical for Heart Rate Monitoring)

This integration syncs heart rate data from Strava activities - essential for monitoring patient heart health.

1. Create a Strava API application at https://www.strava.com/settings/api
2. Set the authorization callback domain to your backend URL
3. Add credentials to `.env`:
   ```bash
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
   ```

### Polar (Optional)

1. Register at https://admin.polaraccesslink.com/
2. Add credentials to `.env`

### Samsung Health (Optional)

1. Register for Samsung Health developer access
2. Add credentials to `.env`

## Troubleshooting

### Database Connection Errors
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l`

### Strava OAuth Not Working
- Verify redirect URI matches exactly in Strava settings
- Check that Strava routes are registered BEFORE auth middleware
- Ensure `FRONTEND_URL` is set correctly for OAuth redirects

### Port Already in Use
```bash
# Find process using port 4000
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Kill the process or change PORT in .env
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/johndesautels1/Heart-Recovery-Calender/issues
- Email: cluesnomad@gmail.com

## Author

John Desautels
