import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { Readable } from 'stream';
import VitalsSample from '../models/VitalsSample';
import ECGSample from '../models/ECGSample';
import { broadcastECGData, broadcastHeartRate } from '../services/websocketService';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Upload ECGLogger CSV file
// POST /api/ecg/upload
router.post('/upload', authenticateToken, upload.single('ecgFile'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[ECG-UPLOAD] Processing ECGLogger file: ${req.file.originalname} (${req.file.size} bytes)`);

    const results: any[] = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`[ECG-UPLOAD] Parsed ${results.length} rows from CSV`);

    let recordsCreated = 0;
    let recordsSkipped = 0;

    // Process each row
    for (const row of results) {
      try {
        // ECGLogger CSV format detection
        // Common columns: timestamp, hr, rr_interval, ecg_value
        const timestamp = row.timestamp || row.time || row.datetime;
        const heartRate = parseFloat(row.hr || row.heart_rate || row.heartrate);
        const rrInterval = parseFloat(row.rr || row.rr_interval);
        const ecgValue = parseFloat(row.ecg || row.ecg_value);

        if (!timestamp) {
          recordsSkipped++;
          continue;
        }

        // Create VitalsSample record
        if (heartRate && !isNaN(heartRate)) {
          // Check if already exists
          const existing = await VitalsSample.findOne({
            where: {
              userId,
              timestamp: new Date(timestamp),
              source: 'device'
            }
          });

          if (!existing) {
            await VitalsSample.create({
              userId,
              timestamp: new Date(timestamp),
              heartRate,
              heartRateVariability: rrInterval && !isNaN(rrInterval) ? rrInterval : undefined,
              source: 'device',
              deviceId: 'polar_h10_ecglogger',
              notes: 'Imported from ECGLogger app',
              medicationsTaken: false
            });

            recordsCreated++;

            // Broadcast to WebSocket for real-time display
            broadcastHeartRate(userId, {
              heartRate,
              timestamp,
              source: 'ecglogger',
              device: 'Polar H10 (ECGLogger)'
            });

            // If ECG waveform data exists, broadcast it
            if (ecgValue && !isNaN(ecgValue)) {
              broadcastECGData(userId, {
                timestamp,
                value: ecgValue,
                heartRate,
                rrInterval
              });
            }
          } else {
            recordsSkipped++;
          }
        }
      } catch (error: any) {
        console.error('[ECG-UPLOAD] Error processing row:', error);
        recordsSkipped++;
      }
    }

    console.log(`[ECG-UPLOAD] Import complete: ${recordsCreated} created, ${recordsSkipped} skipped`);

    res.json({
      success: true,
      recordsCreated,
      recordsSkipped,
      totalRows: results.length
    });

  } catch (error: any) {
    console.error('[ECG-UPLOAD] Error uploading ECG file:', error);
    res.status(500).json({ error: 'Failed to process ECG file' });
  }
});

// Real-time ECG streaming from ECGLogger app
// POST /api/ecg/stream
// Body: { userId: number, heartRate: number, rrInterval?: number, ecgValue?: number, sdnn?: number, rmssd?: number, pnn50?: number, timestamp?: string }
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { userId, heartRate, rrInterval, ecgValue, ecgWaveform, samplingRate, sessionId, sdnn, rmssd, pnn50, timestamp } = req.body;

    if (!userId || !heartRate) {
      return res.status(400).json({ error: 'userId and heartRate are required' });
    }

    // Validate heart rate
    if (heartRate < 30 || heartRate > 250) {
      return res.status(400).json({ error: 'Heart rate must be between 30-250 BPM' });
    }

    const logParts = [`HR=${heartRate} BPM`];
    if (rrInterval !== undefined && !isNaN(rrInterval)) logParts.push(`RR=${rrInterval}ms`);
    if (ecgValue !== undefined && !isNaN(ecgValue)) logParts.push(`ECG=${ecgValue}`);
    if (ecgWaveform && Array.isArray(ecgWaveform)) logParts.push(`Waveform=${ecgWaveform.length} samples`);
    if (sdnn !== undefined) logParts.push(`SDNN=${sdnn}ms`);
    if (rmssd !== undefined) logParts.push(`RMSSD=${rmssd}ms`);
    if (pnn50 !== undefined) logParts.push(`PNN50=${pnn50}%`);

    console.log(`[ECG-STREAM] Received from user ${userId}: ${logParts.join(', ')}`);

    // SAVE TO DATABASE - This is critical for data history!
    let savedVitalsSample: any = null;
    try {
      const vitalData: any = {
        userId,
        timestamp: timestamp || new Date().toISOString(),
        heartRate,
        source: 'device',
        deviceId: 'polar_h10_bluetooth',
        medicationsTaken: false,
      };

      // Add R-R interval if provided (stored as heartRateVariability)
      if (rrInterval !== undefined && rrInterval !== null && !isNaN(rrInterval)) {
        vitalData.heartRateVariability = rrInterval;
      }

      // Add HRV metrics if provided
      if (sdnn !== undefined && sdnn !== null && !isNaN(sdnn)) {
        vitalData.sdnn = sdnn;
      }
      if (rmssd !== undefined && rmssd !== null && !isNaN(rmssd)) {
        vitalData.rmssd = rmssd;
      }
      if (pnn50 !== undefined && pnn50 !== null && !isNaN(pnn50)) {
        vitalData.pnn50 = pnn50;
      }

      // Add ECG waveform value if provided (store in notes for backward compatibility)
      if (ecgValue !== undefined && ecgValue !== null && !isNaN(ecgValue)) {
        vitalData.notes = `ECG waveform value: ${ecgValue}V`;
      }

      savedVitalsSample = await VitalsSample.create(vitalData);

      const savedFields = [`HR=${heartRate} BPM`];
      if (rrInterval !== undefined && !isNaN(rrInterval)) savedFields.push(`RR=${rrInterval}ms`);
      if (ecgValue !== undefined && !isNaN(ecgValue)) savedFields.push(`ECG=${ecgValue}V`);
      if (sdnn !== undefined) savedFields.push(`SDNN=${sdnn}ms`);
      if (rmssd !== undefined) savedFields.push(`RMSSD=${rmssd}ms`);
      if (pnn50 !== undefined) savedFields.push(`PNN50=${pnn50}%`);

      console.log(`[ECG-STREAM] ✅ Saved to database: ${savedFields.join(', ')} for user ${userId}`);
    } catch (dbError: any) {
      console.error('[ECG-STREAM] ❌ Failed to save to database:', dbError.message);
      // Continue with broadcast even if database save fails
    }

    // SAVE ECG WAVEFORM SAMPLES TO DEDICATED TABLE
    if (ecgWaveform && Array.isArray(ecgWaveform) && ecgWaveform.length > 0) {
      try {
        const waveformSamplingRate = samplingRate || 130; // Default to 130 Hz for Polar H10
        const baseTimestamp = new Date(timestamp || Date.now());
        const msPerSample = 1000 / waveformSamplingRate;
        const deviceIdStr = 'polar_h10_bluetooth';
        const sessionIdStr = sessionId || `session_${userId}_${Date.now()}`;

        // Create ECG sample records for each waveform point
        const ecgSamplePromises = ecgWaveform.map(async (voltage: number, index: number) => {
          const sampleTimestamp = new Date(baseTimestamp.getTime() + (index * msPerSample));

          return ECGSample.create({
            userId,
            vitalsSampleId: savedVitalsSample?.id || null,
            timestamp: sampleTimestamp,
            sampleIndex: index,
            voltage: voltage,
            samplingRate: waveformSamplingRate,
            leadType: 'Lead I', // Polar H10 uses Lead I
            deviceId: deviceIdStr,
            sessionId: sessionIdStr,
            rPeak: false, // R-peak detection would be done in post-processing
          });
        });

        await Promise.all(ecgSamplePromises);

        console.log(`[ECG-STREAM] ✅ Saved ${ecgWaveform.length} ECG waveform samples to dedicated table for user ${userId}`);
      } catch (waveformError: any) {
        console.error('[ECG-STREAM] ❌ Failed to save ECG waveform samples:', waveformError.message);
        // Continue even if waveform save fails
      }
    }

    // Broadcast to WebSocket - This updates all live displays
    broadcastHeartRate(userId, {
      heartRate,
      timestamp: timestamp || new Date().toISOString(),
      source: 'ecglogger',
      device: 'Polar H10 (ECGLogger)',
      rrInterval
    });

    // Broadcast ECG waveform if available
    if (ecgValue !== undefined && ecgValue !== null) {
      broadcastECGData(userId, {
        timestamp: timestamp || new Date().toISOString(),
        value: ecgValue,
        heartRate,
        rrInterval
      });
    }

    res.json({ success: true, message: 'ECG data saved and broadcasted' });

  } catch (error: any) {
    console.error('[ECG-STREAM] Error streaming ECG:', error);
    res.status(500).json({ error: 'Failed to stream ECG data' });
  }
});

// Get ECG history for a user
// GET /api/ecg/history?startDate=2025-01-01&endDate=2025-01-31
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate } = req.query;

    const whereClause: any = {
      userId,
      deviceId: 'polar_h10_ecglogger'
    };

    if (startDate && endDate) {
      whereClause.timestamp = {
        [require('sequelize').Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }

    const records = await VitalsSample.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: 1000
    });

    res.json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (error: any) {
    console.error('[ECG-HISTORY] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch ECG history' });
  }
});

export default router;
