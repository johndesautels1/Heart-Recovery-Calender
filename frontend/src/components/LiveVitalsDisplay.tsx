import React, { useEffect, useState, useRef } from 'react';
import { Heart, Activity, Wifi, WifiOff, Bluetooth } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, Button } from './ui';

interface LiveVitalsDisplayProps {
  deviceType?: 'samsung' | 'polar' | 'all';
}

export const LiveVitalsDisplay: React.FC<LiveVitalsDisplayProps> = ({ deviceType = 'all' }) => {
  const { isConnected, latestHeartRate, latestVitals, latestECG } = useWebSocket();
  const { user } = useAuth();
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleConnected, setBleConnected] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);

  // HRV metrics state - store R-R intervals for calculation
  const [rrIntervals, setRrIntervals] = useState<number[]>([]);
  const [hrvMetrics, setHrvMetrics] = useState<{
    sdnn?: number;
    rmssd?: number;
    pnn50?: number;
  }>({});

  // ECG waveform state
  const [ecgWaveform, setEcgWaveform] = useState<number[]>([]);
  const [ecgSamplingRate, setEcgSamplingRate] = useState<number>(130); // Polar H10 default: 130 Hz

  // 🫀 CRITICAL: Separate batch accumulator for backend transmission
  const ecgBatchBuffer = useRef<number[]>([]);
  const lastBatchSentTime = useRef<number>(Date.now());

  useEffect(() => {
    if (latestHeartRate?.data) {
      setHeartRate(latestHeartRate.data.heartRate);
      setLastUpdate(new Date(latestHeartRate.timestamp).toLocaleTimeString());
    } else if (latestVitals?.data?.heartRate) {
      setHeartRate(latestVitals.data.heartRate);
      setLastUpdate(new Date(latestVitals.timestamp).toLocaleTimeString());
    }
  }, [latestHeartRate, latestVitals]);

  // Calculate HRV metrics from R-R intervals
  const calculateHRVMetrics = (intervals: number[]) => {
    if (intervals.length < 5) {
      return {}; // Need at least 5 intervals for meaningful HRV
    }

    // SDNN: Standard Deviation of NN intervals
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const squaredDiffs = intervals.map(val => Math.pow(val - mean, 2));
    const sdnn = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / intervals.length);

    // RMSSD: Root Mean Square of Successive Differences
    const successiveDiffs: number[] = [];
    for (let i = 1; i < intervals.length; i++) {
      successiveDiffs.push(intervals[i] - intervals[i - 1]);
    }
    const squaredSuccessiveDiffs = successiveDiffs.map(diff => Math.pow(diff, 2));
    const rmssd = Math.sqrt(squaredSuccessiveDiffs.reduce((sum, val) => sum + val, 0) / successiveDiffs.length);

    // PNN50: Percentage of successive NN intervals that differ by more than 50ms
    const nn50Count = successiveDiffs.filter(diff => Math.abs(diff) > 50).length;
    const pnn50 = (nn50Count / successiveDiffs.length) * 100;

    return {
      sdnn: Math.round(sdnn * 10) / 10, // Round to 1 decimal place
      rmssd: Math.round(rmssd * 10) / 10,
      pnn50: Math.round(pnn50 * 10) / 10,
    };
  };

  // Send ALL vitals to backend - THIS IS CRITICAL FOR SAVING AND BROADCASTING
  const sendVitalsToBackend = async (vitals: {
    heartRate: number;
    rrInterval?: number;
    ecgValue?: number;
    oxygenSaturation?: number;
    sdnn?: number;
    rmssd?: number;
    pnn50?: number;
  }) => {
    try {
      const payload: any = {
        userId: 2, // Your wife's user ID
        heartRate: vitals.heartRate,
        timestamp: new Date().toISOString(),
      };

      // Add optional vitals if available
      if (vitals.rrInterval !== undefined) payload.rrInterval = vitals.rrInterval;
      if (vitals.ecgValue !== undefined) payload.ecgValue = vitals.ecgValue;
      if (vitals.oxygenSaturation !== undefined) payload.oxygenSaturation = vitals.oxygenSaturation;

      // Add HRV metrics if available
      if (vitals.sdnn !== undefined) payload.sdnn = vitals.sdnn;
      if (vitals.rmssd !== undefined) payload.rmssd = vitals.rmssd;
      if (vitals.pnn50 !== undefined) payload.pnn50 = vitals.pnn50;

      const response = await fetch('http://localhost:4000/api/ecg/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[BACKEND] Failed to send vitals:', response.statusText);
      } else {
        const sentData = [`HR=${vitals.heartRate} BPM`];
        if (vitals.rrInterval) sentData.push(`RR=${vitals.rrInterval}ms`);
        if (vitals.ecgValue) sentData.push(`ECG=${vitals.ecgValue}V`);
        if (vitals.oxygenSaturation) sentData.push(`SpO2=${vitals.oxygenSaturation}%`);
        if (vitals.sdnn) sentData.push(`SDNN=${vitals.sdnn}ms`);
        if (vitals.rmssd) sentData.push(`RMSSD=${vitals.rmssd}ms`);
        if (vitals.pnn50) sentData.push(`PNN50=${vitals.pnn50}%`);
        console.log('[BACKEND] Vitals sent successfully:', sentData.join(', '));
      }
    } catch (error) {
      console.error('[BACKEND] Error sending vitals:', error);
    }
  };

  // Web Bluetooth: Connect to Polar H10 directly
  const connectToPolarH10 = async () => {
    try {
      setBleError(null);

      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        setBleError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
        return;
      }

      console.log('[BLE] Requesting Polar H10 device...');

      // Polar PMD (Polar Measurement Data) Service UUIDs
      const PMD_SERVICE = 'fb005c80-02e7-f387-1cad-8acd2d8df0c8';
      const PMD_CONTROL = 'fb005c81-02e7-f387-1cad-8acd2d8df0c8';
      const PMD_DATA = 'fb005c82-02e7-f387-1cad-8acd2d8df0c8';

      // Request Polar H10 device with Heart Rate Service AND PMD Service for ECG
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['heart_rate'] },
          { namePrefix: 'Polar' },
          { namePrefix: 'H10' }
        ],
        optionalServices: [
          'heart_rate',
          'battery_service',
          'device_information',
          PMD_SERVICE  // Add PMD service for ECG streaming
        ]
      });

      console.log('[BLE] Polar H10 device selected:', device.name);
      setBleDevice(device);

      // Connect to GATT server
      const server = await device.gatt!.connect();
      console.log('[BLE] Connected to GATT server');

      // Get Heart Rate service
      const service = await server.getPrimaryService('heart_rate');
      console.log('[BLE] Got Heart Rate service');

      // Get Heart Rate Measurement characteristic
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      console.log('[BLE] Got Heart Rate Measurement characteristic');

      // Start notifications
      await characteristic.startNotifications();
      console.log('[BLE] Notifications started');

      setBleConnected(true);

      // Listen for heart rate updates
      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;

        if (value) {
          // Parse heart rate value according to Bluetooth Heart Rate Measurement spec
          // Byte 0: Flags
          const flags = value.getUint8(0);
          const rate16Bits = flags & 0x1; // Bit 0: Heart Rate Value Format (0 = uint8, 1 = uint16)
          const contactDetected = (flags & 0x6) === 0x6; // Bits 1-2: Sensor Contact Status
          const energyExpendedPresent = (flags & 0x8) !== 0; // Bit 3: Energy Expended Status
          const rrIntervalsPresent = (flags & 0x10) !== 0; // Bit 4: RR-Interval present

          // Parse heart rate (bytes 1-2)
          let offset = 1;
          let heartRateValue: number;
          if (rate16Bits) {
            heartRateValue = value.getUint16(offset, /*littleEndian=*/true);
            offset += 2;
          } else {
            heartRateValue = value.getUint8(offset);
            offset += 1;
          }

          // Skip Energy Expended if present (2 bytes)
          if (energyExpendedPresent) {
            offset += 2;
          }

          // Parse R-R intervals if present (each is 2 bytes, uint16, resolution 1/1024 second)
          let rrInterval: number | undefined;
          if (rrIntervalsPresent && offset < value.byteLength) {
            // R-R intervals are in units of 1/1024 seconds, convert to milliseconds
            const rrValue = value.getUint16(offset, /*littleEndian=*/true);
            rrInterval = Math.round((rrValue / 1024) * 1000); // Convert to milliseconds
            console.log('[BLE] R-R Interval:', rrInterval, 'ms');
          }

          console.log('[BLE] Heart Rate:', heartRateValue, 'BPM', rrInterval ? `| RR: ${rrInterval}ms` : '');

          // Update display
          setHeartRate(heartRateValue);
          setLastUpdate(new Date().toLocaleTimeString());

          // Store R-R interval for HRV calculation
          if (rrInterval !== undefined) {
            setRrIntervals(prev => {
              // Keep last 300 R-R intervals (approximately 5 minutes of data)
              const updated = [...prev, rrInterval];
              if (updated.length > 300) {
                updated.shift(); // Remove oldest
              }

              // Calculate HRV metrics every 30 intervals (approximately every 30 seconds)
              if (updated.length >= 30 && updated.length % 30 === 0) {
                const hrv = calculateHRVMetrics(updated);
                setHrvMetrics(hrv);
                console.log('[HRV] Calculated metrics:', hrv);

                // Send vitals with HRV metrics
                sendVitalsToBackend({
                  heartRate: heartRateValue,
                  rrInterval: rrInterval,
                  sdnn: hrv.sdnn,
                  rmssd: hrv.rmssd,
                  pnn50: hrv.pnn50,
                });
              } else {
                // Send just heart rate and R-R interval
                sendVitalsToBackend({
                  heartRate: heartRateValue,
                  rrInterval: rrInterval,
                });
              }

              return updated;
            });
          } else {
            // No R-R interval available, just send heart rate
            sendVitalsToBackend({
              heartRate: heartRateValue,
            });
          }
        }
      });

      // ========================================
      // POLAR PMD SERVICE - RAW ECG WAVEFORM
      // ========================================
      try {
        console.log('[PMD] Attempting to connect to Polar PMD service for ECG waveform...');

        // Get PMD service
        const pmdService = await server.getPrimaryService(PMD_SERVICE);
        console.log('[PMD] Got PMD service');

        // Get PMD control characteristic (for starting ECG stream)
        const pmdControlChar = await pmdService.getCharacteristic(PMD_CONTROL);
        console.log('[PMD] Got PMD control characteristic');

        // Get PMD data characteristic (for receiving ECG data)
        const pmdDataChar = await pmdService.getCharacteristic(PMD_DATA);
        console.log('[PMD] Got PMD data characteristic');

        // Start notifications on PMD data characteristic BEFORE sending start command
        await pmdDataChar.startNotifications();
        console.log('[PMD] Started notifications on PMD data characteristic');

        // Listen for ECG waveform data
        pmdDataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = target.value;

          if (value && value.byteLength > 10) {
            try {
              // Parse PMD data packet
              // Byte 0: Measurement type (0x00 = ECG)
              const measurementType = value.getUint8(0);

              if (measurementType === 0x00) { // ECG data
                // Byte 1-8: Timestamp (uint64, nanoseconds)
                // Byte 9: Frame type
                // Byte 10+: ECG samples (int16, microvolts)

                const frameType = value.getUint8(9);

                // Parse ECG samples (each sample is 2 bytes, int16, little-endian)
                const ecgSamples: number[] = [];
                for (let i = 10; i < value.byteLength; i += 2) {
                  if (i + 1 < value.byteLength) {
                    // ECG value in microvolts (µV), convert to millivolts (mV)
                    const ecgMicrovolts = value.getInt16(i, /*littleEndian=*/true);
                    const ecgMillivolts = ecgMicrovolts / 1000;
                    ecgSamples.push(ecgMillivolts);
                  }
                }

                if (ecgSamples.length > 0) {
                  console.log(`[PMD] ECG waveform: ${ecgSamples.length} samples, avg=${(ecgSamples.reduce((a,b) => a+b, 0) / ecgSamples.length).toFixed(2)}mV`);

                  // Update ECG waveform display buffer (keep last 1300 samples = 10 seconds at 130Hz)
                  setEcgWaveform(prev => {
                    const updated = [...prev, ...ecgSamples];
                    if (updated.length > 1300) {
                      return updated.slice(updated.length - 1300); // Keep last 10 seconds
                    }
                    return updated;
                  });

                  // 🫀 CRITICAL: Accumulate samples in batch buffer for backend transmission
                  ecgBatchBuffer.current.push(...ecgSamples);

                  // Send batch every 130 samples (approximately 1 second at 130 Hz)
                  // OR every 1 second (whichever comes first)
                  const now = Date.now();
                  const timeSinceLastSend = now - lastBatchSentTime.current;

                  if (ecgBatchBuffer.current.length >= 130 || timeSinceLastSend >= 1000) {
                    const batch = [...ecgBatchBuffer.current]; // Copy the batch
                    ecgBatchBuffer.current = []; // Clear the buffer
                    lastBatchSentTime.current = now;

                    // Send to backend with proper auth
                    fetch('http://localhost:4000/api/ecg/stream', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        userId: user?.id, // 🫀 CRITICAL: Required by backend
                        heartRate: heartRate || 0, // Required field
                        samples: batch, // FULL waveform array
                        samplingRate: 130,
                        timestamp: new Date().toISOString(),
                        deviceId: 'polar_h10_web_bluetooth',
                        source: 'polar_h10_live'
                      })
                    }).then(response => {
                      if (!response.ok) {
                        console.error(`[ECG-STREAM] Failed to send waveform: ${response.status} ${response.statusText}`);
                      } else {
                        console.log(`[ECG-STREAM] ✅ Sent ${batch.length} ECG samples to backend`);
                      }
                    }).catch(error => {
                      console.error('[ECG-STREAM] Error sending waveform:', error);
                    });
                  }
                }
              }
            } catch (parseError: any) {
              console.error('[PMD] Error parsing ECG data:', parseError);
            }
          }
        });

        // Send command to start ECG streaming at 130Hz
        // Command format: [0x02, 0x00, settings...]
        // 0x02 = Start measurement
        // 0x00 = ECG measurement type
        const startEcgCommand = new Uint8Array([
          0x02, // Start measurement
          0x00, // ECG measurement type
          0x00, 0x01, // Settings (bytes 2-3)
          0x82, 0x00, // Sample rate: 130 Hz (bytes 4-5)
          0x01, // Resolution: 14-bit (byte 6)
          0x01, // Range (byte 7)
          0x0E, 0x00  // Channels (bytes 8-9)
        ]);

        await pmdControlChar.writeValue(startEcgCommand);
        console.log('[PMD] ✅ ECG streaming started at 130Hz');
        console.log('[PMD] 🫀 FULL ECG WAVEFORM DATA NOW STREAMING - LIFE CRITICAL MONITORING ACTIVE');

      } catch (pmdError: any) {
        console.warn('[PMD] Could not start ECG streaming:', pmdError.message);
        console.warn('[PMD] Continuing with heart rate only (ECG waveform unavailable)');
        // Don't fail the entire connection - heart rate still works
      }

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        console.log('[BLE] Polar H10 disconnected');
        setBleConnected(false);
      });

    } catch (error: any) {
      console.error('[BLE] Error connecting to Polar H10:', error);
      setBleError(error.message || 'Failed to connect to Polar H10');
      setBleConnected(false);
    }
  };

  // Disconnect from Polar H10
  const disconnectFromPolarH10 = () => {
    if (bleDevice && bleDevice.gatt?.connected) {
      bleDevice.gatt.disconnect();
      setBleConnected(false);
      console.log('[BLE] Disconnected from Polar H10');
    }
  };

  return (
    <GlassCard className="border-2 border-red-500/30">
      <div className="p-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-400" />
                <span className="text-sm text-green-400">Live Connection</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-400">Disconnected</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-400">Last update: {lastUpdate}</span>
          </div>
        </div>

        {/* Bluetooth Connect Button */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {bleConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                <Bluetooth className="h-5 w-5 text-green-400 animate-pulse" />
                <span className="text-sm text-green-400 font-semibold">Polar H10 Connected</span>
              </div>
              <Button
                onClick={disconnectFromPolarH10}
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectToPolarH10}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 flex items-center gap-2"
            >
              <Bluetooth className="h-5 w-5" />
              Connect to Polar H10 (Real Heart Rate)
            </Button>
          )}

          {bleError && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-center">
              <p className="text-sm text-red-400">{bleError}</p>
            </div>
          )}
        </div>

        {/* Live Heart Rate Display */}
        <div className="relative">
          <div className="flex items-center justify-center mb-4">
            <Heart className={`h-16 w-16 text-red-500 ${heartRate ? 'animate-pulse' : ''}`} />
          </div>

          <div className="text-center">
            <div className="text-6xl font-bold text-red-400 mb-2">
              {heartRate !== null ? heartRate : '--'}
            </div>
            <div className="text-xl text-gray-400">BPM</div>
          </div>

          {/* Heart Rate Status */}
          {heartRate !== null && (
            <div className="mt-6 text-center">
              {heartRate < 60 && (
                <span className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                  Bradycardia - Below Normal
                </span>
              )}
              {heartRate >= 60 && heartRate <= 100 && (
                <span className="px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm">
                  Normal Range
                </span>
              )}
              {heartRate > 100 && (
                <span className="px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 text-sm">
                  Tachycardia - Above Normal
                </span>
              )}
            </div>
          )}
        </div>

        {/* ECG Waveform (if available) */}
        {latestECG?.data && (
          <div className="mt-8 p-4 rounded-lg bg-black/30 border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400 font-semibold">ECG Waveform</span>
              <span className="ml-auto text-xs text-gray-500">Real-time</span>
            </div>
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
              {/* Placeholder for future ECG waveform visualization */}
              ECG visualization coming soon
            </div>
          </div>
        )}

        {/* No Data State */}
        {!heartRate && isConnected && (
          <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
            <p className="text-sm text-yellow-400">
              Waiting for device data... Ensure your Samsung Galaxy Watch or Polar H10 is connected and transmitting.
            </p>
          </div>
        )}

        {/* Disconnected State */}
        {!isConnected && (
          <div className="mt-6 p-4 rounded-lg bg-gray-500/10 border border-gray-500/20 text-center">
            <p className="text-sm text-gray-400">
              WebSocket disconnected. Reconnecting...
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
