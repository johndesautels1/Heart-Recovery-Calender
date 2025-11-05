const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/heart_recovery', {
  logging: false
});

async function checkMETs() {
  try {
    const [logs] = await sequelize.query(`
      SELECT
        id,
        "completedAt"::date as date,
        "actualMET",
        "duringHeartRateAvg",
        "actualDuration",
        "patientId",
        "preHeartRate"
      FROM exercise_logs
      WHERE "patientId" = 6
        AND "completedAt" >= '2025-11-01'
        AND "completedAt" < '2025-12-01'
      ORDER BY "completedAt" ASC
    `);

    console.log(JSON.stringify(logs, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMETs();
