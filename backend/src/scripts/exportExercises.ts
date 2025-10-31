import sequelize from '../models/database';
import Exercise from '../models/Exercise';
import { writeFileSync } from 'fs';

async function exportExercises() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const exercises = await Exercise.findAll({
      attributes: ['id', 'name', 'category', 'difficulty'],
      order: [['name', 'ASC']]
    });

    console.log(`Found ${exercises.length} exercises\n`);

    // Create CSV
    let csv = 'ID,Exercise Name,Category,Difficulty\n';

    exercises.forEach(ex => {
      csv += `${ex.id},"${ex.name}",${ex.category},${ex.difficulty}\n`;
    });

    // Save to file
    writeFileSync('exercises_list.csv', csv);

    // Also print to console
    console.log(csv);

    console.log('\n✅ Exported to exercises_list.csv');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

exportExercises()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
