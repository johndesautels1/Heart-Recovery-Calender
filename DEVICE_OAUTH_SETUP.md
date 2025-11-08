# Device OAuth Setup Guide

This guide will walk you through setting up OAuth credentials for Samsung Galaxy Watch 8 and Polar H10 integration.

---

## Samsung Galaxy Watch 8 / Samsung Health

### Prerequisites
- Samsung Developer account
- Your app must have HTTPS for OAuth callback (use ngrok for local development)

### Step 1: Create Samsung Developer Account
1. Go to https://developer.samsung.com
2. Click "Sign In" → "Create Account"
3. Complete registration with email verification

### Step 2: Register Your Application
1. Log in to Samsung Developer Portal
2. Navigate to **Samsung Health** → **My Applications**
3. Click "**Create New Application**"
4. Fill in application details:
   - **App Name:** Heart Recovery Calendar
   - **Description:** Post-cardiac surgery recovery tracking application
   - **Category:** Health & Fitness
   - **Platform:** Web Application

### Step 3: Configure Samsung Health OAuth
1. In your application settings, go to "**OAuth Settings**"
2. Add **Redirect URI**:
   - Development: `http://localhost:3000/devices/samsung/callback`
   - Production: `https://yourdomain.com/devices/samsung/callback`
3. Select **Permissions** (Data Access Scopes):
   - ✅ Heart Rate
   - ✅ Blood Pressure
   - ✅ SpO2 (Oxygen Saturation)
   - ✅ Respiratory Rate
   - ✅ Exercise/Activity
   - ✅ ECG (if available)
   - ✅ Sleep
   - ✅ Steps

### Step 4: Get Your Credentials
After app approval:
1. Navigate to "**App Credentials**"
2. Copy the following:
   - **Client ID** (example: `abc123def456`)
   - **Client Secret** (example: `xyz789secret`)

### Step 5: Add to Backend .env File
```env
# Samsung Health OAuth
SAMSUNG_CLIENT_ID=your_client_id_here
SAMSUNG_CLIENT_SECRET=your_client_secret_here
SAMSUNG_REDIRECT_URI=http://localhost:3000/devices/samsung/callback
```

### Step 6: Testing the Connection
1. Go to **My Devices** page in your app
2. Click "**Connect Samsung Galaxy Watch**"
3. You'll be redirected to Samsung OAuth login
4. Grant permissions
5. You'll be redirected back to your app with connected device

---

## Polar H10 Heart Rate Monitor

### Prerequisites
- Polar Flow account
- Polar AccessLink API access

### Step 1: Create Polar Flow Account
1. Go to https://flow.polar.com
2. Sign up for a free account
3. Link your Polar H10 device via Polar Flow app

### Step 2: Register for Polar AccessLink API
1. Go to https://admin.polaraccesslink.com
2. Click "**Register New Client**"
3. Fill in application details:
   - **Client Name:** Heart Recovery Calendar
   - **Description:** Post-cardiac surgery heart rate monitoring
   - **Organization:** Your organization name
   - **Contact Email:** Your email

### Step 3: Configure OAuth Settings
1. Add **Redirect URI**:
   - Development: `http://localhost:3000/devices/polar/callback`
   - Production: `https://yourdomain.com/devices/polar/callback`
2. Select **Scopes** (Data Access):
   - ✅ `accesslink.read_all` - Read exercise data
   - ✅ `exercise.read` - Access exercise sessions
   - ✅ `heart_rate.read` - Read heart rate data
   - ✅ `activity.read` - Daily activity summary

### Step 4: Get Your Credentials
After registration:
1. Go to "**Client Credentials**"
2. Copy the following:
   - **Client ID** (example: `a1b2c3d4-e5f6-7890-ab12-cd34ef567890`)
   - **Client Secret** (example: `super-secret-key-here`)

### Step 5: Add to Backend .env File
```env
# Polar AccessLink OAuth
POLAR_CLIENT_ID=your_client_id_here
POLAR_CLIENT_SECRET=your_client_secret_here
POLAR_REDIRECT_URI=http://localhost:3000/devices/polar/callback
```

### Step 6: Testing the Connection
1. Go to **My Devices** page in your app
2. Click "**Connect Polar H10**"
3. Log in with your Polar Flow credentials
4. Grant permissions
5. Device will be connected and start syncing

---

## Strava (Already Working!)

Your Strava integration is already configured and working! If you need to verify or update credentials:

### Existing Setup
- Credentials are in backend `.env` file:
  ```env
  STRAVA_CLIENT_ID=your_existing_id
  STRAVA_CLIENT_SECRET=your_existing_secret
  STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
  ```
- Connection: Go to **My Devices** → Click "Connect Strava"
- Currently syncs every 5 minutes automatically

---

## Verifying Backend Configuration

After adding credentials to `.env`, verify your backend configuration:

1. Check `backend/.env` file has all credentials:
```env
# Samsung Health
SAMSUNG_CLIENT_ID=...
SAMSUNG_CLIENT_SECRET=...
SAMSUNG_REDIRECT_URI=http://localhost:3000/devices/samsung/callback

# Polar AccessLink
POLAR_CLIENT_ID=...
POLAR_CLIENT_SECRET=...
POLAR_REDIRECT_URI=http://localhost:3000/devices/polar/callback

# Strava (existing)
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
```

2. Restart backend server:
```bash
cd backend
npm run dev
```

3. Check console for:
```
Server running on port 4000
🔴 WebSocket server ready for real-time ECG/vitals streaming
```

---

## Common Issues

### Samsung Health Connection Fails
- **Error:** "Invalid redirect_uri"
  - **Solution:** Ensure redirect URI in Samsung Developer Portal EXACTLY matches your `.env` file
- **Error:** "Unauthorized client"
  - **Solution:** Wait 10-15 minutes after app creation for credentials to activate
- **Error:** "App not approved"
  - **Solution:** Samsung may require manual app review. Check developer portal for approval status.

### Polar AccessLink Connection Fails
- **Error:** "Invalid client"
  - **Solution:** Double-check Client ID and Secret - no extra spaces
- **Error:** "Scope not allowed"
  - **Solution:** Verify you selected all required scopes in Polar admin panel
- **Error:** "User not found"
  - **Solution:** Ensure you've linked Polar H10 to your Polar Flow account first

### WebSocket Not Connecting
- **Error:** "WebSocket connection failed"
  - **Solution:** Verify backend is running on port 4000
  - **Solution:** Check browser console for CORS errors
- **Error:** "No real-time data"
  - **Solution:** Ensure device is connected AND actively transmitting data
  - **Solution:** Check **My Devices** page for connection status

---

## Next Steps

1. ✅ Get Samsung OAuth credentials → Add to `.env`
2. ✅ Get Polar OAuth credentials → Add to `.env`
3. ✅ Restart backend server
4. ✅ Test connections via **My Devices** page
5. ✅ Go to **Vitals** page → Click ECG/EKG oval tab to see live data!

---

## Need Help?

- **Samsung Health API Docs:** https://developer.samsung.com/health
- **Polar AccessLink Docs:** https://www.polar.com/accesslink-api
- **Backend Logs:** Check `backend` terminal for detailed error messages
- **Frontend Logs:** Open browser DevTools → Console tab

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` files to Git
- Keep OAuth secrets private
- Use environment variables for production deployment
- Consider encrypting tokens in database (currently stored as plaintext - see SECURITY_TODO.md)
