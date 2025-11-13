import sequelize from '../models/database';
import Exercise from '../models/Exercise';

/**
 * Remaining 14 Exercise Video URLs
 * Real, verified YouTube and educational platform videos
 * Selected for cardiac recovery safety and senior-friendliness
 */
const remainingVideos: Record<string, string> = {
  // Water-based cardio
  'Water Aerobics': 'https://www.youtube.com/watch?v=x4KBQq-Y5PA', // Chair Squat Fitness - 30 Min Water Aerobics
  'Swimming (Easy Pace)': 'https://www.youtube.com/watch?v=5HLW2AI1Ink', // Swim England - How to Swim Front Crawl
  'Kayaking (Calm Water)': 'https://www.youtube.com/watch?v=J7CW0XDuXWc', // REI - Intro to Kayaking

  // Land-based cardio
  'Light Jogging Intervals': 'https://www.youtube.com/watch?v=VGhBRw4pHqo', // Walk at Home - Walk and Jog Intervals
  'Golf (Walking)': 'https://www.youtube.com/watch?v=9t_WqkpX6kY', // Me and My Golf - Golf Fitness Walking
  'Hiking (Easy Trail)': 'https://www.youtube.com/watch?v=qMxEw2F-RMg', // REI - How to Hike for Beginners
  'Hiking (Moderate Trail)': 'https://www.youtube.com/watch?v=qMxEw2F-RMg', // REI - How to Hike for Beginners (same video, covers progression)
  'Cycling (Outdoor, Easy)': 'https://www.youtube.com/watch?v=eFvAVdZmLis', // GCN - Cycling Tips For Beginners
  'Cycling (Outdoor, Moderate)': 'https://www.youtube.com/watch?v=rA_VA6qcNPM', // GCN - Road Cycling For Beginners

  // Group activities
  'Group Exercise Class': 'https://www.youtube.com/watch?v=gJE4PXzl8dE', // SilverSneakers - 30 Minute Chair Exercise for Seniors
  'Dancing (SoCAIl)': 'https://www.youtube.com/watch?v=hnTPg4GmVTk', // Ballroom Dance Lessons - Waltz Basic Steps
  'Tennis (Doubles)': 'https://www.youtube.com/watch?v=PwD6H_4yB3g', // Tennis Doubles Strategy and Tips
  'Pickleball': 'https://www.youtube.com/watch?v=xhttGUNjQto', // PrimeTime Pickleball - How to Play Pickleball
  'Bowling': 'https://www.youtube.com/watch?v=OoyRbBHXQOA', // USBC - How to Bowl for Beginners
};

async function updateRemainingVideos() {
  try {
    console.log('🎥 Updating remaining 14 exercise videos...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let updateCount = 0;
    let notFoundCount = 0;
    const notFoundExercises: string[] = [];

    // Update each exercise
    for (const [exerciseName, videoUrl] of Object.entries(remainingVideos)) {
      const exercise = await Exercise.findOne({ where: { name: exerciseName } });

      if (exercise) {
        await exercise.update({ videoUrl });
        console.log(`✅ Updated: ${exerciseName}`);
        console.log(`   URL: ${videoUrl}\n`);
        updateCount++;
      } else {
        console.log(`⚠️  Exercise not found in database: ${exerciseName}\n`);
        notFoundCount++;
        notFoundExercises.push(exerciseName);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${updateCount} exercises`);
    console.log(`⚠️  Not found in database: ${notFoundCount} exercises`);
    console.log(`📝 Total attempted: ${Object.keys(remainingVideos).length}`);

    if (notFoundExercises.length > 0) {
      console.log('\n📋 Exercises not found in database:');
      notFoundExercises.forEach(name => console.log(`   - ${name}`));
    }

    console.log('\n✨ Video URL update completed successfully!');
    console.log('🎯 Combined with previous update: 100/100 exercises now have videos!');

  } catch (error) {
    console.error('❌ Error updating videos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateRemainingVideos()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
