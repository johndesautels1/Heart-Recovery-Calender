import sequelize from '../models/database';
import VitalsSample from '../models/VitalsSample';
import { Op } from 'sequelize';

async function checkTestWarnings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const userId = 2;

    // Check for weight data triggering warnings
    console.log('🔍 Checking for Weight Data (last 7 days):');
    console.log('============================================');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weightData = await VitalsSample.findAll({
      where: {
        userId,
        weight: { [Op.not]: null },
        timestamp: { [Op.gte]: sevenDaysAgo }
      },
      order: [['timestamp', 'DESC']]
    });

    if (weightData.length > 0) {
      console.log(`Found ${weightData.length} weight entries:\n`);
      for (const entry of weightData) {
        console.log(`   ID: ${entry.id}`);
        console.log(`   Timestamp: ${entry.timestamp}`);
        console.log(`   Weight: ${entry.weight} lbs`);
        console.log(`   Notes: ${entry.notes || 'N/A'}`);
        console.log(`   Source: ${entry.source || 'N/A'}\n`);
      }
    } else {
      console.log('No weight data found in last 7 days\n');
    }

    // Check for blood sugar data triggering warnings
    console.log('\n🔍 Checking for Blood Sugar Data (last 3 days):');
    console.log('================================================');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const glucoseData = await VitalsSample.findAll({
      where: {
        userId,
        bloodSugar: { [Op.not]: null },
        timestamp: { [Op.gte]: threeDaysAgo }
      },
      order: [['timestamp', 'DESC']]
    });

    if (glucoseData.length > 0) {
      console.log(`Found ${glucoseData.length} blood sugar entries:\n`);
      for (const entry of glucoseData) {
        console.log(`   ID: ${entry.id}`);
        console.log(`   Timestamp: ${entry.timestamp}`);
        console.log(`   Blood Sugar: ${entry.bloodSugar} mg/dL`);
        console.log(`   Notes: ${entry.notes || 'N/A'}`);
        console.log(`   Source: ${entry.source || 'N/A'}`);
        if (entry.bloodSugar && entry.bloodSugar > 140) {
          console.log(`   ⚠️  HIGH - Above 140 threshold!`);
        }
        console.log('');
      }
    } else {
      console.log('No blood sugar data found in last 3 days\n');
    }

    // Check for edema data triggering warnings
    console.log('\n🔍 Checking for Edema Data (last 3 days):');
    console.log('==========================================');
    const edemaData = await VitalsSample.findAll({
      where: {
        userId,
        edema: { [Op.not]: null },
        timestamp: { [Op.gte]: threeDaysAgo }
      },
      order: [['timestamp', 'DESC']]
    });

    if (edemaData.length > 0) {
      console.log(`Found ${edemaData.length} edema entries:\n`);
      for (const entry of edemaData) {
        console.log(`   ID: ${entry.id}`);
        console.log(`   Timestamp: ${entry.timestamp}`);
        console.log(`   Edema Location: ${entry.edema}`);
        console.log(`   Severity: ${entry.edemaSeverity || 'N/A'}`);
        console.log(`   Notes: ${entry.notes || 'N/A'}\n`);
      }
    } else {
      console.log('No edema data found in last 3 days\n');
    }

    // List ALL vitals for user
    console.log('\n📋 All Vitals Data for User 2:');
    console.log('================================');
    const allVitals = await VitalsSample.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']]
    });

    console.log(`Total vitals entries: ${allVitals.length}\n`);
    for (const vital of allVitals) {
      const fields = [];
      if (vital.heartRate) fields.push(`HR: ${vital.heartRate}`);
      if (vital.weight) fields.push(`Weight: ${vital.weight}`);
      if (vital.bloodSugar) fields.push(`BS: ${vital.bloodSugar}`);
      if (vital.bloodPressureSystolic) fields.push(`BP: ${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`);

      console.log(`   ID: ${vital.id} | ${vital.timestamp.toLocaleString()} | ${fields.join(', ')} | ${vital.notes?.substring(0, 50) || 'No notes'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTestWarnings();
