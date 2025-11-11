/**
 * Check what HRV data we have available for arrhythmia detection
 */

import sequelize from '../models/database';

async function checkHRVData() {
  try {
    const userId = 2;
    console.log('\n💓 CHECKING HRV DATA FOR ARRHYTHMIA DETECTION\n');

    // Check for HRV metrics
    console.log('1. Checking for HRV metrics (SDNN, RMSSD, pNN50)...');
    const [hrvData] = await sequelize.query(`
      SELECT
        COUNT(*) as total_readings,
        COUNT(sdnn) as sdnn_count,
        COUNT(rmssd) as rmssd_count,
        COUNT(pnn50) as pnn50_count,
        COUNT("heartRate") as hr_count,
        COUNT("hrVariability") as hrv_count,
        AVG(sdnn) as avg_sdnn,
        AVG(rmssd) as avg_rmssd,
        AVG(pnn50) as avg_pnn50,
        AVG("heartRate") as avg_hr
      FROM vitals_samples
      WHERE "userId" = :userId
    `, { replacements: { userId } });

    console.log('\nHRV Metrics Summary:');
    console.log(hrvData);

    // Check recent heart rate patterns
    console.log('\n2. Checking recent heart rate patterns...');
    const [recentHR] = await sequelize.query(`
      SELECT
        timestamp,
        "heartRate",
        "hrVariability",
        sdnn,
        rmssd,
        pnn50,
        "bloodPressureSystolic",
        "bloodPressureDiastolic",
        "oxygenSaturation",
        source,
        "deviceId"
      FROM vitals_samples
      WHERE "userId" = :userId
      ORDER BY timestamp DESC
      LIMIT 20
    `, { replacements: { userId } });

    console.log('\nRecent 20 readings:');
    for (const reading of recentHR as any[]) {
      const hrv = reading.hrVariability || reading.sdnn || '-';
      const rmssd = reading.rmssd || '-';
      const pnn50 = reading.pnn50 || '-';
      console.log(`  ${reading.timestamp} | HR: ${reading.heartRate || '-'} | HRV: ${hrv} | RMSSD: ${rmssd} | pNN50: ${pnn50} | Source: ${reading.source}`);
    }

    // Check for irregular heart rate patterns (potential AFib)
    console.log('\n3. Looking for irregular heart rate patterns...');
    const [irregularPatterns] = await sequelize.query(`
      WITH hr_changes AS (
        SELECT
          timestamp,
          "heartRate",
          LAG("heartRate") OVER (ORDER BY timestamp) as prev_hr,
          ABS("heartRate" - LAG("heartRate") OVER (ORDER BY timestamp)) as hr_change
        FROM vitals_samples
        WHERE "userId" = :userId
          AND "heartRate" IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT 100
      )
      SELECT
        COUNT(*) as total_readings,
        AVG(hr_change) as avg_hr_change,
        MAX(hr_change) as max_hr_change,
        STDDEV(hr_change) as stddev_hr_change,
        COUNT(CASE WHEN hr_change > 20 THEN 1 END) as large_changes
      FROM hr_changes
      WHERE prev_hr IS NOT NULL
    `, { replacements: { userId } });

    console.log('\nHeart Rate Variability Patterns:');
    console.log(irregularPatterns);

    // Look for potential arrhythmia indicators
    console.log('\n4. Checking for arrhythmia indicators...');
    const [arrhythmiaIndicators] = await sequelize.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as readings,
        AVG("heartRate") as avg_hr,
        MIN("heartRate") as min_hr,
        MAX("heartRate") as max_hr,
        MAX("heartRate") - MIN("heartRate") as hr_range,
        AVG(sdnn) as avg_sdnn,
        AVG(rmssd) as avg_rmssd,
        AVG(pnn50) as avg_pnn50
      FROM vitals_samples
      WHERE "userId" = :userId
        AND "heartRate" IS NOT NULL
        AND timestamp > NOW() - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `, { replacements: { userId } });

    console.log('\nLast 7 days by date:');
    for (const day of arrhythmiaIndicators as any[]) {
      console.log(`  ${day.date}: ${day.readings} readings, HR ${day.min_hr}-${day.max_hr} (avg ${Math.round(day.avg_hr)}), Range: ${day.hr_range} bpm`);
    }

    console.log('\n✅ Check complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkHRVData();
