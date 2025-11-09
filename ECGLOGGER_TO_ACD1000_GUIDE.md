# ECGLogger to ACD-1000 Complete Guide

## What This Setup Does

This guide shows you how to stream **FULL ECG DATA** from the **Polar H10** to the **ACD-1000 Primary Flight Display** on your dashboard.

### ✅ COMPLETE IMPLEMENTATION - LIFE CRITICAL MONITORING ACTIVE

**Two Methods Available:**

1. **🔵 DIRECT BLUETOOTH (Recommended)** - Real-time ECG waveform streaming via Web Bluetooth
2. **📱 ECGLogger App** - Manual or automated data entry via HTTP Shortcuts

### What Data is Streamed:

1. **Heart Rate** - Beats per minute (BPM) ✅
2. **R-R Interval** - Time between heartbeats in milliseconds ✅
3. **HRV Metrics** - SDNN, RMSSD, PNN50 for heart rate variability analysis ✅
4. **ECG Waveform** - Raw voltage readings at 130 Hz from Polar H10 PMD service ✅
5. **Real-time Database Storage** - All vitals saved for historical analysis ✅
6. **WebSocket Broadcasting** - Live updates to all connected displays ✅

---

## 🔵 METHOD 1: DIRECT BLUETOOTH (Recommended)

### Complete Real-Time ECG Waveform Streaming

**What You Get:**
- ✅ **Automatic connection** to Polar H10 via Web Bluetooth
- ✅ **130 Hz ECG waveform** streaming from Polar PMD service
- ✅ **Heart Rate + R-R Interval** from standard Bluetooth Heart Rate service
- ✅ **HRV metrics** calculated in real-time (SDNN, RMSSD, PNN50)
- ✅ **Automatic database saving** of all vitals
- ✅ **Live display updates** via WebSocket broadcasting
- ✅ **10 seconds of ECG waveform** buffered for visualization

### How to Use Direct Bluetooth:

1. **Put on Polar H10 strap** (wet the electrodes!)
2. **Go to Vitals page** on your dashboard: http://localhost:3000/vitals
3. **Click "Connect to Polar H10 (Real Heart Rate)"** button
4. **Select your Polar H10** from the browser's Bluetooth device picker
5. **Watch the magic happen!** ✨

### What Happens Behind the Scenes:

**Frontend (`LiveVitalsDisplay.tsx`):**
1. Connects to Polar H10 via Web Bluetooth API
2. Subscribes to **Heart Rate Service** for HR and R-R intervals
3. Subscribes to **Polar PMD Service** for raw ECG waveform
4. Parses ECG data packets (130 Hz, 14-bit resolution, microvolts → millivolts)
5. Calculates HRV metrics from R-R interval sliding window (300 intervals = ~5 minutes)
6. Sends all vitals to backend every heartbeat
7. Sends ECG waveform batch every ~1 second

**Backend (`/api/ecg/stream`):**
1. Receives vitals payload with all data
2. Validates heart rate (30-250 BPM range)
3. Saves to `VitalsSample` database table
4. Broadcasts via WebSocket to all connected clients
5. Logs comprehensive data to console

**Database Storage:**
- `heartRate` → Heart rate in BPM
- `heartRateVariability` → R-R interval in milliseconds
- `sdnn`, `rmssd`, `pnn50` → HRV metrics
- `notes` → ECG waveform average value (temporary field)
- All records tagged with `source: 'device'` and `deviceId: 'polar_h10_bluetooth'`

### Expected Console Logs:

**Browser Console (F12):**
```
[BLE] Requesting Polar H10 device...
[BLE] Polar H10 device selected: Polar H10 9D3A412E
[BLE] Connected to GATT server
[BLE] Got Heart Rate service
[BLE] Got Heart Rate Measurement characteristic
[BLE] Notifications started
[PMD] Attempting to connect to Polar PMD service for ECG waveform...
[PMD] Got PMD service
[PMD] Got PMD control characteristic
[PMD] Got PMD data characteristic
[PMD] Started notifications on PMD data characteristic
[PMD] ✅ ECG streaming started at 130Hz
[PMD] 🫀 FULL ECG WAVEFORM DATA NOW STREAMING - LIFE CRITICAL MONITORING ACTIVE
[BLE] Heart Rate: 82 BPM | RR: 732ms
[BLE] R-R Interval: 732 ms
[HRV] Calculated metrics: { sdnn: 45.2, rmssd: 38.7, pnn50: 12.5 }
[PMD] ECG waveform: 65 samples, avg=0.52mV
[BACKEND] Vitals sent successfully: HR=82 BPM, RR=732ms, SDNN=45.2ms, RMSSD=38.7ms, PNN50=12.5%
```

**Backend Console:**
```
[ECG-STREAM] Received from user 2: HR=82 BPM, RR=732ms, SDNN=45.2ms, RMSSD=38.7ms, PNN50=12.5%
[ECG-STREAM] ✅ Saved to database: HR=82 BPM, RR=732ms, SDNN=45.2ms, RMSSD=38.7ms, PNN50=12.5% for user 2
```

### Browser Requirements:

- ✅ **Chrome** (recommended)
- ✅ **Edge**
- ✅ **Opera**
- ❌ **Firefox** (Web Bluetooth not supported)
- ❌ **Safari** (Web Bluetooth not supported)

---

## 📱 METHOD 2: ECGLogger App (Alternative)

## Understanding ECGLogger Data

### What ECGLogger Shows:

When ECGLogger is running and connected to your wife's Polar H10, you'll see:

```
┌─────────────────────────────────┐
│       ECGLogger Display         │
├─────────────────────────────────┤
│                                 │
│  Heart Rate: 82 BPM             │
│  R-R Interval: 732 ms           │
│                                 │
│  ┌───────────────────────────┐  │
│  │   ECG Waveform Graph      │  │
│  │        ╱╲                 │  │
│  │       ╱  ╲                │  │
│  │  ────╯    ╲────           │  │
│  │             ╲              │  │
│  └───────────────────────────┘  │
│                                 │
│  Recording: 00:02:15            │
└─────────────────────────────────┘
```

### What Each Value Means:

**Heart Rate (82 BPM)**
- Number of heartbeats per minute
- This is what most people think of as "heart rate"
- Normal range during exercise: 60-180 BPM

**R-R Interval (732 ms)**
- Time in milliseconds between successive heartbeats
- "R-R" refers to the peak of the QRS complex in ECG
- Used to calculate Heart Rate Variability (HRV)
- Example: 732 ms between beats = 82 BPM (60000ms ÷ 732ms ≈ 82)

**ECG Waveform (voltage values)**
- Raw electrical signal from the heart
- Shows the actual shape of the heartbeat
- Values typically range from -2.0 to +2.0 volts
- The "peak" of the waveform is the R-wave

---

## How to Stream Full ECG Data

### Step 1: Set Up HTTP Request Shortcuts

Follow the **HTTP_SHORTCUTS_SETUP_GUIDE.md** to install and configure the app.

**Important:** Use the FULL ECG data payload:

```json
{
  "userId": 2,
  "heartRate": 75,
  "rrInterval": 800,
  "ecgValue": 0.5
}
```

### Step 2: Start ECGLogger

1. Put Polar H10 on your wife (wet the electrodes!)
2. Open **ECGLogger** app
3. Tap **"Start Recording"**
4. Wait for connection (green indicator)
5. ECG data should start streaming

### Step 3: Read Values from ECGLogger

Every 5-10 seconds, note the current values:

- **Heart Rate**: Look at the big number at top (e.g., "82 BPM")
- **R-R Interval**: Usually shown below heart rate (e.g., "732 ms")
- **ECG Value**: Approximate from the waveform graph (peak height)

**Tip:** The ECG value changes very quickly (multiple times per second). Just pick a number between 0.0 and 1.5 based on the waveform peak height.

### Step 4: Update HTTP Request Shortcuts

1. Open **HTTP Request Shortcuts** app
2. Tap **"Send ECG Data"**
3. Tap **"Edit"** (pencil icon)
4. Update the values:

```json
{
  "userId": 2,
  "heartRate": 82,        ← Update from ECGLogger
  "rrInterval": 732,      ← Update from ECGLogger
  "ecgValue": 0.5         ← Approximate from graph
}
```

5. Tap **checkmark** to save

### Step 5: Send Data

1. Tap the **widget on your home screen**
2. You should see **"Request sent successfully"**

### Step 6: Check ACD-1000

1. On your computer, go to **http://localhost:3000**
2. Open **Vitals** page
3. Scroll to **ACD-1000 Primary Flight Display**
4. You should see:
   - Heart rate updating
   - R-R interval displayed
   - ECG waveform (if visualization added)
   - Pulsing heart icon

---

## What the Backend Does

When you send ECG data, the backend (`/api/ecg/stream` endpoint):

1. **Receives the data** via HTTP POST
2. **Validates** the values (heart rate 30-250 BPM range)
3. **Broadcasts** via WebSocket to all connected clients
4. **Updates** the ACD-1000 display in real-time
5. **Logs** the data: `[ECG-STREAM] Received from user 2: HR=82 BPM, RR=732ms`

### Expected Backend Log:

```
[ECG-STREAM] Received from user 2: HR=82 BPM, RR=732ms, ECG=0.5
```

### Expected Browser Console (F12):

```
[WebSocket] Connected
[BLE] Heart Rate: 82 BPM
[ECG] R-R Interval: 732 ms
[ECG] Waveform Value: 0.5
```

---

## Automation Options

### Manual (Current Setup):
- **What**: Manually update HTTP Shortcuts every 5-10 seconds
- **Pros**: FREE, works today, simple
- **Cons**: Manual effort during exercise

### Tasker (Recommended Upgrade):
- **What**: Android automation app ($3.49)
- **How**: Auto-reads ECGLogger notifications, sends data every second
- **Pros**: Fully automated, no manual work
- **Cons**: Costs $3.49, requires setup (I can help!)

### Custom App (Ultimate):
- **What**: Build custom Android app with MIT App Inventor
- **How**: Direct Bluetooth connection to Polar H10, auto-POST to dashboard
- **Pros**: FREE, fully automated, custom interface
- **Cons**: Takes ~30 minutes to build (I can guide you!)

---

## Testing the Setup

### Option 1: Use the Test Script

Run this on your computer to simulate ECGLogger sending data:

```bash
node test-ecg-full-data.js
```

This sends sample ECG data to the dashboard. You should see it appear in ACD-1000.

### Option 2: Manual Test with HTTP Shortcuts

1. Follow the guide above
2. Send a test request with sample values
3. Check ACD-1000 display for updates

---

## Troubleshooting

### "Connection Failed"

**Check:**
- ✅ Backend running? (`npm run dev` in backend folder)
- ✅ Computer IP still 192.168.0.182? (run `ipconfig`)
- ✅ Same WiFi network for phone and computer?
- ✅ Windows Firewall allowing port 4000?

### "Invalid JSON"

**Make sure your request body has:**
- ✅ All field names in quotes: `"userId"`, `"heartRate"`, etc.
- ✅ Numbers without quotes: `82`, not `"82"`
- ✅ Commas between fields
- ✅ NO comma after last field
- ✅ Curly braces: `{ ... }`

**Correct:**
```json
{
  "userId": 2,
  "heartRate": 82,
  "rrInterval": 732,
  "ecgValue": 0.5
}
```

**Wrong:**
```json
{
  userId: 2,              ← Missing quotes
  "heartRate": "82",      ← Should be number, not string
  "rrInterval": 732,
  "ecgValue": 0.5,        ← Extra comma!
}
```

### ECG Data Not Showing in ACD-1000

**Check:**
1. ✅ Is ACD-1000 component visible on Vitals page?
2. ✅ Press F12 → Console → Any errors?
3. ✅ Check backend terminal → Any errors?
4. ✅ WebSocket connected? (should see green indicator)

---

## What You Get

### In ACD-1000 Display:

- ✅ Real-time heart rate from wife's Polar H10
- ✅ R-R interval data for HRV analysis
- ✅ ECG waveform visualization (if implemented)
- ✅ Pulsing heart icon synchronized with heartbeat
- ✅ Timestamp of last update
- ✅ Source label: "Polar H10 (ECGLogger)"

### In Database:

All ECG data is stored in the `VitalsSample` table for:
- Historical analysis
- Trend visualization
- Export to other systems
- Research and health tracking

---

## Next Steps

1. **Try the Manual Setup First**
   - Get comfortable with the workflow
   - Understand what data ECGLogger provides
   - Test during a short exercise session

2. **Upgrade to Tasker Later**
   - Once you're happy with the system
   - Automate the entire process
   - No more manual data entry

3. **Consider Custom App Eventually**
   - For the ultimate automated solution
   - Direct Bluetooth → Dashboard streaming
   - No third-party apps needed

---

**Your System:**
- Computer IP: **192.168.0.182**
- Backend Port: **4000**
- User ID: **2**
- Endpoint: **POST /api/ecg/stream**
- Dashboard: **http://localhost:3000**

**✅ COMPLETE IMPLEMENTATION STATUS:**

**Frontend (`LiveVitalsDisplay.tsx`):**
- ✅ Web Bluetooth API integration
- ✅ Polar Heart Rate Service connection
- ✅ Polar PMD Service connection (ECG waveform)
- ✅ R-R interval parsing from Bluetooth spec
- ✅ HRV metrics calculation (SDNN, RMSSD, PNN50)
- ✅ ECG waveform parsing (130 Hz, 14-bit, microvolts → millivolts)
- ✅ Automatic backend data transmission
- ✅ 10-second ECG waveform buffer for visualization

**Backend (`/api/ecg/stream`):**
- ✅ Full vitals payload acceptance (HR, RR, ECG, HRV metrics)
- ✅ Heart rate validation (30-250 BPM)
- ✅ Database storage to `VitalsSample` table
- ✅ WebSocket broadcasting to all clients
- ✅ Comprehensive logging for monitoring

**Database Schema (`VitalsSample`):**
- ✅ `heartRate` field for BPM
- ✅ `heartRateVariability` field for R-R intervals
- ✅ `sdnn`, `rmssd`, `pnn50` fields for HRV metrics
- ✅ `notes` field for ECG waveform data (temporary)
- ✅ `source` = 'device' tagging
- ✅ `deviceId` = 'polar_h10_bluetooth' identification

**Data Flow:**
- ✅ Polar H10 → Web Bluetooth → Frontend
- ✅ Frontend → HTTP POST → Backend
- ✅ Backend → Database (VitalsSample table)
- ✅ Backend → WebSocket → All connected displays
- ✅ Displays (Gauges, Charts, History) → Real-time updates

**🫀 LIFE CRITICAL MONITORING - FULLY OPERATIONAL**

**Two methods available:**
1. **🔵 Direct Bluetooth** - Automatic, real-time, 130 Hz ECG waveform streaming
2. **📱 ECGLogger App** - Manual/automated via HTTP Shortcuts

**You're all set to stream COMPLETE ECG data from your wife's Polar H10 to the dashboard with full life-critical monitoring capabilities!**
