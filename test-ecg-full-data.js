/**
 * Test script for FULL ECG data streaming endpoint
 *
 * Tests: POST /api/ecg/stream
 *
 * This sends the complete ECG data payload including:
 * - Heart Rate (BPM)
 * - R-R Interval (milliseconds between beats)
 * - ECG Waveform Value (voltage reading)
 *
 * Usage:
 * node test-ecg-full-data.js
 */

const http = require('http');

// Configuration
const HOST = '192.168.0.182';  // Your computer's IP
const PORT = 4000;
const USER_ID = 2;             // Your wife's user ID

// Sample ECG data (what ECGLogger would send)
const ecgData = {
  userId: USER_ID,
  heartRate: 82,        // Heart rate in BPM
  rrInterval: 732,      // R-R interval in milliseconds
  ecgValue: 0.5,        // ECG waveform voltage value
  timestamp: new Date().toISOString()
};

// Prepare POST request
const postData = JSON.stringify(ecgData);

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/ecg/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('========================================');
console.log('TESTING FULL ECG DATA STREAMING');
console.log('========================================');
console.log('Endpoint:', `http://${HOST}:${PORT}/api/ecg/stream`);
console.log('');
console.log('Sending FULL ECG data:');
console.log('  - Heart Rate:', ecgData.heartRate, 'BPM');
console.log('  - R-R Interval:', ecgData.rrInterval, 'ms');
console.log('  - ECG Value:', ecgData.ecgValue, 'V');
console.log('  - Timestamp:', ecgData.timestamp);
console.log('');
console.log('Sending request...');
console.log('');

// Send request
const req = http.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('========================================');
    console.log('RESPONSE RECEIVED');
    console.log('========================================');
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', responseBody);
    console.log('');

    if (res.statusCode === 200) {
      console.log('✅ SUCCESS! Full ECG data sent to ACD-1000!');
      console.log('');
      console.log('Now check:');
      console.log('1. Go to http://localhost:3000');
      console.log('2. Open Vitals page');
      console.log('3. Look at ACD-1000 display');
      console.log('4. You should see:');
      console.log('   - Heart Rate: 82 BPM');
      console.log('   - R-R Interval: 732 ms');
      console.log('   - ECG waveform data');
    } else {
      console.log('❌ FAILED! Status code:', res.statusCode);
      console.log('Response:', responseBody);
    }
    console.log('========================================');
  });
});

req.on('error', (error) => {
  console.error('========================================');
  console.error('❌ REQUEST FAILED');
  console.error('========================================');
  console.error('Error:', error.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('1. Is backend running? (npm run dev in backend folder)');
  console.error('2. Is IP correct?', HOST);
  console.error('3. Is port 4000 open in firewall?');
  console.error('========================================');
});

// Write request body and close
req.write(postData);
req.end();
