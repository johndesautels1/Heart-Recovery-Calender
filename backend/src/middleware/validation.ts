import { Request, Response, NextFunction } from 'express';

export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Missing required fields: ' + missingFields.join(', ')
      });
    }

    next();
  };
};

export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid email format'
    });
  }

  next();
};

export const validatePassword = (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Password is required'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Password must be at least 8 characters long'
    });
  }

  next();
};
