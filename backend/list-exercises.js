const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function listExercises() {
  try {
    const [exercises] = await sequelize.query(`
      SELECT id, name, category, difficulty, "videoUrl", "imageUrl"
      FROM exercises
      ORDER BY category, name
    `);

    console.log(`\nFound ${exercises.length} exercises:\n`);
    exercises.forEach(ex => {
      console.log(`ID: ${ex.id}`);
      console.log(`Name: ${ex.name}`);
      console.log(`Category: ${ex.category}`);
      console.log(`Difficulty: ${ex.difficulty}`);
      console.log(`Video: ${ex.videoUrl || 'MISSING'}`);
      console.log(`Image: ${ex.imageUrl || 'MISSING'}`);
      console.log('---');
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listExercises();
