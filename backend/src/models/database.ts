import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'heartbeat_calendar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // Connection pool configuration for optimal performance
    // Pool reuses database connections instead of creating new ones for each request
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'), // Maximum number of connections in pool (default: 10)
      min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum number of connections in pool (default: 2)
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'), // Max time (ms) to get connection before throwing error (increased to 60s for CIA analysis)
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'), // Max time (ms) a connection can be idle before being released (default: 10s)
      evict: parseInt(process.env.DB_POOL_EVICT || '1000'), // Time interval (ms) for evicting stale connections (default: 1s)
    },

    // Dialect-specific options for PostgreSQL
    dialectOptions: {
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'), // Query timeout in ms (default: 120s for long-running queries like CIA analysis)
    },

    // Retry configuration for connection failures
    retry: {
      max: 3, // Maximum number of connection retry attempts
      timeout: 5000, // Timeout between retries (ms)
    }
  }
);

export default sequelize;
