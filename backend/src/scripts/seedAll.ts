import { seedEventTemplates } from './seedEventTemplates';
import { seedExercises } from './seedExercises';
import sequelize from '../models/database';

async function seedAllData() {
  try {
    console.log('🚀 Starting database seeding...\n');

    // Sync database
    console.log('📦 Syncing database...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced\n');

    // Seed event templates
    await seedEventTemplates();
    console.log('');

    // Seed exercises
    await seedExercises();
    console.log('');

    console.log('🎉 All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAllData()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

export default seedAllData;
