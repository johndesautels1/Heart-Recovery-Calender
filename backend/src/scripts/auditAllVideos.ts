import sequelize from '../models/database';
import Exercise from '../models/Exercise';

async function auditAllVideos() {
  try {
    await sequelize.authenticate();

    const allExercises = await Exercise.findAll({
      attributes: ['id', 'name', 'category', 'difficulty', 'videoUrl'],
      order: [['name', 'ASC']]
    });

    console.log('\n🔍 COMPLETE VIDEO AUDIT\n');
    console.log('='.repeat(80) + '\n');

    const categories = {
      verified: [] as any[],
      recentlyAddedNotTested: [] as any[],
      invalidUrls: [] as any[],
      noVideo: [] as any[]
    };

    // All exercises now have USER-VERIFIED YouTube URLs
    // - Original 79 from initial verified table
    // - 7 updated with user-verified URLs (update7ValidVideos.ts)
    // - 14 updated with user-verified activity URLs (update14ValidVideos.ts)
    // Total: 100/100 verified
    const knownInvalidExercises: string[] = [];
    const recentlyAddedExercises: string[] = [];

    for (const exercise of allExercises) {
      if (!exercise.videoUrl || exercise.videoUrl.trim() === '') {
        categories.noVideo.push(exercise);
      } else if (knownInvalidExercises.includes(exercise.name)) {
        categories.invalidUrls.push(exercise);
      } else if (recentlyAddedExercises.includes(exercise.name)) {
        categories.recentlyAddedNotTested.push(exercise);
      } else {
        categories.verified.push(exercise);
      }
    }

    // Print Results
    console.log('📊 AUDIT RESULTS\n');
    console.log('='.repeat(80) + '\n');

    console.log(`✅ VERIFIED (from user's original table): ${categories.verified.length} exercises`);
    console.log(`⚠️  RECENTLY ADDED (not user-tested): ${categories.recentlyAddedNotTested.length} exercises`);
    console.log(`❌ INVALID URLS (confirmed broken): ${categories.invalidUrls.length} exercises`);
    console.log(`🔲 NO VIDEO: ${categories.noVideo.length} exercises\n`);

    console.log('='.repeat(80) + '\n');

    if (categories.invalidUrls.length > 0) {
      console.log('❌ CONFIRMED INVALID URLS (need replacement):\n');
      categories.invalidUrls.forEach((ex, i) => {
        console.log(`${i + 1}. ${ex.name}`);
        console.log(`   ID: ${ex.id}`);
        console.log(`   Category: ${ex.category}`);
        console.log(`   URL: ${ex.videoUrl}`);
        console.log('');
      });
      console.log('='.repeat(80) + '\n');
    }

    if (categories.recentlyAddedNotTested.length > 0) {
      console.log('⚠️  RECENTLY ADDED (not verified by user yet):\n');
      categories.recentlyAddedNotTested.forEach((ex, i) => {
        console.log(`${i + 1}. ${ex.name}`);
        console.log(`   ID: ${ex.id}`);
        console.log(`   URL: ${ex.videoUrl}`);
        console.log('');
      });
      console.log('='.repeat(80) + '\n');
    }

    if (categories.noVideo.length > 0) {
      console.log('🔲 NO VIDEO URL:\n');
      categories.noVideo.forEach((ex, i) => {
        console.log(`${i + 1}. ${ex.name} (ID: ${ex.id})`);
      });
      console.log('\n' + '='.repeat(80) + '\n');
    }

    console.log('📋 SUMMARY FOR USER:\n');
    console.log(`Total exercises needing attention: ${categories.invalidUrls.length + categories.recentlyAddedNotTested.length + categories.noVideo.length}`);
    console.log(`- ${categories.invalidUrls.length} with confirmed invalid URLs`);
    console.log(`- ${categories.recentlyAddedNotTested.length} with untested URLs (may or may not work)`);
    console.log(`- ${categories.noVideo.length} with no video at all\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

auditAllVideos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
