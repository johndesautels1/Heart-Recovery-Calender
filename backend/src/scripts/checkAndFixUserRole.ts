/**
 * Check and fix user role for userId 2
 */

import sequelize from '../models/database';
import User from '../models/User';

async function checkAndFixUserRole() {
  try {
    const userId = 2;

    console.log('🔍 Checking user role for userId =', userId);

    const user = await User.findByPk(userId);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 Current User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    if (user.role === 'therapist') {
      console.log('\n✅ User is already a therapist - no change needed');
    } else if (user.role === 'admin') {
      console.log('\n✅ User is admin (even better!) - no change needed');
    } else {
      console.log(`\n⚠️  User role is "${user.role}" - updating to "therapist"...`);
      await user.update({ role: 'therapist' });
      console.log('✅ User role updated to therapist');
      console.log('\n🎉 You can now generate unlimited CAI reports!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAndFixUserRole();
