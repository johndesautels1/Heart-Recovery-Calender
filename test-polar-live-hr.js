// Test script for real-time Polar H10 heart rate streaming
// Simulates Samsung phone sending Bluetooth heart rate data to the backend

const http = require('http');

// Your user ID (from the logged-in session)
const USER_ID = 2;

// Simulate heart rate readings
const heartRates = [72, 75, 78, 82, 85, 88, 90, 87, 84, 80];
let currentIndex = 0;

function sendHeartRate() {
  const heartRate = heartRates[currentIndex % heartRates.length];
  currentIndex++;

  const postData = JSON.stringify({
    userId: USER_ID,
    heartRate: heartRate,
    timestamp: new Date().toISOString()
  });

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/polar/live-hr',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Sent HR: ${heartRate} BPM - Status: ${res.statusCode}`);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (responseData) {
        console.log('   Response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req.write(postData);
  req.end();
}

console.log('🫀 Starting Polar H10 real-time heart rate test...');
console.log('📱 Simulating heart rate readings every 2 seconds');
console.log('🎯 Open http://localhost:3000 -> Vitals -> Click ACD-1000 button');
console.log('💓 You should see live heart rate updating!\n');

// Send initial reading
sendHeartRate();

// Send heart rate every 2 seconds (simulating real-time monitoring)
const interval = setInterval(sendHeartRate, 2000);

// Stop after 30 seconds
setTimeout(() => {
  clearInterval(interval);
  console.log('\n✅ Test complete! Heart rate streaming stopped.');
  console.log('💡 To continue streaming, run this script again.');
}, 30000);
