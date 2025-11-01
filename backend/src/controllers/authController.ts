import { Request, Response } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Validate JWT_SECRET is set - server won't start without it
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!\n' +
    'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" \n' +
    'Then add it to your .env file: JWT_SECRET=your-generated-secret'
  );
}
const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/auth/me - Get current user info
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // toJSON() will automatically exclude password
    res.json(user.toJSON());
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/register - Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phoneNumber, timezone, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Validate role if provided
    if (role && !['patient', 'therapist', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "patient", "therapist", or "admin"' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phoneNumber,
      timezone: timezone || 'America/New_York',
      role: role || 'patient' // Default to patient if not provided
    });

    // If this is a patient, check if there's a Patient record with this email and link it
    if (user.role === 'patient') {
      const patientRecord = await Patient.findOne({ where: { email } });
      if (patientRecord && !patientRecord.userId) {
        await patientRecord.update({ userId: user.id });
        console.log(`[REGISTER] Linked Patient record ${patientRecord.id} to User ${user.id}`);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/login - Login with email/password
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
