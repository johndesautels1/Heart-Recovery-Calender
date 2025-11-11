/**
 * Test the arrhythmia detection service with real data
 */

import sequelize from '../models/database';
import arrhythmiaDetectionService from '../services/arrhythmiaDetectionService';

async function testArrhythmiaDetection() {
  try {
    const userId = 2;
    console.log('\n💓 TESTING ARRHYTHMIA DETECTION SERVICE\n');

    console.log('1. Running arrhythmia detection on recent data...');
    const result = await arrhythmiaDetectionService.detectArrhythmia(userId);

    if (!result || !result.detected) {
      console.log('\n✅ No arrhythmia detected - heart rhythm appears normal');
      console.log('   This is good news! Your Polar H10 data shows stable rhythm.\n');
      return;
    }

    console.log(`\n🚨 ARRHYTHMIA DETECTED: ${result.arrhythmiaType?.toUpperCase()}`);
    console.log(`   Severity: ${result.severity}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`\n   Description: ${result.description}`);
    console.log(`\n   Recommendation: ${result.recommendation}`);

    console.log('\n📊 Metrics:');
    console.log(`   Average Heart Rate: ${result.metrics.avgHeartRate} bpm`);
    console.log(`   Heart Rate Range: ${result.metrics.minHeartRate}-${result.metrics.maxHeartRate} bpm (range: ${result.metrics.heartRateRange} bpm)`);
    console.log(`   Avg Change: ${result.metrics.avgChange} bpm`);
    console.log(`   Max Change: ${result.metrics.maxChange} bpm`);
    console.log(`   Standard Deviation: ${result.metrics.stdDev} bpm`);
    console.log(`   Irregularity Score: ${result.metrics.irregularityScore}`);

    console.log('\n2. Testing full monitoring and alert creation...');
    const alertCreated = await arrhythmiaDetectionService.monitorAndAlertArrhythmia(userId);

    if (alertCreated) {
      console.log('   ✅ Alert created and notifications sent (if applicable)');
    } else {
      console.log('   ℹ️  No alert created (either no arrhythmia or duplicate suppressed)');
    }

    console.log('\n✅ Test complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testArrhythmiaDetection();
