# ECGLogger App Integration Guide

## ✅ What's Been Set Up

I've created a complete integration system for ECGLogger data from your Samsung phone.

### Backend API Endpoints Created:

1. **POST `/api/ecg/upload`** - Upload ECGLogger CSV files
2. **POST `/api/ecg/stream`** - Stream real-time heart rate from ECGLogger
3. **GET `/api/ecg/history`** - View imported ECG history

### Features:
- ✅ CSV file upload and parsing
- ✅ Real-time WebSocket broadcasting to ACD-1000
- ✅ Heart rate + R-R interval + ECG waveform support
- ✅ Automatic duplicate detection
- ✅ Integration with existing vitals database

## 📱 How to Get Data from ECGLogger to Dashboard

### Method 1: Upload CSV Files (Easiest)

**On your Samsung phone:**

1. Open **ECGLogger** app
2. Complete a heart rate recording session with your wife's Polar H10
3. Go to **Settings** → **Export** or **Share**
4. Export as **CSV file**
5. Send the CSV file to yourself via:
   - Email
   - Google Drive
   - OneDrive
   - Bluetooth file transfer to computer

**On your computer:**

1. Go to http://localhost:3000
2. Navigate to **Vitals** page
3. Look for **"Upload ECGLogger Data"** section (I'll add this UI next)
4. Click **"Choose File"** and select the CSV file
5. Click **"Upload"**
6. Data will instantly appear in ACD-1000 display!

### Method 2: Real-Time Streaming (Advanced)

**Requirements:**
- HTTP Request Shortcuts app (free on Play Store)
- Your computer's IP address
- ECGLogger running on Samsung phone

**Setup:**

1. **Find your computer's IP:**
   ```
   Windows: ipconfig (look for IPv4 Address)
   Example: 192.168.0.100
   ```

2. **Install HTTP Request Shortcuts:**
   - https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts

3. **Create shortcut:**
   - **Name**: "Stream Heart Rate to Dashboard"
   - **URL**: `http://YOUR_COMPUTER_IP:4000/api/ecg/stream`
   - **Method**: POST
   - **Content-Type**: application/json
   - **Body**:
   ```json
   {
     "userId": 2,
     "heartRate": 75,
     "rrInterval": 800,
     "timestamp": "2025-11-08T22:00:00.000Z"
   }
   ```

4. **Use with ECGLogger:**
   - Run ECGLogger recording
   - Tap HTTP Request Shortcuts widget every few seconds
   - Update heartRate value from ECGLogger display
   - Data streams live to ACD-1000!

### Method 3: Tasker Automation (Most Advanced)

If you have **Tasker** app, you can automate reading ECGLogger notifications and sending data to the dashboard automatically.

## 📊 Supported CSV Formats

ECGLogger exports data in these columns (the integration detects automatically):

**Heart Rate Format:**
```csv
timestamp,hr,rr_interval
2025-11-08 10:30:00,72,833
2025-11-08 10:30:01,75,800
```

**Full ECG Format:**
```csv
timestamp,hr,rr,ecg_value
2025-11-08 10:30:00,72,833,0.5
2025-11-08 10:30:00.01,72,833,0.6
```

**Alternative Column Names (Auto-detected):**
- `timestamp`, `time`, `datetime`
- `hr`, `heart_rate`, `heartrate`
- `rr`, `rr_interval`
- `ecg`, `ecg_value`

## 🎯 What Happens After Upload

1. **CSV Parsing**: File is parsed row by row
2. **Validation**: Heart rate checked (30-250 BPM range)
3. **Database Storage**: Each reading stored in VitalsSample table
4. **WebSocket Broadcast**: Live data sent to ACD-1000 display
5. **Duplicate Detection**: Already-imported data is skipped

## 🚀 Next Steps - UI for Upload

I'll now create a UI component on the Vitals page where you can:
- **Drag & drop CSV files**
- **See upload progress**
- **View import statistics** (X records created, Y skipped)
- **Preview data** before import

## 📱 ECGLogger App Tips

**Best Practices:**
1. Start ECGLogger BEFORE putting on Polar H10
2. Wet the electrodes thoroughly
3. Wait for solid green connection in ECGLogger
4. Record for at least 2-3 minutes for good data
5. Export immediately after recording
6. Use "Share" → "Save to Files" for easy transfer

**Common Issues:**
- **No data in export**: Make sure recording was started and stopped properly
- **Connection drops**: Polar H10 battery low or electrodes dry
- **Choppy data**: Phone's Bluetooth interference (turn off other BT devices)

## 🔧 API Usage Examples

### Upload CSV via cURL:
```bash
curl -X POST http://localhost:4000/api/ecg/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "ecgFile=@path/to/ecglogger_export.csv"
```

### Stream Single Heart Rate:
```bash
curl -X POST http://localhost:4000/api/ecg/stream \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "heartRate": 75,
    "rrInterval": 800,
    "ecgValue": 0.5,
    "timestamp": "2025-11-08T22:00:00.000Z"
  }'
```

### Get History:
```bash
curl -X GET "http://localhost:4000/api/ecg/history?startDate=2025-11-01&endDate=2025-11-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 💡 What You'll See in ACD-1000

After uploading or streaming:
- **Real-time heart rate** updating in the display
- **Heart icon pulsing** with each beat
- **Timestamp** of last reading
- **Source label**: "Polar H10 (ECGLogger)"
- **ECG waveform** (if CSV contains ecg_value column)

---

**Status**: Backend API ready ✅
**Next**: Adding upload UI to Vitals page
**Your wife's data**: Will appear in real-time in ACD-1000 display!
