import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import User from '../models/User';

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ where: { email: profile.emails?.[0]?.value } });

          if (!user) {
            // Create new user
            user = await User.create({
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName || '',
              profilePhoto: profile.photos?.[0]?.value,
              role: 'patient',
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Apple Sign In Strategy
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY || '',
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/apple/callback`,
      },
      async (accessToken, refreshToken, idToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ where: { email: profile.email } });

          if (!user) {
            // Create new user
            user = await User.create({
              email: profile.email || '',
              name: `${profile.name?.firstName || ''} ${profile.name?.lastName || ''}`.trim(),
              role: 'patient',
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;
