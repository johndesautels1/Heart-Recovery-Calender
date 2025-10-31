import sequelize from '../models/database';
import Exercise from '../models/Exercise';

async function findPhysitrackVideos() {
  try {
    await sequelize.authenticate();

    // Find all exercises with physitrack URLs
    const exercises = await Exercise.findAll({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('videoUrl')),
        'LIKE',
        '%physitrack%'
      ),
      attributes: ['id', 'name', 'category', 'difficulty', 'videoUrl'],
      order: [['name', 'ASC']]
    });

    console.log('\n🔍 PHYSITRACK URL DETECTION\n');
    console.log('='.repeat(80) + '\n');
    console.log(`Found ${exercises.length} exercises using Physitrack URLs:\n`);

    exercises.forEach((exercise, index) => {
      console.log(`${index + 1}. ${exercise.name}`);
      console.log(`   ID: ${exercise.id}`);
      console.log(`   Category: ${exercise.category}`);
      console.log(`   Difficulty: ${exercise.difficulty}`);
      console.log(`   URL: ${exercise.videoUrl}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\n⚠️  Total Physitrack videos requiring replacement: ${exercises.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

findPhysitrackVideos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
