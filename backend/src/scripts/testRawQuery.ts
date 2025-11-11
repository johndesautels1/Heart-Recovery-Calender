/**
 * Test the raw SQL query result structure
 */

import sequelize from '../models/database';
import VitalsSample from '../models/VitalsSample';

async function testRawQuery() {
  try {
    console.log('\n🔍 TESTING RAW SQL QUERY STRUCTURE\n');

    const userId = 2;
    const startDate = new Date('2025-09-12');
    const endDate = new Date('2025-12-11');

    console.log('Running vitals query...\n');

    const rawResult = await VitalsSample.sequelize!.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as sample_count,
        AVG("heartRate") as avg_heart_rate,
        MIN("heartRate") as min_heart_rate,
        MAX("heartRate") as max_heart_rate
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    console.log('RAW RESULT TYPE:', typeof rawResult);
    console.log('RAW RESULT IS ARRAY:', Array.isArray(rawResult));
    console.log('RAW RESULT LENGTH:', Array.isArray(rawResult) ? rawResult.length : 'N/A');
    console.log('\nRAW RESULT FULL:');
    console.log(JSON.stringify(rawResult, null, 2));

    console.log('\n---\n');

    const [dailySummaries = []] = await VitalsSample.sequelize!.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as sample_count,
        AVG("heartRate") as avg_heart_rate
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    console.log('DESTRUCTURED RESULT TYPE:', typeof dailySummaries);
    console.log('DESTRUCTURED RESULT IS ARRAY:', Array.isArray(dailySummaries));
    console.log('DESTRUCTURED RESULT LENGTH:', Array.isArray(dailySummaries) ? dailySummaries.length : 'N/A');
    console.log('\nDESTRUCTURED RESULT FULL:');
    console.log(JSON.stringify(dailySummaries, null, 2));

    console.log('\n✅ Test complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testRawQuery();
