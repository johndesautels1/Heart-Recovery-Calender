import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './models';
import logger from './utils/logger';
import apiRoutes from './routes/index';
import authRoutes from './routes/auth';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeScheduler } from './services/notificationScheduler';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((_req, _res, next) => {
  logger.info('Request: ' + _req.method + ' ' + _req.url);
  next();
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

app.get('/metrics', metricsMiddleware);

// Error handling - must be after all routes
app.use(notFoundHandler);
app.use(errorHandler);

sequelize.authenticate().then(() => {
  logger.info('Database connected');

  // Initialize notification scheduler after database connection
  initializeScheduler();
  logger.info('Notification scheduler initialized');
}).catch(err => {
  logger.error('Database connection error', err);
});

export default app;
