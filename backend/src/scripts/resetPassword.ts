import sequelize from '../models/database';
import User from '../models/User';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const email = 'brokerpinellas@gmail.com';
    const newPassword = 'Puspin15!';

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`📋 Found user: ${user.name} (${user.email})`);
    console.log(`🔑 Resetting password to: ${newPassword}\n`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password updated successfully!\n');
    console.log('═══════════════════════════════════════════');
    console.log('You can now login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`URL: http://localhost:3000`);
    console.log('═══════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
