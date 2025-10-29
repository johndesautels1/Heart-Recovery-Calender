const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function checkJonesDashboard() {
  try {
    console.log('=== JOHN JONES USER INFO ===');
    const users = await sequelize.query(
      `SELECT u.id as user_id, u.email, u.name, u.role, p.id as patient_id, p."userId"
       FROM users u
       LEFT JOIN patients p ON u.id = p."userId"
       WHERE u.email = 'jones@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(users, null, 2));

    const userId = users[0].user_id;

    console.log('\n=== ALL EVENTS FOR JOHN JONES ===');
    const allEvents = await sequelize.query(
      `SELECT ce.id, ce.title, ce."startTime", ce.status, ce."exerciseId", ce."patientId", c.name as calendar_name
       FROM calendar_events ce
       LEFT JOIN calendars c ON ce."calendarId" = c.id
       WHERE ce."patientId" = ${userId}
       ORDER BY ce."startTime" DESC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(allEvents, null, 2));
    console.log(`\nTotal events: ${allEvents.length}`);
    console.log(`Completed events: ${allEvents.filter(e => e.status === 'completed').length}`);
    console.log(`Scheduled events: ${allEvents.filter(e => e.status === 'scheduled').length}`);

    console.log('\n=== VITALS FOR JOHN JONES ===');
    const vitals = await sequelize.query(
      `SELECT id, "userId", "recordedAt", "bloodPressureSystolic", "bloodPressureDiastolic", "heartRate", weight
       FROM vitals
       WHERE "userId" = ${userId}
       ORDER BY "recordedAt" DESC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(vitals, null, 2));
    console.log(`\nTotal vitals records: ${vitals.length}`);

    console.log('\n=== MEDICATIONS FOR JOHN JONES ===');
    const medications = await sequelize.query(
      `SELECT id, "userId", name, dosage, frequency, "startDate"
       FROM medications
       WHERE "userId" = ${userId}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(medications, null, 2));
    console.log(`\nTotal medications: ${medications.length}`);

    console.log('\n=== CHECKING DASHBOARD DATA AVAILABILITY ===');
    console.log('For John Jones dashboard to work, we need:');
    console.log(`✓ User exists: ${users.length > 0}`);
    console.log(`✓ Has events: ${allEvents.length > 0}`);
    console.log(`✓ Has completed events: ${allEvents.filter(e => e.status === 'completed').length > 0}`);
    console.log(`✓ Has vitals: ${vitals.length > 0}`);
    console.log(`✓ Has medications: ${medications.length > 0}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkJonesDashboard();
