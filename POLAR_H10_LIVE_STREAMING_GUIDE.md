# Polar H10 Live Heart Rate Streaming to ACD-1000

## ✅ What's Been Implemented

1. **LiveVitalsDisplay component** added to ACD-1000 Primary Flight Display (VitalsPage.tsx:2600)
2. **Real-time HTTP endpoint** created at `POST /api/polar/live-hr` (backend/src/routes/polar.ts:161)
3. **WebSocket broadcasting** integrated with existing infrastructure
4. **Test script** created to verify the system works

## 🎯 How to View Real-Time Heart Rate

1. Open http://localhost:3000
2. Go to **Vitals** page
3. Scroll down to find the **ACD-1000** button (looks like a flight display toggle)
4. Click the **ACD-1000** button to activate the Primary Flight Display
5. The **LiveVitalsDisplay** component will show:
   - Connection status (Live Connection / Disconnected)
   - Real-time heart rate in BPM (large red numbers)
   - Heart icon that pulses with each reading
   - Status indicators (Normal Range, Bradycardia, Tachycardia)
   - Last update timestamp

## 📱 How to Send Live Heart Rate from Samsung Phone

### Option 1: Using HTTP Request Shortcuts App (Recommended)

1. **Install HTTP Request Shortcuts** from Google Play Store
   - Free app: https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts

2. **Find your computer's IP address**:
   ```
   - On Windows: Open Command Prompt, type: ipconfig
   - Look for "IPv4 Address" under your active network adapter
   - Example: 192.168.0.100
   ```

3. **Create a new shortcut** in HTTP Request Shortcuts:
   - **Name**: "Send Heart Rate to ACD-1000"
   - **URL**: `http://YOUR_COMPUTER_IP:4000/api/polar/live-hr`
   - **Method**: POST
   - **Content Type**: application/json
   - **Body**:
   ```json
   {
     "userId": 2,
     "heartRate": 75
   }
   ```

4. **Add a widget** to your home screen for quick access

5. **Manual Testing**:
   - Tap the shortcut
   - Check the ACD-1000 display to see the heart rate update

### Option 2: Using Tasker (Advanced)

1. **Install Tasker** from Google Play Store

2. **Create a new Task**:
   - Action: HTTP POST
   - Server:Port: `YOUR_COMPUTER_IP:4000`
   - Path: `/api/polar/live-hr`
   - Content Type: `application/json`
   - Body: `{"userId":2,"heartRate":75}`

3. **Trigger**: You can set up triggers like:
   - Time-based (every 5 seconds during exercise)
   - Manual button press
   - Integration with Samsung Health

### Option 3: Using Polar Beat App with Automation

If Polar Beat app is running on your Samsung phone and receiving Bluetooth data from Polar H10:

1. Use **Tasker** or **Automate** to read notifications/data from Polar Beat
2. Extract the heart rate value
3. Send HTTP POST request to the endpoint above

### Option 4: Desktop Testing (What You Just Saw)

Run the test script from your computer:
```bash
node "C:\Users\broke\Heart-Recovery-Calender\test-polar-live-hr.js"
```

This simulates real-time heart rate streaming (sends data every 2 seconds for 30 seconds).

## 🔧 Technical Details

### API Endpoint Specification

**URL**: `POST http://localhost:4000/api/polar/live-hr`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "userId": 2,
  "heartRate": 85,
  "timestamp": "2025-11-08T20:55:00.000Z"  // Optional, defaults to current time
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Heart rate broadcasted"
}
```

**Response** (Error - Invalid heart rate):
```json
{
  "error": "Heart rate must be between 30-250 BPM"
}
```

### Validation Rules

- `userId` (required): Your user ID (currently 2)
- `heartRate` (required): Integer between 30-250 BPM
- `timestamp` (optional): ISO 8601 datetime string

### WebSocket Broadcasting

When you POST heart rate data, the backend:
1. Validates the data
2. Broadcasts to all connected clients in room `patient-2` via WebSocket
3. Frontend's `LiveVitalsDisplay` component receives the update
4. Heart rate display updates instantly in ACD-1000

## 🚀 Future Improvements

To fully automate this with your Polar H10:

1. **Mobile App Development**: Build a simple Android app that:
   - Connects to Polar H10 via Bluetooth Low Energy (BLE)
   - Reads heart rate data from the device
   - Sends HTTP POST requests to the backend every 2-5 seconds
   - Runs as a background service

2. **Samsung Health Integration**: Use Samsung Health SDK to:
   - Read live heart rate from Polar H10 (if Samsung Health receives it)
   - Forward to the backend endpoint

3. **Web Bluetooth API**: Use Chrome's Web Bluetooth API to:
   - Connect directly from the browser to Polar H10
   - No phone/app needed, but requires proximity to device

## 📊 Monitoring & Logs

### Backend Logs
You'll see messages like:
```
[POLAR-LIVE] Received live HR from user 2: 85 BPM
```

### Frontend WebSocket
The LiveVitalsDisplay component shows:
- **Green "Live Connection"** when WebSocket is connected
- **Gray "Disconnected"** when WebSocket is down
- **Last update timestamp** for each heart rate reading

## 🧪 Testing Checklist

- [x] Backend endpoint accepts heart rate data
- [x] WebSocket broadcasts to connected clients
- [x] LiveVitalsDisplay component renders in ACD-1000
- [x] Test script successfully sends 15 heart rate readings
- [ ] Samsung phone sends real data to endpoint
- [ ] Live heart rate updates display in real-time
- [ ] Heart icon pulses with each update

## 💡 Quick Start Test

1. Open http://localhost:3000 in one browser tab
2. Go to Vitals → Click ACD-1000 button
3. In a new terminal, run:
   ```bash
   node "C:\Users\broke\Heart-Recovery-Calender\test-polar-live-hr.js"
   ```
4. Watch the ACD-1000 display update with live heart rate!

## 🔗 Related Files

- Frontend: `frontend/src/pages/VitalsPage.tsx` (line 2600)
- Frontend: `frontend/src/components/LiveVitalsDisplay.tsx`
- Backend: `backend/src/routes/polar.ts` (line 161)
- Backend: `backend/src/services/websocketService.ts` (line 89)
- Test: `test-polar-live-hr.js`

---

**Note**: Your user ID is `2` (brokerpinellas@gmail.com). If you create additional users, update the `userId` in the request body accordingly.
