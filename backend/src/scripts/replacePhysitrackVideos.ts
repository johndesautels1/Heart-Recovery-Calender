import sequelize from '../models/database';
import Exercise from '../models/Exercise';

/**
 * Replace Physitrack URLs with Free YouTube Alternatives
 * All videos from reputable physical therapy and senior fitness channels
 * No membership required - 100% free and accessible
 */
const replacementVideos: Record<string, string> = {
  // UPPER BODY
  'Resistance Band Shoulder External Rotation': 'https://www.youtube.com/watch?v=GKc3hOFZwbE', // Bob & Brad - Shoulder External Rotation Exercise
  'Seated Row (Resistance Band)': 'https://www.youtube.com/watch?v=NUb_CiQg18E', // Fitness Blender - Seated Band Row

  // CORE
  'Side Plank (Knees)': 'https://www.youtube.com/watch?v=K2VljzCC10E', // HASfit - Modified Side Plank on Knees

  // BALANCE
  'Single Leg Balance (Eyes Closed)': 'https://www.youtube.com/watch?v=5s48_cDHZ2M', // More Life Health - Single Leg Balance for Seniors

  // CARDIO
  'Stair Step Patterns': 'https://www.youtube.com/watch?v=u3yE5jcUALI', // Step Training Basics for Seniors

  // LOWER BODY
  'Standing Hip Abduction': 'https://www.youtube.com/watch?v=lBmYAWYO4gM', // Ask Doctor Jo - Standing Hip Abduction
  'Standing Hip Extension': 'https://www.youtube.com/watch?v=6J2bn8viIws', // Bridging - Hip Extension Exercise (similar movement pattern)
};

async function replacePhysitrackVideos() {
  try {
    console.log('🔄 Replacing Physitrack URLs with Free YouTube Videos...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let updateCount = 0;

    for (const [exerciseName, newVideoUrl] of Object.entries(replacementVideos)) {
      const exercise = await Exercise.findOne({ where: { name: exerciseName } });

      if (exercise) {
        const oldUrl = exercise.videoUrl;
        await exercise.update({ videoUrl: newVideoUrl });

        console.log(`✅ Updated: ${exerciseName}`);
        console.log(`   OLD: ${oldUrl}`);
        console.log(`   NEW: ${newVideoUrl}\n`);
        updateCount++;
      } else {
        console.log(`⚠️  Exercise not found: ${exerciseName}\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('📊 REPLACEMENT SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully replaced: ${updateCount} Physitrack URLs`);
    console.log(`🎥 All videos now free and accessible (no membership required)`);
    console.log(`📹 Sources: Bob & Brad, Ask Doctor Jo, HASfit, More Life Health, Fitness Blender`);
    console.log('\n✨ Replacement completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

replacePhysitrackVideos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
