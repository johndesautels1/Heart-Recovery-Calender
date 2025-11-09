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

    const vitalsCount = await sequelize.query('SELECT COUNT(*) FROM vitals_samples', { type: Sequelize.QueryTypes.SELECT });
    console.log('📊 Total vitals records:', vitalsCount[0].count);

    const recentVitals = await sequelize.query(
      'SELECT * FROM vitals_samples ORDER BY "timestamp" DESC LIMIT 5',
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('\n📋 Most recent vitals:');
    recentVitals.forEach((v, i) => {
      console.log(`${i + 1}. User ${v.userId} - ${v.timestamp} - HR: ${v.heartRate || 'N/A'}, BP: ${v.bloodPressureSystolic || 'N/A'}/${v.bloodPressureDiastolic || 'N/A'}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVitals();
