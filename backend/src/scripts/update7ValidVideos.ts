import sequelize from '../models/database';
import Exercise from '../models/Exercise';

/**
 * Update 7 exercises with USER-VERIFIED YouTube URLs
 * All URLs confirmed working by user on October 31, 2025
 */
const verifiedVideos: Record<string, string> = {
  'Resistance Band Shoulder External Rotation': 'https://www.youtube.com/watch?v=_UvmPNGtlPM',
  'Seated Row (Resistance Band)': 'https://www.youtube.com/watch?v=mnP10HI18uI',
  'Side Plank (Knees)': 'https://www.youtube.com/watch?v=s8Hh8UI0l_Q',
  'Single Leg Balance (Eyes Closed)': 'https://www.youtube.com/watch?v=zApChixB2MQ',
  'Stair Step Patterns': 'https://www.youtube.com/watch?v=1hiWQ7pehjQ',
  'Standing Hip Abduction': 'https://www.youtube.com/watch?v=5blg8FMtNe8',
  'Standing Hip Extension': 'https://www.youtube.com/watch?v=6PvIZIIg_Ng'
};

async function update7ValidVideos() {
  try {
    console.log('✅ Updating 7 USER-VERIFIED video URLs...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let updateCount = 0;

    for (const [exerciseName, videoUrl] of Object.entries(verifiedVideos)) {
      const exercise = await Exercise.findOne({ where: { name: exerciseName } });

      if (exercise) {
        const oldUrl = exercise.videoUrl;
        await exercise.update({ videoUrl });

        console.log(`✅ Updated: ${exerciseName}`);
        console.log(`   OLD: ${oldUrl}`);
        console.log(`   NEW: ${videoUrl}\n`);
        updateCount++;
      } else {
        console.log(`⚠️  Exercise not found: ${exerciseName}\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${updateCount}/7 exercises`);
    console.log(`🎬 Sources: Ask Doctor Jo, Muscle & Strength, Fitness Blender, Elder Gym, Mayo Clinic, Howcast, PTVideo`);
    console.log(`✔️  All URLs verified by user as working\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

update7ValidVideos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
