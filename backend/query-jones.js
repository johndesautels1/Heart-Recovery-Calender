const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function queryJonesData() {
  try {
    console.log('=== JOHN JONES USER INFO ===');
    const users = await sequelize.query(
      `SELECT u.id as user_id, u.email, u.name, p.id as patient_id, p."userId"
       FROM users u
       LEFT JOIN patients p ON u.id = p."userId"
       WHERE u.email = 'jones@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(users, null, 2));

    if (users.length > 0) {
      const userId = users[0].user_id;

      console.log('\n=== EXERCISE EVENTS FOR JOHN JONES (by userId) ===');
      const events = await sequelize.query(
        `SELECT ce.id, ce.title, ce."startTime", ce."patientId", ce."exerciseId", ce."calendarId", c.name as calendar_name, c.type as calendar_type
         FROM calendar_events ce
         LEFT JOIN calendars c ON ce."calendarId" = c.id
         WHERE ce."patientId" = ${userId}
         AND ce."exerciseId" IS NOT NULL
         ORDER BY ce."startTime" DESC`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(JSON.stringify(events, null, 2));

      console.log('\n=== ALL CALENDARS FOR JOHN JONES ===');
      const calendars = await sequelize.query(
        `SELECT id, name, type, "userId"
         FROM calendars
         WHERE "userId" = ${userId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(JSON.stringify(calendars, null, 2));

      console.log('\n=== ALL EVENTS FOR JOHN JONES (any patientId) ===');
      const allEvents = await sequelize.query(
        `SELECT ce.id, ce.title, ce."startTime", ce."patientId", ce."exerciseId", ce."calendarId", c.name as calendar_name
         FROM calendar_events ce
         LEFT JOIN calendars c ON ce."calendarId" = c.id
         WHERE ce."patientId" = ${userId}
         ORDER BY ce."startTime" DESC`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(JSON.stringify(allEvents, null, 2));
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

queryJonesData();
