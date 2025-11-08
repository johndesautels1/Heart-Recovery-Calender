import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import googleFitService from '../services/googleFitService';

const router = express.Router();

// Initiate Google Fit OAuth flow
router.get('/auth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authUrl = googleFitService.getAuthorizationUrl(userId);
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error initiating Google Fit auth:', error);
    res.status(500).json({ error: 'Failed to initiate authorization' });
  }
});

// OAuth callback handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Google Fit OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=googlefit_auth_failed`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=missing_parameters`);
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for token
    const tokenData = await googleFitService.exchangeCodeForToken(code as string);

    // Create or update device connection
    await googleFitService.createOrUpdateConnection(userId, tokenData);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?success=googlefit_connected`);
  } catch (error) {
    console.error('Error in Google Fit callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/devices?error=callback_failed`);
  }
});

export default router;
