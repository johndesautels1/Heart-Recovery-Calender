# HTTP Request Shortcuts - Complete Setup Guide

## Your Settings:
- **Computer IP**: 192.168.0.182
- **Port**: 4000
- **User ID**: 2

---

## Step-by-Step Setup (5 Minutes)

### Step 1: Install the App

1. On your Samsung phone, open **Google Play Store**
2. Search for: **"HTTP Request Shortcuts"**
3. Look for app by **"waboodoo"** (official developer)
4. Tap **Install**
5. Wait for download to complete
6. Tap **Open**

---

### Step 2: Create Your First Shortcut

1. When app opens, tap **"+"** button (bottom right corner)
2. You'll see "Create Shortcut" screen

**Fill in these EXACT settings:**

#### Basic Settings Tab:

**Shortcut Name:**
```
Send ECG Data
```

**Description (optional):**
```
Sends full ECG data from ECGLogger to ACD-1000
```

---

#### Request Settings Tab:

**Method:**
- Tap the dropdown
- Select: **POST**

**URL:**
```
http://192.168.0.182:4000/api/ecg/stream
```
*(Copy this exactly - no spaces!)*

**Request Body:**
- Tap "Request Body"
- Select: **Custom Body**
- Paste this EXACTLY (this is FULL ECG data):
```json
{
  "userId": 2,
  "heartRate": 75,
  "rrInterval": 800,
  "ecgValue": 0.5
}
```

**What these values mean:**
- `heartRate`: Heart rate in BPM (from ECGLogger display)
- `rrInterval`: Time between heartbeats in milliseconds (R-R interval)
- `ecgValue`: ECG waveform value (voltage reading)

**Content Type:**
- Tap "Content Type"
- Select: **application/json**

---

#### Advanced Settings (Optional but Recommended):

**Timeout:**
```
10000
```
*(10 seconds)*

**Retry Policy:**
- Leave as default (No Retry)

---

### Step 3: Save the Shortcut

1. Tap the **checkmark** (✓) in top right corner
2. You should see "Send Heart Rate" in your shortcuts list

---

### Step 4: Test It!

1. Tap **"Send Heart Rate"** from the list
2. The app will send the request
3. You should see a success message

**On your computer:**
1. Go to http://localhost:3000
2. Click **Vitals** page
3. Click **ACD-1000** button
4. You should see **75 BPM** appear in the display!

---

### Step 5: Create Home Screen Widget

1. Go to your Samsung home screen
2. **Long press** on empty space
3. Tap **"Widgets"**
4. Scroll down to find **"HTTP Request Shortcuts"**
5. **Tap and hold** the widget
6. **Drag** it to your home screen
7. Release it where you want it
8. Select **"Send Heart Rate"** from the list
9. Done! You now have a one-tap widget!

---

## How to Use During Exercise

### Quick Workflow:

1. **Put Polar H10 on your wife** (wet electrodes first)
2. **Open ECGLogger app** on Samsung phone
3. **Connect to Polar H10** in ECGLogger
4. **Start recording ECG data**
5. **Wait for ECG data to show** - you'll see:
   - **Heart Rate**: e.g., 82 BPM
   - **R-R Interval**: e.g., 732 ms (time between beats)
   - **ECG Waveform**: Live graph showing voltage readings
6. **Edit the shortcut:**
   - Open HTTP Request Shortcuts app
   - Tap **"Send ECG Data"**
   - Tap **"Edit"** (pencil icon)
   - Update all three values from ECGLogger display:
     - `"heartRate": 82` (current BPM)
     - `"rrInterval": 732` (current R-R interval in ms)
     - `"ecgValue": 0.5` (current ECG voltage - approximate from waveform)
   - Tap checkmark to save
7. **Tap the home screen widget**
8. **Check ACD-1000 display** - should show full ECG data!
9. **Repeat every 5-10 seconds** during exercise for continuous streaming

---

## Quick Reference Card

**To send full ECG data:**
1. Open ECGLogger → See live ECG data
2. Note the values:
   - Heart Rate: 78 BPM
   - R-R Interval: 769 ms
   - ECG waveform value (approximate from graph)
3. Open HTTP Shortcuts app
4. Edit "Send ECG Data"
5. Update all three values:
   - heartRate: 78
   - rrInterval: 769
   - ecgValue: 0.5 (approx)
6. Save
7. Tap widget
8. Full ECG data appears in ACD-1000!

---

## Troubleshooting

### "Connection Failed" Error

**Check these:**
1. ✅ Is your computer on the same WiFi as your phone?
2. ✅ Is the backend server running? (should show "Server running on port 4000")
3. ✅ Did you use the correct IP: `192.168.0.182`?
4. ✅ Is Windows Firewall blocking port 4000?

**Fix Windows Firewall:**
```
1. Press Windows key
2. Type: "Windows Defender Firewall"
3. Click "Advanced settings"
4. Click "Inbound Rules"
5. Click "New Rule..."
6. Select "Port" → Next
7. Enter "4000" → Next
8. Allow the connection → Next
9. Name it "Heart Rate Dashboard" → Finish
```

---

### "Invalid JSON" Error

**Make sure your request body looks EXACTLY like this:**
```json
{
  "userId": 2,
  "heartRate": 75,
  "rrInterval": 800,
  "ecgValue": 0.5
}
```

**Common mistakes:**
- ❌ Missing quotes around field names ("userId", "heartRate", etc.)
- ❌ Missing comma between fields
- ❌ Extra comma after last field
- ❌ Missing curly braces { }
- ❌ Using letters in numeric fields (heartRate must be a number, not "75")

---

### Heart Rate Not Showing in ACD-1000

**Check:**
1. ✅ Is ACD-1000 display opened? (Click the button on Vitals page)
2. ✅ Is WebSocket connected? (Should show green "Live Connection")
3. ✅ Check browser console (F12) for errors

---

## Advanced: Create Multiple Shortcuts

You can create shortcuts for common heart rates:

**Shortcut 1: "HR 60"**
```json
{"userId": 2, "heartRate": 60}
```

**Shortcut 2: "HR 80"**
```json
{"userId": 2, "heartRate": 80}
```

**Shortcut 3: "HR 100"**
```json
{"userId": 2, "heartRate": 100}
```

Then just tap the closest one!

---

## Next Steps

### After Testing Successfully:

**Option 1: Keep Using This (Manual)**
- Works great for occasional use
- FREE forever
- Simple and reliable

**Option 2: Upgrade to Tasker (Automated)**
- Buy Tasker ($3.49)
- Auto-posts HR from Polar Beat every second
- No manual updates needed
- I'll help you set it up!

**Option 3: Custom Android App**
- Build with MIT App Inventor (30 mins)
- Fully automated
- Custom interface
- FREE

---

## Support

**If you get stuck:**
1. Check troubleshooting section above
2. Check backend logs in terminal
3. Check browser console (F12)
4. Make sure IP address is still 192.168.0.182 (run `ipconfig`)

**Backend logs should show:**
```
[ECG-STREAM] Received from user 2: HR=75 BPM
```

**Browser console should show WebSocket connection:**
```
[WebSocket] Connected
[BLE] Heart Rate: 75 BPM
```

---

## Success! 🎉

Once you see heart rate updating in ACD-1000, you're all set!

Your wife can now do exercise with Polar H10, and you can stream her heart rate to the dashboard in real-time!

---

**Created for**: John & Wife
**Computer IP**: 192.168.0.182
**User ID**: 2
**Endpoint**: /api/ecg/stream
