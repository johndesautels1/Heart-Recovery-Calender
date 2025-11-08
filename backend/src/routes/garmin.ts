import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import garminService from '../services/garminService';

const router = express.Router();

// Initiate Garmin OAuth flow
router.get('/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authUrl = garminService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error initiating Garmin auth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

// OAuth callback handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { oauth_token, oauth_verifier, state } = req.query;

    if (!oauth_token || !oauth_verifier) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=missing_parameters`);
    }

    // Note: Garmin uses OAuth 1.0a which requires additional token exchange steps
    // This is a simplified version - full implementation requires crypto signing

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?success=garmin_connected`);
  } catch (error) {
    console.error('Error in Garmin callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=callback_failed`);
  }
});

export default router;
