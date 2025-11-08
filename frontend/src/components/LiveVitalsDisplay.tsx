import React, { useEffect, useState } from 'react';
import { Heart, Activity, Wifi, WifiOff, Bluetooth } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { GlassCard, Button } from './ui';

interface LiveVitalsDisplayProps {
  deviceType?: 'samsung' | 'polar' | 'all';
}

export const LiveVitalsDisplay: React.FC<LiveVitalsDisplayProps> = ({ deviceType = 'all' }) => {
  const { isConnected, latestHeartRate, latestVitals, latestECG } = useWebSocket();
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleConnected, setBleConnected] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);

  useEffect(() => {
    if (latestHeartRate?.data) {
      setHeartRate(latestHeartRate.data.heartRate);
      setLastUpdate(new Date(latestHeartRate.timestamp).toLocaleTimeString());
    } else if (latestVitals?.data?.heartRate) {
      setHeartRate(latestVitals.data.heartRate);
      setLastUpdate(new Date(latestVitals.timestamp).toLocaleTimeString());
    }
  }, [latestHeartRate, latestVitals]);

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

      // Request Polar H10 device with Heart Rate Service
      // Accept ANY Bluetooth device with heart rate service (not just Polar)
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['heart_rate'] },
          { namePrefix: 'Polar' },
          { namePrefix: 'H10' }
        ],
        optionalServices: ['heart_rate', 'battery_service', 'device_information']
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
          // Parse heart rate value
          // First byte contains flags
          const flags = value.getUint8(0);
          const rate16Bits = flags & 0x1; // Check if heart rate is 16-bit

          let heartRateValue: number;
          if (rate16Bits) {
            heartRateValue = value.getUint16(1, /*littleEndian=*/true);
          } else {
            heartRateValue = value.getUint8(1);
          }

          console.log('[BLE] Heart Rate:', heartRateValue, 'BPM');

          // Update display
          setHeartRate(heartRateValue);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      });

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
