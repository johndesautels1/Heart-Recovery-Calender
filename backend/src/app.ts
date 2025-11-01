import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import sequelize, { models } from './models';
import logger from './utils/logger';
import apiRoutes from './routes/index';
// import authRoutes from './routes/auth';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
// import { initializeScheduler } from './services/notificationScheduler';

dotenv.config();

const app = express();

// Security middleware - sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid breaking existing functionality
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// Rate limiting configuration
// General API rate limiter - 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth rate limiter - stricter limits for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Upload rate limiter - moderate limits for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many file uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration - Balance security with flexibility
// Supports multiple localhost ports for development and specific origin for production
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Get allowed origin from environment variable (production) or use defaults (development)
    const allowedOrigins = process.env.CORS_ORIGIN
      ? [process.env.CORS_ORIGIN]
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173', // Vite default
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173',
        ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // Cache pre-flight requests for 24 hours (reduce OPTIONS spam)
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((_req, _res, next) => {
  logger.info('Request: ' + _req.method + ' ' + _req.url);
  next();
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply stricter rate limiting to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply rate limiting to upload endpoints
app.use('/api/upload', uploadLimiter);

app.use('/api', apiRoutes);

app.get('/metrics', metricsMiddleware);

// Error handling - must be after all routes
app.use(notFoundHandler);
app.use(errorHandler);

sequelize.authenticate().then(() => {
  logger.info('Database connected');
  logger.info(`Models loaded: ${Object.keys(models).length} models`);

  // Initialize notification scheduler after database connection
  // initializeScheduler();
  // logger.info('Notification scheduler initialized');
}).catch(err => {
  logger.error('Database connection error', err);
});

export default app;
