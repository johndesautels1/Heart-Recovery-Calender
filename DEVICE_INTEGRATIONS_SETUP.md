# 🏃‍♂️ Fitness Tracker Integrations Setup Guide

This guide explains how to set up OAuth integrations for fitness trackers and health platforms.

## ✅ Implemented Integrations

The following fitness tracker integrations are **fully implemented with real OAuth flows**:

### 1. **Fitbit** 🏃
- **Data Synced:** Heart rate, HRV, sleep, blood oxygen, steps, calories, exercise
- **OAuth Type:** OAuth 2.0
- **Setup Instructions:**
  1. Create a Fitbit developer account at https://dev.fitbit.com
  2. Register a new application at https://dev.fitbit.com/apps/new
  3. Set these values:
     - **OAuth 2.0 Application Type:** Server
     - **Callback URL:** `http://localhost:4000/api/fitbit/callback`
     - **Default Access Type:** Read Only
     - **OAuth 2.0 Scopes:** Select: `activity`, `heartrate`, `profile`, `sleep`, `weight`
  4. Copy your **Client ID** and **Client Secret**
  5. Add to `.env`:
     ```
     FITBIT_CLIENT_ID=your_client_id_here
     FITBIT_CLIENT_SECRET=your_client_secret_here
     FITBIT_REDIRECT_URI=http://localhost:4000/api/fitbit/callback
     ```

### 2. **Garmin Connect** 🏔️
- **Data Synced:** Heart rate, HRV, stress, VO2 max, training load, sleep, workouts
- **OAuth Type:** OAuth 1.0a
- **Setup Instructions:**
  1. Apply for Garmin Developer access at https://developer.garmin.com/
  2. Create an application in the Garmin Developer Portal
  3. Request access to the **Garmin Health API**
  4. Once approved, get your **Consumer Key** and **Consumer Secret**
  5. Add to `.env`:
     ```
     GARMIN_CONSUMER_KEY=your_consumer_key_here
     GARMIN_CONSUMER_SECRET=your_consumer_secret_here
     GARMIN_REDIRECT_URI=http://localhost:4000/api/garmin/callback
     ```

  **Note:** Garmin uses OAuth 1.0a which requires request signing. The implementation includes basic support, but may need additional crypto signing for production use.

### 3. **Google Fit** 📱
- **Data Synced:** Heart rate, steps, calories, workouts, sleep (from Android/Wear OS)
- **OAuth Type:** OAuth 2.0
- **Setup Instructions:**
  1. Go to https://console.cloud.google.com/
  2. Create a new project or select an existing one
  3. Enable the **Fitness API**:
     - Go to **APIs & Services** → **Library**
     - Search for "Fitness API" and click **Enable**
  4. Create OAuth 2.0 credentials:
     - Go to **APIs & Services** → **Credentials**
     - Click **Create Credentials** → **OAuth client ID**
     - Application type: **Web application**
     - Authorized redirect URIs: `http://localhost:4000/api/googlefit/callback`
  5. Copy your **Client ID** and **Client Secret**
  6. Add to `.env`:
     ```
     GOOGLE_CLIENT_ID=your_google_client_id_here
     GOOGLE_CLIENT_SECRET=your_google_client_secret_here
     GOOGLE_REDIRECT_URI=http://localhost:4000/api/googlefit/callback
     ```

### 4. **Strava** 🚴‍♀️ (Already Implemented)
- **Data Synced:** Exercise sessions, heart rate, training metrics
- **Setup:** Already configured
- See `.env.example` for credentials setup

### 5. **Polar** ❤️ (Already Implemented)
- **Data Synced:** Heart rate, exercise sessions
- **Setup:** Already configured
- See `.env.example` for credentials setup

---

## 🚧 Coming Soon (UI Added, Backend Needed)

These platforms have UI cards in the app but require backend implementation:

### Apple Health / HealthKit
- **Note:** Requires native iOS integration, not OAuth-based
- **Alternative:** Users can export Health app data manually

### WHOOP 💪
- **Developer Portal:** https://developer.whoop.com/
- **Requires:** WHOOP API access approval

### Oura Ring 💍
- **Developer Portal:** https://cloud.ouraring.com/oauth/applications
- **Requires:** Oura Cloud API developer account

### Withings ⚕️
- **Developer Portal:** https://developer.withings.com/
- **Requires:** Withings developer account

### Amazfit/Zepp ⌚
- **Note:** Zepp API access requires partnership approval

### Coros 🏃
- **Note:** Coros API access requires developer partnership

---

## 🔧 Backend Setup

### 1. Install Dependencies

The Google Fit integration requires the Google APIs client library:

```bash
cd backend
npm install googleapis
```

### 2. Update Database

Add the new device types to your database:

```sql
-- Add new device types to device_connections table
ALTER TYPE device_type_enum ADD VALUE 'fitbit';
ALTER TYPE device_type_enum ADD VALUE 'garmin';
ALTER TYPE device_type_enum ADD VALUE 'googlefit';
```

Or run migrations:

```bash
cd backend
npm run migrate
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and add your API credentials:

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials for each platform you want to enable.

### 4. Restart Backend Server

```bash
npm run dev
```

---

## 🎯 Testing the Integrations

### 1. Navigate to My Devices Page
- Log into the app
- Go to **My Devices** in the navigation
- Click the **Fitness Trackers** tab

### 2. Connect a Device
- Click the **Connect** button for your fitness tracker
- You'll be redirected to the platform's OAuth authorization page
- Grant permissions
- You'll be redirected back to the app with the device connected

### 3. Verify Connection
- The connected device should appear in the "Connected Devices" section
- Click **Sync Now** to manually trigger a data sync
- Check the **Vitals** page to see imported heart rate data

---

## 📊 Data Synced by Each Platform

| Platform | Heart Rate | HRV | Sleep | VO2 Max | Steps | Calories | Workouts |
|----------|-----------|-----|-------|---------|-------|----------|----------|
| Fitbit | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Garmin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Google Fit | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Strava | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Polar | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🔐 Security Notes

1. **Never commit `.env` file** - It contains sensitive API credentials
2. **Use HTTPS in production** - Update redirect URIs to use `https://`
3. **Rotate credentials regularly** - Regenerate API keys periodically
4. **Limit OAuth scopes** - Only request the permissions you need
5. **Store tokens securely** - Access tokens are encrypted in the database

---

## 🐛 Troubleshooting

### "Failed to connect to [Device]"
- **Check:** Are API credentials configured in `.env`?
- **Check:** Is the redirect URI correct in both `.env` and the developer portal?
- **Check:** Is the backend server running on port 4000?

### "OAuth callback failed"
- **Check:** Backend server logs for detailed error messages
- **Check:** Developer console for the platform (Fitbit/Garmin/Google)
- **Check:** Firewall isn't blocking the callback request

### "No data syncing"
- **Check:** Device connection is marked as "Active" (green badge)
- **Check:** Sync settings are enabled (Auto Sync toggle)
- **Check:** The device has recent data to sync
- **Check:** Backend logs for sync errors

---

## 📝 Files Modified/Created

### Backend:
- `backend/src/services/fitbitService.ts` - Fitbit OAuth & data sync
- `backend/src/services/garminService.ts` - Garmin OAuth & data sync
- `backend/src/services/googleFitService.ts` - Google Fit OAuth & data sync
- `backend/src/routes/fitbit.ts` - Fitbit API routes
- `backend/src/routes/garmin.ts` - Garmin API routes
- `backend/src/routes/googlefit.ts` - Google Fit API routes
- `backend/src/routes/api.ts` - Registered new routes
- `backend/src/models/DeviceConnection.ts` - Added new device types
- `backend/.env.example` - Documented API credentials

### Frontend:
- `frontend/src/pages/DevicesPage.tsx` - Added 9 fitness tracker cards
- `frontend/src/services/api.ts` - Added OAuth initiation methods
- `frontend/src/pages/ProfilePage.tsx` - Added Medical History tabs (My Labs, My Reports)

---

## 🚀 Next Steps

1. **Get API credentials** for the platforms you want to use
2. **Add credentials to `.env`**
3. **Restart backend server**
4. **Test connections** in the My Devices page
5. **Monitor sync logs** to ensure data is flowing correctly

---

## 💡 Need Help?

- **Fitbit API Docs:** https://dev.fitbit.com/build/reference/web-api/
- **Garmin API Docs:** https://developer.garmin.com/health-api/overview/
- **Google Fit API Docs:** https://developers.google.com/fit/rest/v1/get-started
- **Strava API Docs:** https://developers.strava.com/
- **Polar API Docs:** https://www.polar.com/accesslink-api/

For questions or issues, check the backend server logs and the browser console for detailed error messages.
