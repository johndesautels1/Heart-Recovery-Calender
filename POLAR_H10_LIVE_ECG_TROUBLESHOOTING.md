# Polar H10 Live ECG Troubleshooting Guide

## 🚨 Why Your ECG Data Isn't Showing

You're recording ECG on your Samsung phone's Polar app **RIGHT NOW**, but not seeing it in the ACD-1000 dashboard because:

### The Problem:
- **Your ECG is LIVE on your phone** (in progress)
- **Data is LOCAL** (stored on your phone)
- **Not uploaded to Polar cloud yet**
- **Polar only syncs to cloud AFTER workout ends**
- **Our backend polls Polar cloud every 5 minutes**
- **Backend finds: "0 exercises available"** (because workout still active)

### Backend Logs Show:
```
[POLAR-API] Response: 0 exercises available
[POLAR-SYNC] Polar API returned 0 available exercises
[DEVICE-SYNC] ✓ Polar H10: No new data (already up to date)
```

---

## ✅ Solution 1: Finish Your Current Recording (Easiest)

### Steps:
1. **Stop/Finish** the ECG recording on your Polar app
2. **Wait 30-60 seconds** for auto-upload to Polar cloud
3. **Wait up to 5 minutes** for next backend sync
4. **Refresh VitalsPage** in browser
5. **ECG data appears!**

### Timeline:
- Recording ends: `Now`
- Upload to cloud: `30-60 seconds`
- Backend sync: `Every 5 minutes`
- **Total wait: 0-5 minutes**

---

## ⚡ Solution 2: Start Live Bluetooth Streaming (Real-Time!)

### What This Does:
Streams ECG data **directly** from your Polar H10 to the backend via Bluetooth, bypassing Polar cloud entirely. **130 Hz real-time waveform!**

### Requirements:
- Polar H10 within Bluetooth range of your computer
- Computer has Bluetooth adapter
- Polar H10 is paired/discoverable

### Steps:

#### Option A: Browser Console (Quick Test)
1. **Login** to http://localhost:3000
   - Email: brokerpinellas@gmail.com
   - Password: Puspin15!

2. **Go to Vitals Page**

3. **Open browser console** (F12 → Console tab)

4. **Run this command**:
   ```javascript
   fetch('http://localhost:4000/api/polar-h10/start-stream', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('token'),
       'Content-Type': 'application/json'
     }
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

5. **Check response**:
   ```json
   {
     "success": true,
     "message": "Polar H10 ECG streaming started",
     "sessionId": "polar-h10-1699536000000-abc123"
   }
   ```

6. **Live ECG waveform appears** on ACD-1000 display!

#### Option B: UI Button (Coming Next)
I'm adding a "Start Live ECG Stream" button to the VitalsPage right now...

### Stop Streaming:
```javascript
fetch('http://localhost:4000/api/polar-h10/stop-stream', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
```

### Check Streaming Status:
```javascript
fetch('http://localhost:4000/api/polar-h10/status', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)
```

---

## 📁 Solution 3: Import ECG File from Third-Party App

If you're using a third-party "ECG Analysis for Polar H10" app:

### Steps:
1. **Export ECG data** from the app
   - Look for "Export", "Share", or "Save" button
   - Choose format: `.HRV`, `.CSV`, or `.TXT`
2. **Save file** to your computer
3. **Use file import** (I'm creating this feature now)

### Supported File Formats:
- **`.HRV`**: Polar-specific format with R-R intervals
- **`.CSV`**: Comma-separated values (timestamp, voltage)
- **`.TXT`**: Plain text (timestamp, voltage)

### File Import UI (Coming Next):
- Drag-and-drop file upload
- Automatic format detection
- ECG waveform preview
- Import to ACD-1000 dashboard

---

## 🔍 Verify Data is Syncing

### Check Backend Sync Status:

1. **View backend logs**:
   - Backend console shows sync every 5 minutes
   - Look for: `[DEVICE-SYNC] 🔄 Syncing polar`

2. **Check database**:
   ```sql
   -- See when last sync happened
   SELECT
     deviceName,
     lastSyncedAt,
     syncStatus
   FROM device_connections
   WHERE deviceType = 'polar'
     AND userId = 2;

   -- Check sync logs
   SELECT
     dataType,
     status,
     recordsProcessed,
     startedAt,
     completedAt,
     errorMessage
   FROM device_sync_logs
   WHERE deviceConnectionId IN (
     SELECT id FROM device_connections
     WHERE deviceType = 'polar' AND userId = 2
   )
   ORDER BY startedAt DESC
   LIMIT 10;
   ```

3. **View device in frontend**:
   - Profile → Devices
   - Find "Polar H10"
   - Status should be: **Connected ✅**
   - Last Sync: Should update every 5 minutes

### Check for ECG Data in Database:

```sql
-- Count ECG samples
SELECT COUNT(*) as total_samples
FROM ecg_samples
WHERE userId = 2;

-- View recent ECG samples
SELECT
  id,
  timestamp,
  voltage,
  samplingRate,
  deviceId,
  sessionId,
  rPeak
FROM ecg_samples
WHERE userId = 2
ORDER BY timestamp DESC
LIMIT 100;

-- View sessions
SELECT
  sessionId,
  COUNT(*) as samples,
  MIN(timestamp) as session_start,
  MAX(timestamp) as session_end,
  ROUND((EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))), 2) as duration_seconds
FROM ecg_samples
WHERE userId = 2
GROUP BY sessionId
ORDER BY session_start DESC;
```

---

## 🎯 What Data Appears in ACD-1000?

Once streaming/synced, you'll see:

### ECG Monitor Section:
- **Real-time waveform** (130 Hz, Lead I)
- **Heart rate** (BPM, updated every second)
- **R-peak markers** (QRS complex detection)
- **Session duration**
- **Device info** (Polar H10 Bluetooth)

### HRV Metrics:
- **SDNN** (Standard deviation of R-R intervals)
- **RMSSD** (Root mean square of successive differences)
- **pNN50** (% of intervals differing by >50ms)

### Heart Rate Zones:
- Resting: < 100 BPM
- Light: 100-120 BPM
- Moderate: 120-140 BPM
- Vigorous: 140-160 BPM
- Maximum: > 160 BPM

### Historical Archive:
- All ECG sessions stored in database
- Searchable by date/time
- Download as `.CSV` or `.HRV`

---

## 🛠️ Troubleshooting

### "No Polar H10 device found"
- **Check**: Polar H10 is turned on
- **Check**: Battery has charge
- **Check**: Bluetooth is enabled on computer
- **Try**: Pair device in OS Bluetooth settings first

### "Connection timeout"
- **Check**: Polar H10 is within 10 feet of computer
- **Try**: Move closer to computer
- **Try**: Remove other Bluetooth devices

### "Permission denied"
- **Check**: Backend has Bluetooth permissions (may require admin)
- **Windows**: Settings → Privacy → Bluetooth → Allow apps
- **Mac**: System Preferences → Security → Bluetooth → Allow Node.js

### "Still no data after workout ended"
- **Wait**: Polar cloud can take 1-5 minutes to sync
- **Check**: Phone has internet connection
- **Check**: Polar Flow app is running in background
- **Try**: Force sync in Polar Flow app (pull to refresh)

### "Data shows but waveform is flat"
- **Check**: Electrode pads are wet
- **Check**: Strap is snug (not too tight)
- **Try**: Re-wet electrodes with water
- **Try**: Reposition strap slightly lower

---

## 📊 Performance Tips

### For Best Real-Time Streaming:
- Keep Polar H10 within 6 feet of computer
- Close other Bluetooth apps
- Use USB Bluetooth adapter (more reliable than built-in)
- Ensure electrode pads are fresh (replace every 3-6 months)

### For Best Cloud Sync:
- Keep Polar Flow app open in background
- Enable "Auto-sync" in Polar Flow settings
- Use WiFi instead of mobile data (faster upload)
- Don't force-close Polar Flow after workout

---

## 🚀 Quick Start Checklist

**To see your CURRENT ECG recording:**
- [ ] Stop the recording on your phone
- [ ] Wait 60 seconds for upload
- [ ] Refresh VitalsPage in 5 minutes
- [ ] ECG data appears!

**To stream NEXT ECG session live:**
- [ ] Start live Bluetooth streaming (Solution 2)
- [ ] Start new ECG recording on Polar H10
- [ ] Watch real-time waveform in ACD-1000!

**To import from third-party app:**
- [ ] Export ECG file from app
- [ ] Use file import feature (coming next)
- [ ] View in ACD-1000 dashboard

---

## 📞 Support

If you're still not seeing data after trying all solutions:

1. **Check backend logs** for errors
2. **Check frontend browser console** for errors
3. **Verify Polar credentials** in Profile → API Credentials
4. **Test Polar OAuth connection**: Disconnect and reconnect
5. **Contact me** for direct troubleshooting

---

**Your data is coming - just need to wait for the current recording to finish and upload!** 🫀
