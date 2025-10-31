import sequelize from '../models/database';
import Exercise from '../models/Exercise';

async function verifyExerciseVideo() {
  try {
    await sequelize.authenticate();

    // Get a few examples from different categories
    const examples = [
      'Bicep Curls (Light Weight)',
      'Water Aerobics',
      'Pickleball',
      'Cat-Cow Stretch',
      'Box Breathing'
    ];

    console.log('\n🔍 EXERCISE VIDEO VERIFICATION\n');
    console.log('='.repeat(80) + '\n');

    for (const exerciseName of examples) {
      const exercise = await Exercise.findOne({
        where: { name: exerciseName },
        attributes: ['id', 'name', 'category', 'difficulty', 'videoUrl']
      });

      if (exercise) {
        console.log(`📋 Exercise: ${exercise.name}`);
        console.log(`   ID: ${exercise.id}`);
        console.log(`   Category: ${exercise.category}`);
        console.log(`   Difficulty: ${exercise.difficulty}`);
        console.log(`   Video URL: ${exercise.videoUrl || 'NOT SET'}`);
        console.log('\n' + '-'.repeat(80) + '\n');
      }
    }

    console.log('✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

verifyExerciseVideo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
