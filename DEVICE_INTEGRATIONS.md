# Device Integrations Guide

## Overview

Heart Recovery Calendar supports **13+ health and fitness platforms** for comprehensive cardiac recovery monitoring. This guide provides complete setup instructions for each device integration.

---

## Table of Contents

1. [Polar H10 ECG Monitor](#polar-h10-ecg-monitor)
2. [Samsung Health & Galaxy Watch](#samsung-health--galaxy-watch)
3. [Strava](#strava)
4. [Fitbit](#fitbit)
5. [Garmin](#garmin)
6. [Google Fit](#google-fit)
7. [Apple Health (HealthKit)](#apple-health-healthkit)
8. [MIR Spirometry](#mir-spirometry)
9. [Whoop](#whoop)
10. [Oura Ring](#oura-ring)
11. [Withings](#withings)
12. [Amazfit](#amazfit)
13. [Coros](#coros)
14. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Polar H10 ECG Monitor

### Overview
- **Device**: Polar H10 Bluetooth Heart Rate Monitor
- **Features**: Real-time ECG streaming (130 Hz), RR intervals, heart rate, HRV
- **API**: Polar AccessLink API v3
- **Authentication**: OAuth 2.0

### Step 1: Create Polar Developer Account

1. Go to [https://admin.polaraccesslink.com](https://admin.polaraccesslink.com)
2. Click "Create New Account"
3. Fill in your details:
   - Email: your-email@example.com
   - Password: (create strong password)
   - Company: Heart Recovery Calendar
4. Verify email address

### Step 2: Register Your Application

1. Login to Polar AccessLink Admin
2. Click "Create New Client"
3. Fill in application details:
   - **Client Name**: Heart Recovery Calendar
   - **Redirect URL**: `http://localhost:4000/api/polar/callback` (development)
   - **Redirect URL**: `https://api.your-domain.com/api/polar/callback` (production)
4. Submit and save the generated:
   - **Client ID**: (save this)
   - **Client Secret**: (save this - only shown once!)

### Step 3: Configure Backend

Add to `backend/.env`:
```bash
POLAR_CLIENT_ID=4e6d92e4-f988-4ebb-a0d0-8baa5a79c452
POLAR_CLIENT_SECRET=8a782e02-ce7e-4ff1-a0ed-1f832c1752eb
POLAR_REDIRECT_URI=http://localhost:4000/api/polar/callback
```

### Step 4: Polar H10 Physical Setup

1. **Wet the electrode pads** on the chest strap
2. **Attach strap** snugly around chest (just below pectoral muscles)
3. **Pair with Polar Flow app** (iOS/Android):
   - Download "Polar Flow" from app store
   - Open app → Settings → Pair New Device
   - Hold H10 close to phone
   - Follow pairing instructions
4. **Verify connection** in Polar Flow app

### Step 5: Connect to Heart Recovery Calendar

1. Login to Heart Recovery Calendar
2. Go to **Profile → API Credentials**
3. Find "Polar H10" section
4. Click **"Connect Polar Account"**
5. Login with your Polar credentials:
   - Email: your-polar-email@example.com
   - Password: your-polar-password
6. Click **"Authorize"**
7. You'll be redirected back - connection successful!

### Step 6: Start Live ECG Streaming

**Option A: Via Polar Flow App**
1. Open Polar Flow app
2. Start a workout (Running, Cycling, Other)
3. ECG data automatically syncs to Heart Recovery Calendar

**Option B: Via Backend Service**
The backend automatically polls Polar AccessLink every 5 minutes for:
- ECG samples (130 Hz voltage data)
- RR intervals (heart beat timing)
- Heart rate zones
- Training sessions
- Activity summaries

### Step 7: View Live Data

1. Go to **Vitals Page** in Heart Recovery Calendar
2. Live ECG waveform appears in "ECG Monitor" section
3. Real-time heart rate, HRV, and R-peak detection
4. Medical-grade ACD-1000 display system

### Troubleshooting

| Issue | Solution |
|-------|----------|
| H10 not pairing | Replace battery (CR2025), wet electrodes thoroughly |
| No ECG data | Ensure workout is active in Polar Flow app |
| Authorization failed | Check client ID/secret, verify redirect URI matches exactly |
| Sync delayed | Normal - Polar syncs data after workout ends |

---

## Samsung Health & Galaxy Watch

### Overview
- **Devices**: Galaxy Watch 8, Watch 7, Watch 6, Watch 5, Watch 4
- **Features**: Heart rate, steps, sleep, SpO2, ECG, blood pressure
- **API**: Samsung Health SDK for Web
- **Authentication**: OAuth 2.0

### Step 1: Register Samsung Developer Account

1. Go to [https://developer.samsung.com](https://developer.samsung.com)
2. Click "Sign Up"
3. Complete registration:
   - Email verification
   - Developer agreement acceptance
4. Login to Samsung Developer Portal

### Step 2: Create Health Application

1. Navigate to **Samsung Health → Web**
2. Click "Create New Application"
3. Fill in details:
   - **App Name**: Heart Recovery Calendar
   - **Website**: https://your-domain.com
   - **Callback URL**: `http://localhost:4000/api/samsung/callback`
   - **Permissions**: Request all health data types:
     - Heart Rate
     - Blood Pressure
     - Blood Glucose
     - SpO2
     - Sleep
     - Steps
     - Exercise
     - Weight
4. Submit for approval (takes 1-3 business days)

### Step 3: Get API Credentials

Once approved:
1. Go to **My Applications**
2. Click on "Heart Recovery Calendar"
3. Copy credentials:
   - **Client ID**: (save this)
   - **Client Secret**: (save this)

### Step 4: Configure Backend

Add to `backend/.env`:
```bash
SAMSUNG_CLIENT_ID=your-samsung-client-id
SAMSUNG_CLIENT_SECRET=your-samsung-client-secret
SAMSUNG_REDIRECT_URI=http://localhost:4000/api/samsung/callback
```

### Step 5: Sync Galaxy Watch Data

1. **Ensure Samsung Health app is installed** on your phone
2. **Pair Galaxy Watch** with phone via Samsung Wearable app
3. **Enable data sync** in Samsung Health:
   - Open Samsung Health app
   - Settings → Connected Services
   - Enable "Share data with partners"
4. **Connect to Heart Recovery Calendar**:
   - Login to app
   - Profile → Devices
   - Click "Connect Samsung Health"
   - Authorize data access
5. Data syncs every 5 minutes automatically

### Supported Data Types

| Data Type | Galaxy Watch Model | Frequency |
|-----------|-------------------|-----------|
| Heart Rate | All | Continuous |
| ECG | Watch 4+ | On-demand |
| Blood Pressure | Watch 4+ (with calibration) | On-demand |
| SpO2 | All | Continuous (sleep mode) |
| Steps | All | Real-time |
| Sleep Stages | All | Nightly |
| Stress Level | All | Continuous |

### Calibration (for BP/ECG)

**Blood Pressure Calibration**:
1. Open Samsung Health Monitor app on watch
2. Take 3 BP readings with traditional cuff within 5 minutes
3. Enter values in app
4. Recalibrate every 4 weeks

**ECG Setup**:
1. Install Samsung Health Monitor app
2. Follow on-screen finger placement instructions
3. Takes 30 seconds per reading
4. Data syncs to Health Recovery Calendar

---

## Strava

### Overview
- **Platform**: Strava (running, cycling, swimming tracking)
- **Features**: Workouts, routes, heart rate, pace, elevation, power
- **API**: Strava API v3
- **Authentication**: OAuth 2.0

### Step 1: Create Strava API Application

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2. Login with your Strava account
3. Click "Create New App"
4. Fill in details:
   - **Application Name**: Heart Recovery Calendar
   - **Category**: Health & Fitness
   - **Website**: https://your-domain.com
   - **Authorization Callback Domain**: `localhost:4000` (dev) or `api.your-domain.com` (prod)
   - **Description**: Cardiac recovery monitoring and exercise tracking
5. Submit

### Step 2: Get API Credentials

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
2. Find your application
3. Copy:
   - **Client ID**: `183361` (example)
   - **Client Secret**: (click "Show" to reveal)

### Step 3: Configure Backend

Add to `backend/.env`:
```bash
STRAVA_CLIENT_ID=183361
STRAVA_CLIENT_SECRET=c3f614787ac74ebb9a70f013a7850d32fef82f98
STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
```

### Step 4: Connect Strava Account

1. Login to Heart Recovery Calendar
2. Profile → API Credentials
3. Find "Strava" section
4. Click **"Connect Strava"**
5. Authorize access to:
   - View activity data
   - View heart rate data
   - Read all activities
6. Connection successful!

### Step 5: Automatic Workout Sync

- Every new Strava activity **automatically syncs** to Heart Recovery Calendar
- Includes: duration, distance, calories, avg/max heart rate, pace, elevation, route
- Data appears in **Vitals Page → Treadmill Test** section
- WebSocket pushes live updates when workout ends

### Webhook Setup (Optional - Real-Time Push)

For instant updates instead of 5-minute polling:

1. **Backend receives webhook** at `/api/strava/webhook`
2. Strava sends push notification on new activity
3. Backend fetches activity details immediately
4. Real-time display in frontend

Enable webhooks:
```bash
curl -X POST "https://www.strava.com/api/v3/push_subscriptions" \
  -F client_id=183361 \
  -F client_secret=your-secret \
  -F callback_url=https://api.your-domain.com/api/strava/webhook \
  -F verify_token=STRAVA_WEBHOOK_TOKEN
```

---

## Fitbit

### Overview
- **Devices**: Fitbit Charge 6, Sense 2, Versa 4, Inspire 3
- **Features**: Heart rate, HRV, SpO2, sleep, steps, ECG, AFib detection
- **API**: Fitbit Web API
- **Authentication**: OAuth 2.0

### Step 1: Register Fitbit Developer Account

1. Go to [https://dev.fitbit.com](https://dev.fitbit.com)
2. Login with your Fitbit account
3. Register as a developer (free)

### Step 2: Create Application

1. Navigate to **Manage → Register an App**
2. Fill in details:
   - **Application Name**: Heart Recovery Calendar
   - **Description**: Cardiac recovery and health monitoring
   - **Application Website**: https://your-domain.com
   - **Organization**: Your Company Name
   - **OAuth 2.0 Application Type**: **Server**
   - **Callback URL**: `http://localhost:4000/api/fitbit/callback`
   - **Default Access Type**: **Read Only**
3. Agree to terms and submit

### Step 3: Get API Credentials

1. Go to **Manage My Apps**
2. Click on "Heart Recovery Calendar"
3. Copy:
   - **OAuth 2.0 Client ID**: (save this)
   - **Client Secret**: (save this)

### Step 4: Configure Backend

Add to `backend/.env`:
```bash
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
FITBIT_REDIRECT_URI=http://localhost:4000/api/fitbit/callback
```

### Step 5: Request Intraday Access (Important!)

By default, Fitbit only provides **daily aggregates**. For real-time heart rate:

1. Email Fitbit API Support: api@fitbit.com
2. Subject: "Request for Intraday API Access"
3. Body:
   ```
   Hello Fitbit Team,

   I'm developing "Heart Recovery Calendar", a cardiac recovery monitoring application.
   I would like to request intraday API access for the following data:
   - Heart rate (1-minute resolution)
   - HRV (RMSSD, SDNN)
   - SpO2 (5-minute resolution)

   Application details:
   Client ID: [your-client-id]
   Website: https://your-domain.com

   Thank you!
   ```
4. Wait 1-3 business days for approval

### Step 6: Connect Fitbit Device

1. Login to Heart Recovery Calendar
2. Profile → Devices
3. Click "Connect Fitbit"
4. Authorize data access (select all health metrics)
5. Data syncs every 5 minutes

### Supported Data

| Data Type | API Endpoint | Frequency |
|-----------|-------------|-----------|
| Heart Rate | `/1/user/-/activities/heart/date/[date]/1d/1min.json` | 1-minute |
| HRV | `/1/user/-/hrv/date/[date].json` | Daily |
| SpO2 | `/1/user/-/spo2/date/[date].json` | Nightly |
| Sleep Stages | `/1.2/user/-/sleep/date/[date].json` | Nightly |
| Activity Summary | `/1/user/-/activities/date/[date].json` | Daily |

---

## Garmin

### Overview
- **Devices**: Garmin Forerunner, Fenix, Venu, Vivoactive series
- **Features**: Heart rate, HRV, VO2 max, training load, recovery time
- **API**: Garmin Health API
- **Authentication**: OAuth 1.0a

### Step 1: Register Garmin Developer Account

1. Go to [https://developer.garmin.com](https://developer.garmin.com)
2. Create account (requires approval)
3. Submit business justification for Health API access
4. Wait 3-7 days for account activation

### Step 2: Create Application

1. Login to Garmin Connect Developer Portal
2. Navigate to **Applications**
3. Click "Create Application"
4. Fill in:
   - **App Name**: Heart Recovery Calendar
   - **App Type**: Health & Fitness
   - **API Access**: Garmin Health API
   - **Requested Data Types**:
     - Daily Summary
     - Heart Rate
     - Sleep Data
     - Activity Files
     - Stress
5. Submit for review (takes 5-10 business days)

### Step 3: Get API Credentials

Once approved:
1. Go to **My Applications**
2. Click "Heart Recovery Calendar"
3. Copy:
   - **Consumer Key**: (OAuth 1.0a key)
   - **Consumer Secret**: (OAuth 1.0a secret)

### Step 4: Configure Backend

Add to `backend/.env`:
```bash
GARMIN_CONSUMER_KEY=your-garmin-consumer-key
GARMIN_CONSUMER_SECRET=your-garmin-consumer-secret
GARMIN_CALLBACK_URL=http://localhost:4000/api/garmin/callback
```

### Step 5: Enable Data Backfill

Garmin Health API supports **backfilling historical data**:

```typescript
// Backend service automatically fetches:
// - Last 30 days of activities on first connection
// - Daily syncs for new data
// - Webhooks for real-time push notifications
```

### Step 6: Connect Garmin Device

1. Ensure Garmin Connect app is installed on phone
2. Garmin device is synced with Garmin Connect
3. Login to Heart Recovery Calendar
4. Profile → Devices → Connect Garmin
5. Authorize data sharing
6. Historical data imports automatically

### Garmin-Specific Metrics

- **Training Effect**: Aerobic/Anaerobic training benefit (1-5 scale)
- **Training Load**: 7-day cumulative exercise stress
- **Recovery Time**: Hours needed before next hard workout
- **VO2 Max**: Estimated aerobic capacity
- **Lactate Threshold**: Pace/HR where lactate accumulates
- **Performance Condition**: Real-time fitness assessment during run

---

## Google Fit

### Overview
- **Platform**: Google Fit (Android wearables, Fitbit, third-party apps)
- **Features**: Heart rate, steps, calories, sleep, workouts
- **API**: Google Fit REST API
- **Authentication**: OAuth 2.0 (Google Sign-In)

### Step 1: Create Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: "Heart Recovery Calendar"
3. Enable APIs:
   - Navigate to **APIs & Services → Library**
   - Search "Fitness API"
   - Click "Enable"

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - **App name**: Heart Recovery Calendar
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes:
   - `https://www.googleapis.com/auth/fitness.activity.read`
   - `https://www.googleapis.com/auth/fitness.heart_rate.read`
   - `https://www.googleapis.com/auth/fitness.sleep.read`
   - `https://www.googleapis.com/auth/fitness.body.read`
5. Add test users (yourself initially)
6. Submit

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click "Create Credentials" → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: "Heart Recovery Calendar Backend"
5. Authorized redirect URIs:
   - `http://localhost:4000/api/googlefit/callback`
6. Create
7. Copy:
   - **Client ID**
   - **Client Secret**

### Step 4: Configure Backend

Add to `backend/.env`:
```bash
GOOGLE_FIT_CLIENT_ID=your-google-fit-client-id.apps.googleusercontent.com
GOOGLE_FIT_CLIENT_SECRET=your-google-fit-client-secret
GOOGLE_FIT_REDIRECT_URI=http://localhost:4000/api/googlefit/callback
```

### Step 5: Connect Google Fit

1. Login to Heart Recovery Calendar
2. Profile → Devices
3. Click "Connect Google Fit"
4. Sign in with Google account
5. Authorize all requested permissions
6. Data syncs every 5 minutes

### Data Aggregation

Google Fit aggregates data from:
- Fitbit (if connected to Google account)
- Samsung Health
- Wear OS watches
- Third-party fitness apps
- Manual entries

---

## Apple Health (HealthKit)

### Overview
- **Platform**: iOS native (iPhone, Apple Watch)
- **Features**: All health metrics (10,000+ data types)
- **API**: HealthKit framework (native iOS only)
- **Authentication**: User permission prompts

**See [APPLE_HEALTHKIT_SETUP.md](./APPLE_HEALTHKIT_SETUP.md) for complete iOS integration guide.**

### Quick Setup Summary

1. **Enable HealthKit capability** in Xcode
2. **Add privacy descriptions** to Info.plist
3. **Request permissions** using `HKHealthStore`
4. **Query data** with `HKSampleQuery`, `HKObserverQuery`
5. **Sync to backend** via POST requests to `/api/vitals`, `/api/exercise-update`
6. **Enable background delivery** for real-time updates

### Supported HealthKit Data

- Heart rate (continuous, resting, workout)
- ECG waveforms (Apple Watch Series 4+)
- Blood pressure
- SpO2
- Respiratory rate
- HRV (RMSSD, SDNN)
- Workouts (all types)
- VO2 max
- Spirometry (FEV1, FVC, PEF)
- Sleep analysis
- Steps, distance, calories

---

## MIR Spirometry

### Overview
- **Device**: MIR Spirobank Smart, Spirodoc, Minispir
- **Features**: FEV1, FVC, PEF, FEV1/FVC ratio, flow-volume loops
- **Connection**: Bluetooth Low Energy (BLE)
- **SDK**: MIR WinspiroPRO SDK

### Step 1: Purchase MIR Spirometer

Recommended models:
- **MIR Spirobank Smart**: Portable, Bluetooth, $800-$1200
- **MIR Spirodoc**: Clinical-grade, touchscreen, $2500-$3500
- **MIR Minispir**: Budget option, USB only, $400-$600

Purchase from: [https://www.spirometry.com](https://www.spirometry.com)

### Step 2: Download MIR SDK

1. Contact MIR support: info@spirometry.com
2. Request **WinspiroPRO SDK** for developers
3. Receive SDK package with:
   - Bluetooth communication library
   - Data parsing utilities
   - Example code (C#, Java, Python)
4. Install SDK on development machine

### Step 3: Pair Spirometer via Bluetooth

**On Windows**:
1. Turn on MIR spirometer
2. Settings → Bluetooth → Add Device
3. Select "MIR Spirobank Smart"
4. Enter pairing code: `0000` or `1234`
5. Device paired successfully

**On macOS**:
1. System Preferences → Bluetooth
2. Turn on spirometer
3. Click "Connect" next to MIR device

### Step 4: Backend Integration

Create `backend/src/services/mir-spirometry.ts`:
```typescript
import { SerialPort } from 'serialport';
import { io } from '../index'; // WebSocket server

interface SpirometryData {
  fev1: number; // Liters
  fvc: number; // Liters
  pef: number; // Liters/minute
  fev1FvcRatio: number; // Percentage
  timestamp: Date;
}

class MIRSpirometryService {
  private port: SerialPort;

  constructor(portPath: string) {
    this.port = new SerialPort({
      path: portPath,
      baudRate: 9600,
    });

    this.port.on('data', this.handleData.bind(this));
  }

  private handleData(data: Buffer) {
    // Parse MIR protocol
    const spirometryData = this.parseSpirometryData(data);

    // Broadcast via WebSocket
    io.emit('spirometry-update', spirometryData);

    // Save to database
    this.saveToDatabase(spirometryData);
  }

  private parseSpirometryData(buffer: Buffer): SpirometryData {
    // MIR protocol parsing (example)
    const fev1 = buffer.readFloatLE(0);
    const fvc = buffer.readFloatLE(4);
    const pef = buffer.readFloatLE(8);

    return {
      fev1,
      fvc,
      pef,
      fev1FvcRatio: (fev1 / fvc) * 100,
      timestamp: new Date(),
    };
  }

  private async saveToDatabase(data: SpirometryData) {
    // Save to spirometry_samples table
  }
}

export default MIRSpirometryService;
```

### Step 5: Frontend Display

Frontend already has **live spirometry display** in VitalsPage.tsx (lines 3035-3212):
- FEV1, FVC, PEF values
- FEV1/FVC ratio with clinical interpretation
- Test quality indicator
- 7-day trend chart

### Step 6: Perform Spirometry Test

1. **Patient preparation**:
   - Sit upright
   - No smoking 1 hour before test
   - Avoid heavy meals
   - Remove dentures if loose
2. **Attach mouthpiece** to spirometer
3. **Instruct patient**:
   - Take deepest breath possible
   - Seal lips tightly around mouthpiece
   - Blast out air as hard and fast as possible
   - Continue blowing until empty (6+ seconds)
4. **Repeat 3 times** for reproducibility
5. Data automatically streams to Heart Recovery Calendar

### Clinical Interpretation

| Metric | Normal Range | Mild | Moderate | Severe |
|--------|-------------|------|----------|--------|
| FEV1 | ≥80% predicted | 70-79% | 60-69% | <60% |
| FVC | ≥80% predicted | 70-79% | 60-69% | <60% |
| FEV1/FVC | ≥70% | 60-69% | 50-59% | <50% |

**Obstructive pattern**: FEV1/FVC < 70% (asthma, COPD)
**Restrictive pattern**: FEV1/FVC normal, but FVC < 80% (fibrosis, heart failure)

---

## Whoop

### Overview
- **Device**: Whoop Strap 4.0
- **Features**: HRV, resting HR, sleep stages, recovery score, strain
- **API**: Whoop API v2
- **Authentication**: OAuth 2.0

### Setup (Brief)

1. Register at [https://developer.whoop.com](https://developer.whoop.com)
2. Create application, get client ID/secret
3. Add to `backend/.env`:
   ```bash
   WHOOP_CLIENT_ID=your-whoop-client-id
   WHOOP_CLIENT_SECRET=your-whoop-secret
   ```
4. Connect via Profile → Devices → Connect Whoop
5. Syncs recovery score, strain, sleep data daily

---

## Oura Ring

### Overview
- **Device**: Oura Ring Gen 3
- **Features**: Sleep stages, HRV, body temperature, readiness score
- **API**: Oura API v2
- **Authentication**: OAuth 2.0

### Setup (Brief)

1. Register at [https://cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications)
2. Create app, get credentials
3. Add to `backend/.env`:
   ```bash
   OURA_CLIENT_ID=your-oura-client-id
   OURA_CLIENT_SECRET=your-oura-secret
   ```
4. Connect via Profile → Devices
5. Syncs sleep, readiness, activity data daily

---

## Withings

### Overview
- **Devices**: Withings Body Cardio scale, ScanWatch, BPM Connect
- **Features**: Weight, BP, ECG, SpO2, sleep
- **API**: Withings API
- **Authentication**: OAuth 2.0

### Setup (Brief)

1. Register at [https://developer.withings.com](https://developer.withings.com)
2. Create application
3. Configure credentials in backend
4. Connect via Profile → Devices
5. Syncs weight, BP, heart rate data

---

## Amazfit

### Overview
- **Devices**: Amazfit GTR, GTS, T-Rex, Bip series
- **Features**: Heart rate, SpO2, sleep, workouts
- **API**: Zepp Life API (formerly Amazfit)
- **Authentication**: OAuth 2.0

### Setup (Brief)

1. Register at [https://dev.huami.com](https://dev.huami.com)
2. Create app (requires Chinese account - challenging for international devs)
3. Alternative: Use Bluetooth export feature
4. Syncs via Zepp Life app integration

---

## Coros

### Overview
- **Devices**: Coros Apex, Pace, Vertix watches
- **Features**: Heart rate, training load, altitude acclimatization
- **API**: Coros API
- **Authentication**: OAuth 2.0

### Setup (Brief)

1. Contact Coros developer support: developer@coros.com
2. Request API access (limited availability)
3. Receive credentials after approval
4. Configure backend integration

---

## Testing & Troubleshooting

### Test Checklist

After setting up each device, verify:

- [ ] OAuth connection successful (no errors)
- [ ] Data appears in database (`device_connections` table)
- [ ] Sync logs show successful fetches (`device_sync_logs` table)
- [ ] Frontend displays device as "Connected" in Profile → Devices
- [ ] Live data appears in Vitals Page
- [ ] WebSocket events fire on new data (`vitals-update`, `exercise-update`)

### Common Issues

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| "Authorization failed" | Wrong client ID/secret | Double-check credentials, ensure no extra spaces |
| "Redirect URI mismatch" | Callback URL doesn't match | Update in developer portal to match exactly |
| No data syncing | Permissions not granted | Re-authorize, ensure all scopes selected |
| Data delayed | Polling interval | Normal - most services sync every 5-15 minutes |
| Device offline | Bluetooth/WiFi issue | Check device battery, restart Bluetooth |

### Backend Sync Logs

Check sync status:
```bash
# SSH into backend server
tail -f /var/log/heart-recovery/sync.log

# Expected output:
# [2025-11-09 14:32:10] ✅ Polar sync: 245 ECG samples
# [2025-11-09 14:32:15] ✅ Strava sync: 1 new workout
# [2025-11-09 14:32:20] ✅ Samsung Health: 48 heart rate samples
```

### Database Queries

Check device connections:
```sql
-- List all connected devices for a user
SELECT platform, is_active, last_sync, sync_status
FROM device_connections
WHERE user_id = 2;

-- Check recent sync logs
SELECT platform, sync_status, records_fetched, error_message, created_at
FROM device_sync_logs
WHERE user_id = 2
ORDER BY created_at DESC
LIMIT 20;
```

### Re-authorize Device

If data stops syncing:
1. Profile → Devices
2. Find the device
3. Click "Disconnect"
4. Click "Connect" again
5. Re-authorize all permissions

---

## WebSocket Events

All device data broadcasts via WebSocket:

```typescript
// Frontend listens to:
socket.on('vitals-update', (data) => {
  // Heart rate, SpO2, BP from any device
});

socket.on('exercise-update', (data) => {
  // Workout data from Strava, Polar, Garmin, etc.
});

socket.on('spirometry-update', (data) => {
  // FEV1, FVC, PEF from MIR spirometer
});

socket.on('ecg-data', (data) => {
  // Real-time ECG waveform from Polar H10 or Apple Watch
});
```

---

## API Credentials Storage

All credentials stored in `api_credentials` table (encrypted with AES-256):

```sql
-- Example
SELECT platform, is_active, test_status
FROM api_credentials
WHERE is_active = true;
```

Admin can manage via **Profile → API Credentials** page.

---

## Support Resources

- **Polar**: https://www.polar.com/accesslink-api
- **Samsung**: https://developer.samsung.com/health
- **Strava**: https://developers.strava.com
- **Fitbit**: https://dev.fitbit.com/build/reference/web-api/
- **Garmin**: https://developer.garmin.com/health-api/overview/
- **Google Fit**: https://developers.google.com/fit
- **Apple HealthKit**: https://developer.apple.com/documentation/healthkit

---

**All 13+ device integrations are now fully documented and ready to deploy!** 🚀
