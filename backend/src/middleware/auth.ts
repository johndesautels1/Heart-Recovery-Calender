import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import Patient from '../models/Patient';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name?: string;
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
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

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
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

// Middleware to require patient profile for patient-role users
export const requirePatientProfile = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only check for patient profile if user has 'patient' role
  if (userRole === 'patient') {
    try {
      const patient = await Patient.findOne({ where: { userId } });

      if (!patient) {
        return res.status(403).json({
          error: 'Profile incomplete',
          message: 'Please complete your patient profile to access this feature',
          requiresProfile: true
        });
      }
    } catch (error) {
      console.error('Error checking patient profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Therapists and patients with profiles can continue
  next();
};
