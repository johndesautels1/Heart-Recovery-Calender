import { Router } from 'express';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth 2.0 authentication flow
 * @access  Public
 * @returns Redirects to Google consent screen
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback - exchanges code for user profile and generates JWT
 * @access  Public (callback from Google)
 * @returns Redirects to frontend with JWT token in query string
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.redirect(`/auth-success?token=${token}`);
  }
);

/**
 * @route   GET /auth/apple
 * @desc    Initiate Apple Sign In authentication flow
 * @access  Public
 * @returns Redirects to Apple consent screen
 */
router.get('/apple', passport.authenticate('apple'));

/**
 * @route   POST /auth/apple/callback
 * @desc    Apple Sign In callback - exchanges code for user profile and generates JWT
 * @access  Public (callback from Apple)
 * @returns JSON with JWT token
 */
router.post('/apple/callback',
  passport.authenticate('apple', { session: false }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token });
  }
);

export default router;