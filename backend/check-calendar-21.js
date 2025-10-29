const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function checkCalendar21() {
  try {
    console.log('=== CALENDAR 21 INFO ===');
    const calendar = await sequelize.query(
      `SELECT c.id, c.name, c.type, c."userId", u.name as owner_name, u.email as owner_email
       FROM calendars c
       LEFT JOIN users u ON c."userId" = u.id
       WHERE c.id = 21`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(calendar, null, 2));

    console.log('\n=== ALL CALENDARS WITH TYPE exercise ===');
    const allExerciseCals = await sequelize.query(
      `SELECT c.id, c.name, c.type, c."userId", u.name as owner_name
       FROM calendars c
       LEFT JOIN users u ON c."userId" = u.id
       WHERE c.type = 'exercise'
       ORDER BY c.id`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(allExerciseCals, null, 2));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkCalendar21();
