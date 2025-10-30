const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function check() {
  const [results] = await sequelize.query(`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table='meal_entries';
  `);

  console.log('Triggers on meal_entries:', results);
  await sequelize.close();
}

check();
