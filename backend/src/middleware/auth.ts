import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role?: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication service is not properly configured'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: number;
      email: string;
      role?: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid or expired token',
      message: 'Your session has expired. Please log in again.'
    });
  }
};

// Optional middleware for routes that work with or without auth
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        id: number;
        email: string;
        role?: string;
      };
      req.user = decoded;
    } catch (err) {
      // Token invalid but we continue anyway
    }
  }

  next();
};
