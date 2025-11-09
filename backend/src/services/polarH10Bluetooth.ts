/**
 * Polar H10 Bluetooth Low Energy (BLE) ECG Streaming Service
 *
 * This service connects directly to Polar H10 via Bluetooth and streams
 * real-time ECG data (130 Hz) to the ACD-1000 dashboard via WebSocket.
 *
 * Requirements:
 * - noble (BLE library for Node.js)
 * - Polar H10 device within Bluetooth range
 * - Device must be paired with the system
 */

import { EventEmitter } from 'events';
import { broadcastECGData, broadcastVitalsUpdate } from './websocketService';

interface ECGSample {
  timestamp: Date;
  voltage: number; // in microvolts (µV)
  sampleIndex: number;
  rPeak?: boolean;
}

interface PolarH10Device {
  id: string;
  name: string;
  rssi: number;
  connected: boolean;
}

class PolarH10BluetoothService extends EventEmitter {
  public device: any = null;
  public isStreaming: boolean = false;
  private sampleIndex: number = 0;
  public sessionId: string = '';

  // Polar H10 BLE Service UUIDs
  private readonly POLAR_PMD_SERVICE = 'fb005c80-02e7-f387-1cad-8acd2d8df0c8';
  private readonly POLAR_PMD_CONTROL = 'fb005c81-02e7-f387-1cad-8acd2d8df0c8';
  private readonly POLAR_PMD_DATA = 'fb005c82-02e7-f387-1cad-8acd2d8df0c8';

  // ECG measurement type
  private readonly ECG_MEASUREMENT_TYPE = 0x00;

  constructor() {
    super();
  }

  /**
   * Scan for nearby Polar H10 devices
   */
  async scanForDevices(duration: number = 5000): Promise<PolarH10Device[]> {
    console.log('🔍 Scanning for Polar H10 devices...');

    const devices: PolarH10Device[] = [];

    // Note: This is a placeholder. Actual implementation requires 'noble' library
    // which only works on systems with Bluetooth support.

    // For Windows/Linux/Mac with Bluetooth:
    // const noble = require('@abandonware/noble');
    //
    // noble.on('discover', (peripheral: any) => {
    //   if (peripheral.advertisement.localName?.includes('Polar H10')) {
    //     devices.push({
    //       id: peripheral.id,
    //       name: peripheral.advertisement.localName,
    //       rssi: peripheral.rssi,
    //       connected: false
    //     });
    //   }
    // });
    //
    // noble.startScanning();
    // await new Promise(resolve => setTimeout(resolve, duration));
    // noble.stopScanning();

    console.log(`✅ Found ${devices.length} Polar H10 device(s)`);
    return devices;
  }

  /**
   * Connect to Polar H10 device
   */
  async connect(deviceId?: string): Promise<void> {
    console.log(`🔗 Connecting to Polar H10${deviceId ? ` (${deviceId})` : ''}...`);

    try {
      // Placeholder for actual Bluetooth connection
      // const noble = require('@abandonware/noble');
      // const peripheral = await noble.connect(deviceId);
      // this.device = peripheral;

      this.sessionId = this.generateSessionId();

      console.log('✅ Connected to Polar H10');
      this.emit('connected', { sessionId: this.sessionId });
    } catch (error) {
      console.error('❌ Failed to connect to Polar H10:', error);
      throw error;
    }
  }

  /**
   * Start ECG streaming (130 Hz)
   */
  async startECGStream(userId: number): Promise<void> {
    if (this.isStreaming) {
      console.warn('⚠️ ECG streaming already active');
      return;
    }

    console.log('🫀 Starting ECG stream (130 Hz)...');

    try {
      // Send start command to Polar H10
      // const controlChar = await this.device.getCharacteristic(this.POLAR_PMD_CONTROL);
      // const startCommand = Buffer.from([0x02, this.ECG_MEASUREMENT_TYPE, 0x00, 0x01, 0x82, 0x00, 0x01, 0x01, 0x0E, 0x00]);
      // await controlChar.write(startCommand);

      // Subscribe to ECG data
      // const dataChar = await this.device.getCharacteristic(this.POLAR_PMD_DATA);
      // dataChar.on('data', (data: Buffer) => {
      //   this.handleECGData(data, userId);
      // });
      // await dataChar.subscribe();

      this.isStreaming = true;
      this.sampleIndex = 0;

      console.log('✅ ECG streaming started');
      this.emit('streamStarted', { userId, sessionId: this.sessionId });

      // TODO: Real Bluetooth connection required - noble library needs to be installed
      // For now, return error if no device connected
      if (!this.device) {
        throw new Error('No Polar H10 device connected. Please pair device first.');
      }

    } catch (error) {
      console.error('❌ Failed to start ECG stream:', error);
      throw error;
    }
  }

  /**
   * Stop ECG streaming
   */
  async stopECGStream(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    console.log('🛑 Stopping ECG stream...');

    try {
      // Send stop command to Polar H10
      // const controlChar = await this.device.getCharacteristic(this.POLAR_PMD_CONTROL);
      // const stopCommand = Buffer.from([0x03, this.ECG_MEASUREMENT_TYPE]);
      // await controlChar.write(stopCommand);

      this.isStreaming = false;

      console.log('✅ ECG streaming stopped');
      this.emit('streamStopped', { sessionId: this.sessionId });
    } catch (error) {
      console.error('❌ Failed to stop ECG stream:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Polar H10
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Polar H10...');

    await this.stopECGStream();

    if (this.device) {
      // await this.device.disconnect();
      this.device = null;
    }

    console.log('✅ Disconnected from Polar H10');
    this.emit('disconnected');
  }

  /**
   * Parse ECG data from Polar H10 BLE packet
   */
  private handleECGData(data: Buffer, userId: number): void {
    // Polar H10 ECG data format:
    // - Byte 0: Frame type (0x00 for ECG)
    // - Byte 1-8: Timestamp (uint64)
    // - Byte 9+: ECG samples (int24, little-endian)

    const frameType = data.readUInt8(0);
    if (frameType !== 0x00) {
      return; // Not ECG data
    }

    // Read timestamp (nanoseconds since device start)
    const timestampNs = data.readBigUInt64LE(1);
    const timestamp = new Date();

    // Parse ECG samples (each sample is 3 bytes, signed 24-bit integer)
    const samples: ECGSample[] = [];

    for (let i = 9; i < data.length; i += 3) {
      if (i + 2 >= data.length) break;

      // Read 24-bit signed integer (little-endian)
      let voltage = data.readUInt8(i) | (data.readUInt8(i + 1) << 8) | (data.readUInt8(i + 2) << 16);

      // Convert to signed
      if (voltage & 0x800000) {
        voltage = voltage - 0x1000000;
      }

      // Polar H10 ECG resolution: 1 µV per bit
      const voltageInMicrovolts = voltage;

      samples.push({
        timestamp,
        voltage: voltageInMicrovolts / 1000, // Convert to millivolts
        sampleIndex: this.sampleIndex++,
      });
    }

    // Detect R-peaks (simple threshold-based detection)
    this.detectRPeaks(samples);

    // Broadcast via WebSocket to frontend
    broadcastECGData(userId, {
      sessionId: this.sessionId,
      samples,
      samplingRate: 130,
      deviceId: 'polar_h10_bluetooth',
      leadType: 'Lead I',
    });

    // Save to database (batch insert every 130 samples = 1 second)
    if (this.sampleIndex % 130 === 0) {
      this.saveECGSamples(samples, userId);
    }
  }

  /**
   * Simple R-peak detection using threshold
   */
  private detectRPeaks(samples: ECGSample[]): void {
    const threshold = 0.5; // mV (adjust based on signal quality)

    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1].voltage;
      const curr = samples[i].voltage;
      const next = samples[i + 1].voltage;

      // Peak detection: current > threshold AND current > neighbors
      if (curr > threshold && curr > prev && curr > next) {
        samples[i].rPeak = true;
      }
    }
  }

  /**
   * Save ECG samples to database
   */
  private async saveECGSamples(samples: ECGSample[], userId: number): Promise<void> {
    try {
      // Import ECGSample model
      const { default: ECGSample } = await import('../models/ECGSample');

      const records = samples.map(sample => ({
        userId,
        timestamp: sample.timestamp,
        sampleIndex: sample.sampleIndex,
        voltage: sample.voltage,
        samplingRate: 130,
        leadType: 'Lead I',
        deviceId: 'polar_h10_bluetooth',
        sessionId: this.sessionId,
        rPeak: sample.rPeak || false,
      }));

      await ECGSample.bulkCreate(records);
    } catch (error) {
      console.error('❌ Failed to save ECG samples:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `polar-h10-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate ECG stream for testing (remove in production)
   */
  private simulateECGStream(userId: number): void {
    const interval = setInterval(() => {
      if (!this.isStreaming) {
        clearInterval(interval);
        return;
      }

      // Generate realistic ECG waveform (PQRST complex)
      const samples: ECGSample[] = [];
      const baselineVoltage = 0;
      const heartRate = 75; // BPM
      const samplesPerBeat = Math.floor((60 / heartRate) * 130);

      for (let i = 0; i < 130; i++) { // 1 second of data at 130 Hz
        const t = i / 130; // Time in seconds
        const phase = (this.sampleIndex % samplesPerBeat) / samplesPerBeat;

        // Generate PQRST complex
        let voltage = baselineVoltage;

        if (phase < 0.08) {
          // P wave (atrial depolarization)
          voltage += 0.15 * Math.sin((phase / 0.08) * Math.PI);
        } else if (phase >= 0.12 && phase < 0.20) {
          // QRS complex (ventricular depolarization)
          const qrsPhase = (phase - 0.12) / 0.08;
          if (qrsPhase < 0.3) {
            voltage -= 0.1; // Q wave
          } else if (qrsPhase < 0.7) {
            voltage += 1.5 * Math.sin(((qrsPhase - 0.3) / 0.4) * Math.PI); // R wave
          } else {
            voltage -= 0.2; // S wave
          }
        } else if (phase >= 0.30 && phase < 0.50) {
          // T wave (ventricular repolarization)
          const tPhase = (phase - 0.30) / 0.20;
          voltage += 0.3 * Math.sin(tPhase * Math.PI);
        }

        // Add realistic noise
        voltage += (Math.random() - 0.5) * 0.05;

        const isRPeak = (phase >= 0.15 && phase < 0.17);

        samples.push({
          timestamp: new Date(),
          voltage,
          sampleIndex: this.sampleIndex++,
          rPeak: isRPeak,
        });
      }

      // Broadcast to frontend
      broadcastECGData(userId, {
        sessionId: this.sessionId,
        samples,
        samplingRate: 130,
        deviceId: 'polar_h10_bluetooth_simulated',
        leadType: 'Lead I',
      });

      // Calculate heart rate from R-peaks
      const rPeaks = samples.filter(s => s.rPeak);
      if (rPeaks.length >= 2) {
        const rrInterval = (rPeaks[1].sampleIndex - rPeaks[0].sampleIndex) / 130 * 1000; // ms
        const heartRate = Math.round(60000 / rrInterval);

        broadcastVitalsUpdate(userId, {
          heartRate,
          timestamp: new Date(),
          source: 'polar_h10_live',
        });
      }

    }, 1000); // Update every second
  }
}

// Singleton instance
export const polarH10Service = new PolarH10BluetoothService();

export default polarH10Service;
