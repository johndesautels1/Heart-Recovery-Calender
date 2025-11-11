/**
 * Test different approaches to fix the BETWEEN issue
 */

import sequelize from '../models/database';

async function testCastApproaches() {
  try {
    console.log('🧪 Testing Different Cast Approaches\n');

    const userId = 2;
    const startDate = new Date('2025-09-18T00:00:00.000Z');
    const endDate = new Date('2025-12-17T01:00:00.000Z');

    console.log('Start date object:', startDate);
    console.log('End date object:', endDate);
    console.log('');

    // Approach 1: Date objects instead of strings
    console.log('1️⃣  Using Date objects:');
    const [result1] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });
    console.log('   Result:', result1);

    // Approach 2: AT TIME ZONE
    console.log('\n2️⃣  Using AT TIME ZONE:');
    const [result2] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp AT TIME ZONE 'UTC' BETWEEN (:startDate AT TIME ZONE 'UTC') AND (:endDate AT TIME ZONE 'UTC')
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });
    console.log('   Result:', result2);

    // Approach 3: >= and <= instead of BETWEEN
    console.log('\n3️⃣  Using >= and <= :');
    const [result3] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp >= :startDate
        AND timestamp <= :endDate
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });
    console.log('   Result:', result3);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testCastApproaches();
