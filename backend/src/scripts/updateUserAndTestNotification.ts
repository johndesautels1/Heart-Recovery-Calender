import sequelize from '../models/database';
import User from '../models/User';
import VitalsSample from '../models/VitalsSample';
import Medication from '../models/Medication';
import { Op } from 'sequelize';
import { sendHawkAlert } from '../services/notificationService';

async function updateAndTest() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const userId = 2;

    // 1. Check current user profile
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log('📋 CURRENT USER PROFILE:');
    console.log('═══════════════════════════════════════════');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Phone: ${user.phoneNumber || 'NOT SET'}`);
    console.log('');

    // 2. Update phone number if not set
    if (!user.phoneNumber || user.phoneNumber === '') {
      console.log('📱 UPDATING PHONE NUMBER...');
      user.phoneNumber = '+17274705173'; // Using first phone number provided
      await user.save();
      console.log(`✅ Phone number updated to: ${user.phoneNumber}\n`);
    } else {
      console.log(`✅ Phone number already set: ${user.phoneNumber}\n`);
    }

    // 3. Check for existing glucose readings and medications
    console.log('🩸 CHECKING FOR GLUCOSE HAWK ALERT CONDITIONS...');
    console.log('═══════════════════════════════════════════');

    const highGlucoseReading = await VitalsSample.findOne({
      where: {
        userId,
        bloodSugar: { [Op.gte]: 140 }
      },
      order: [['timestamp', 'DESC']]
    });

    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    if (highGlucoseReading && medications.length > 0) {
      console.log(`\n🦅 HIGH GLUCOSE DETECTED: ${highGlucoseReading.bloodSugar} mg/dL`);
      console.log(`📋 ${medications.length} Active Medications Found`);

      const glucoseMeds = medications.filter(med => {
        const sideEffects = med.knownSideEffects as any;
        return sideEffects && (sideEffects.raisesBloodSugar || sideEffects.lowersBloodSugar);
      });

      if (glucoseMeds.length > 0) {
        console.log(`\n🚨 TRIGGERING TEST HAWK ALERT FOR HYPERGLYCEMIA...`);

        await sendHawkAlert(
          user.email,
          user.phoneNumber,
          'hyperglycemia',
          highGlucoseReading.bloodSugar! > 180 ? 'danger' : 'warning',
          glucoseMeds.map(m => m.name),
          `High blood sugar detected: ${highGlucoseReading.bloodSugar} mg/dL`,
          'Contact your healthcare provider to discuss potential medication adjustments. Continue monitoring your blood sugar levels closely.',
          [] // No care team for this test
        );

        console.log('\n✅ TEST HAWK ALERT SENT!');
        console.log('════════════════════════════════════════════════');
        console.log('📧 Check your email: ' + user.email);
        console.log('📱 Check your phone: ' + user.phoneNumber);
        console.log('');
        console.log('⚠️  NOTE: SMS will only work if Twilio is configured in .env');
        console.log('    Email should work since SMTP is configured.');
      } else {
        console.log('\n⚠️  No glucose-related medications found');
        console.log('Test alert NOT sent (no medication correlation)');
      }
    } else {
      console.log('\n⚠️  No high glucose readings or medications found');
      console.log('Cannot test alert without test data');
      console.log('\nTo create test data, run:');
      console.log('  npm run script src/scripts/addGlucoseHawkAlertTestData.ts');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAndTest();
