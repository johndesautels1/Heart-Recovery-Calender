# Polar Beat + Tasker Auto-Streaming Setup

## Best Solution: Polar Beat App + Tasker Automation

### Why This Setup?
- **Polar Beat**: Official Polar app with best Polar H10 support
- **Tasker**: Android automation to extract HR and send to dashboard
- **Fully Automated**: No manual CSV exports needed
- **Real-Time**: Heart rate streams live to ACD-1000 display

---

## Step 1: Install Required Apps

### On Samsung Phone:

1. **Polar Beat** (Official Polar app)
   - Google Play Store: https://play.google.com/store/apps/details?id=fi.polar.polarbeat
   - FREE
   - Best Polar H10 integration
   - Clean interface showing real-time HR

2. **Tasker** (Automation app)
   - Google Play Store: https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm
   - Paid ($3.49) - ONE TIME purchase
   - Most powerful Android automation tool
   - Can extract data and send HTTP requests

3. **AutoNotification** (Tasker plugin - OPTIONAL but recommended)
   - Google Play Store: https://play.google.com/store/apps/details?id=com.joaomgcd.autonotification
   - FREE version sufficient
   - Helps extract heart rate from Polar Beat notifications

---

## Step 2: Find Your Computer's IP Address

On your Windows computer:
```
1. Press Windows key + R
2. Type: cmd
3. Press Enter
4. Type: ipconfig
5. Look for "IPv4 Address" (example: 192.168.0.100)
6. Write it down!
```

---

## Step 3: Configure Tasker to Stream Heart Rate

### Create Tasker Profile:

1. **Open Tasker** app
2. Tap **"+"** (bottom right) to create new profile
3. Select **"Event"** → **"Plugin"** → **"AutoNotification"**
4. Configure:
   - **App**: Polar Beat
   - **Notification Text**: Contains "bpm" OR "BPM"
5. Tap checkmark

### Create Task to Send Heart Rate:

1. Name task: **"Send HR to Dashboard"**
2. Add Action: **"Variable" → "Variable Set"**
   - **Name**: %HEARTRATE
   - **To**: Use AutoNotification to extract: %antext
   - Use regex to extract number before "bpm"

3. Add Action: **"Net" → "HTTP Post"**
   - **Server:Port**: `YOUR_COMPUTER_IP:4000` (e.g., 192.168.0.100:4000)
   - **Path**: `/api/ecg/stream`
   - **Data / File**:
   ```json
   {"userId":2,"heartRate":%HEARTRATE,"timestamp":"%DATE %TIME"}
   ```
   - **Content Type**: `application/json`

4. Tap checkmark to save

### Enable Profile:
- Toggle the profile ON (green)
- Done!

---

## Step 4: Test the Setup

1. **Put on Polar H10** (wet electrodes, wear on chest)
2. **Open Polar Beat** app
3. **Start a training session**
4. **Wait for heart rate to appear** in Polar Beat
5. **Check your computer** at http://localhost:3000
6. **Open ACD-1000 display**
7. **You should see live heart rate streaming!**

---

## Alternative: Simpler Setup with HTTP Request Shortcuts

If you don't want to buy Tasker:

### Install HTTP Request Shortcuts (FREE):
- https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts

### Create Widget:
1. Create new shortcut
2. **URL**: `http://YOUR_COMPUTER_IP:4000/api/ecg/stream`
3. **Method**: POST
4. **Body**:
```json
{
  "userId": 2,
  "heartRate": 75
}
```
5. Add widget to home screen

### Manual Streaming:
1. Open Polar Beat
2. See heart rate (e.g., 78 BPM)
3. Tap HTTP Request Shortcuts widget
4. Manually edit heartRate value to 78
5. Tap "Send"
6. Repeat every 5-10 seconds during exercise

---

## Better Apps Comparison

| App | Cost | Interface | Export | Real-Time | Best For |
|-----|------|-----------|--------|-----------|----------|
| **Polar Beat** | FREE | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **BEST - Official Polar** |
| ECGLogger | FREE | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Good for CSV exports |
| HRV4Training | $10 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | HRV analysis |
| Elite HRV | FREE | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Professional HRV |
| Polar Flow | FREE | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Polar ecosystem |

**WINNER: Polar Beat** - Best interface, best Polar H10 support, FREE

---

## Advanced: Custom Android App

Want the ULTIMATE solution? I can help you create a simple Android app using **MIT App Inventor** (no coding required!) that:

1. Connects directly to Polar H10 via Bluetooth
2. Reads heart rate every 1 second
3. Automatically POSTs to dashboard endpoint
4. Shows mini heart rate widget on phone
5. Runs in background during exercise

This would be:
- ✅ Fully automated
- ✅ No manual intervention
- ✅ Real-time (1-second updates)
- ✅ Free
- ✅ Custom interface for your wife

**Interested?** I can guide you through creating this with MIT App Inventor (takes ~30 minutes, drag-and-drop interface).

---

## What I Recommend

**For NOW (Quick Setup):**
1. Install **Polar Beat** (free, best interface)
2. Install **HTTP Request Shortcuts** (free)
3. Create widget
4. Manually tap to send HR during exercise

**For LATER (Automated):**
1. Buy **Tasker** ($3.49)
2. Set up AutoNotification profile
3. Fully automated streaming!

**For ULTIMATE (Custom App):**
1. Use MIT App Inventor
2. Build custom app in 30 minutes
3. Perfect integration forever

---

## Current Status

✅ Backend endpoint ready: `POST /api/ecg/stream`
✅ ACD-1000 display ready to receive data
✅ WebSocket broadcasting working
✅ Database storage configured

**You just need to pick an app and start streaming!**

---

**My Recommendation:** Start with **Polar Beat** (it's free and has the best Polar H10 support). Try manual streaming with HTTP Request Shortcuts first. If you like it, upgrade to Tasker for full automation.
