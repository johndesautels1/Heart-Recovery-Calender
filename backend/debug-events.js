const db = require('./src/models');

async function checkEvents() {
  try {
    console.log('=== JOHN JONES USER INFO ===');
    const jones = await db.default.query(
      `SELECT u.id as user_id, u.email, u.name, p.id as patient_id, p."userId"
       FROM users u
       LEFT JOIN patients p ON u.id = p."userId"
       WHERE u.email = 'jones@gmail.com'`,
      {type: 'SELECT'}
    );
    console.log(JSON.stringify(jones, null, 2));

    if (jones.length > 0) {
      const userId = jones[0].user_id;

      console.log('\n=== EXERCISE EVENTS FOR JOHN JONES ===');
      const events = await db.default.query(
        `SELECT ce.id, ce.title, ce."startTime", ce."patientId", ce."exerciseId", ce."calendarId"
         FROM calendar_events ce
         WHERE ce."patientId" = ${userId}
         AND ce."exerciseId" IS NOT NULL
         ORDER BY ce."startTime" DESC`,
        {type: 'SELECT'}
      );
      console.log(JSON.stringify(events, null, 2));

      console.log('\n=== ALL CALENDARS FOR JOHN JONES ===');
      const calendars = await db.default.query(
        `SELECT id, name, type, "userId"
         FROM calendars
         WHERE "userId" = ${userId}`,
        {type: 'SELECT'}
      );
      console.log(JSON.stringify(calendars, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvents();
