const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function checkVitals() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check for records with ACTUAL heart rate data
    const vitalsWithHR = await sequelize.query(
      'SELECT COUNT(*) FROM vitals_samples WHERE "heartRate" IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log('\n📊 Vitals with Heart Rate:', vitalsWithHR[0].count);

    // Check for records with ACTUAL blood pressure data
    const vitalsWithBP = await sequelize.query(
      'SELECT COUNT(*) FROM vitals_samples WHERE "bloodPressureSystolic" IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log('📊 Vitals with Blood Pressure:', vitalsWithBP[0].count);

    // Get some actual records with data
    const realVitals = await sequelize.query(
      `SELECT * FROM vitals_samples
       WHERE "heartRate" IS NOT NULL OR "bloodPressureSystolic" IS NOT NULL
       ORDER BY "timestamp" DESC LIMIT 10`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('\n📋 Recent vitals WITH data:');
    if (realVitals.length === 0) {
      console.log('❌ NO VITALS WITH ACTUAL DATA FOUND!');
      console.log('All 35 records have NULL values for vital signs.');
    } else {
      realVitals.forEach((v, i) => {
        console.log(`${i + 1}. User ${v.userId} - ${v.timestamp}`);
        console.log(`   HR: ${v.heartRate || 'NULL'}, BP: ${v.bloodPressureSystolic || 'NULL'}/${v.bloodPressureDiastolic || 'NULL'}`);
        console.log(`   Temp: ${v.temperature || 'NULL'}, O2: ${v.oxygenSaturation || 'NULL'}, Weight: ${v.weight || 'NULL'}`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVitals();
