import sequelize from '../models/database';
import VitalsSample from '../models/VitalsSample';

async function deleteTestWarnings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    console.log('🗑️  Deleting Test Warning Data...\n');

    // Delete test weight entries (IDs 10, 11)
    const weightDeleted = await VitalsSample.destroy({
      where: {
        id: [10, 11]
      }
    });
    console.log(`✅ Deleted ${weightDeleted} test WEIGHT entries (IDs 10, 11)`);

    // Delete test blood sugar entries (IDs 12, 13)
    const glucoseDeleted = await VitalsSample.destroy({
      where: {
        id: [12, 13]
      }
    });
    console.log(`✅ Deleted ${glucoseDeleted} test BLOOD SUGAR entries (IDs 12, 13)`);

    console.log('\n✅ Test warning data has been removed!');
    console.log('\n📊 Remaining data:');
    console.log('   - Heart rate data from Strava (IDs 7, 8, 9) - KEPT ✓');
    console.log('   - User vitals from Nov 4 (IDs 2, 3) - KEPT ✓');
    console.log('   - Old entries from Oct (IDs 4, 5) - KEPT ✓');
    console.log('\nThe test warnings will no longer appear on the dashboard!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteTestWarnings();
