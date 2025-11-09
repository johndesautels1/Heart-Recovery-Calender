const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function findAllVitals() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all users
    const users = await sequelize.query(
      'SELECT id, email, name FROM users ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('👥 ALL USERS:');
    users.forEach(u => {
      console.log(`   User ${u.id}: ${u.name || u.email}`);
    });

    // Get vitals count by user
    const vitalsByUser = await sequelize.query(
      `SELECT "userId", COUNT(*) as count
       FROM vitals_samples
       WHERE "heartRate" IS NOT NULL OR "bloodPressureSystolic" IS NOT NULL
       GROUP BY "userId"
       ORDER BY "userId"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 VITALS COUNT BY USER:');
    vitalsByUser.forEach(v => {
      const user = users.find(u => u.id === v.userId);
      console.log(`   User ${v.userId} (${user ? user.name || user.email : 'Unknown'}): ${v.count} vitals`);
    });

    // Get recent vitals for EACH user
    console.log('\n📋 RECENT VITALS FOR EACH USER:\n');
    for (const user of users) {
      const userVitals = await sequelize.query(
        `SELECT * FROM vitals_samples
         WHERE "userId" = ${user.id}
         AND ("heartRate" IS NOT NULL OR "bloodPressureSystolic" IS NOT NULL)
         ORDER BY "timestamp" DESC LIMIT 3`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (userVitals.length > 0) {
        console.log(`🫀 User ${user.id}: ${user.name || user.email}`);
        userVitals.forEach((v, i) => {
          console.log(`   ${i + 1}. ${v.timestamp}`);
          console.log(`      HR: ${v.heartRate || '--'}, BP: ${v.bloodPressureSystolic || '--'}/${v.bloodPressureDiastolic || '--'}`);
          console.log(`      Temp: ${v.temperature || '--'}, O2: ${v.oxygenSaturation || '--'}, Weight: ${v.weight || '--'}`);
        });
        console.log('');
      }
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findAllVitals();
