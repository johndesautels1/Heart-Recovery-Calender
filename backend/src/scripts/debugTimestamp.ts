/**
 * Debug: Check timestamp comparison issue
 */

import sequelize from '../models/database';

async function debugTimestamp() {
  try {
    console.log('🔍 Debugging Timestamp BETWEEN Issue\n');

    const userId = 2;
    const startDate = '2025-09-18T00:00:00.000Z';
    const endDate = '2025-12-17T01:00:00.000Z';

    // Check timestamp column type
    const [typeResult] = await sequelize.query(`
      SELECT pg_typeof(timestamp) as column_type
      FROM vitals_samples
      WHERE "userId" = 2
      LIMIT 1
    `, { type: 'SELECT' as any });
    console.log('Column type:', typeResult);

    // Get a sample timestamp
    const [sampleResult] = await sequelize.query(`
      SELECT timestamp,
             timestamp::text as timestamp_text
      FROM vitals_samples
      WHERE "userId" = 2
      ORDER BY timestamp DESC
      LIMIT 3
    `, { type: 'SELECT' as any });
    console.log('\nSample timestamps:', JSON.stringify(sampleResult, null, 2));

    // Test comparison with literal strings
    const [comparisonResult] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        COUNT(*) FILTER (WHERE timestamp >= '2025-09-18T00:00:00.000Z'::timestamptz) as after_start,
        COUNT(*) FILTER (WHERE timestamp <= '2025-12-17T01:00:00.000Z'::timestamptz) as before_end,
        COUNT(*) FILTER (WHERE timestamp BETWEEN '2025-09-18T00:00:00.000Z'::timestamptz AND '2025-12-17T01:00:00.000Z'::timestamptz) as in_range
      FROM vitals_samples
      WHERE "userId" = 2
    `, { type: 'SELECT' as any });
    console.log('\nComparison results:', JSON.stringify(comparisonResult, null, 2));

    // Test with parameter binding
    const [paramResult] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });
    console.log('\nWith parameter binding (::timestamptz cast):', paramResult);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

debugTimestamp();
