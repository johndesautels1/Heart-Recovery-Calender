import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again in 15 minutes.'
    });
  }
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login/register attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login/register attempts. Please try again in 15 minutes.'
    });
  }
});

// Rate limiter for export endpoints - 10 requests per hour per IP
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 exports per hour
  message: {
    error: 'Too many export requests',
    message: 'You have exceeded the export rate limit. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many export requests',
      message: 'You have exceeded the export rate limit. Please try again in 1 hour.'
    });
  }
});

// Rate limiter for notification test endpoints - 3 requests per hour per user
export const notificationTestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 test notifications per hour
  message: {
    error: 'Too many test notification requests',
    message: 'You can only send 3 test notifications per hour.',
    retryAfter: '1 hour'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many test notification requests',
      message: 'You can only send 3 test notifications per hour.'
    });
  }
});

// Rate limiter for external sync endpoints - 20 requests per hour per IP
export const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 sync requests per hour
  message: {
    error: 'Too many sync requests',
    message: 'You have exceeded the calendar sync rate limit. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many sync requests',
      message: 'You have exceeded the calendar sync rate limit. Please try again in 1 hour.'
    });
  }
});

// Rate limiter for creating/updating resources - 50 requests per 15 minutes per IP
export const createUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 create/update requests per windowMs
  message: {
    error: 'Too many create/update requests',
    message: 'You are creating or updating resources too quickly. Please slow down.',
    retryAfter: '15 minutes'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many create/update requests',
      message: 'You are creating or updating resources too quickly. Please slow down and try again in 15 minutes.'
    });
  }
});
