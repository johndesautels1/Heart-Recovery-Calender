import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './models';
import logger from './utils/logger';
import apiRoutes from './routes/index';
import authRoutes from './routes/auth';
import { metricsMiddleware } from './middleware/metrics';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((_req, _res, next) => {
  logger.info(`Request: ${_req.method} ${_req.url}`);
  next();
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

app.get('/metrics', metricsMiddleware);

sequelize.authenticate().then(() => {
  logger.info('Database connected');
}).catch(err => {
  logger.error('Database connection error', err);
});

export default app;