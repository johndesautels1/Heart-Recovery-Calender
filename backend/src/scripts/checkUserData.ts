/**
 * Check what data exists for user ID 2
 */

import sequelize from '../models/database';
import Patient from '../models/Patient';
import VitalsSample from '../models/VitalsSample';
import MealEntry from '../models/MealEntry';
import ExerciseLog from '../models/ExerciseLog';
import SleepLog from '../models/SleepLog';
import HydrationLog from '../models/HydrationLog';

async function checkUserData() {
  try {
    const userId = 2;
    console.log(`\n🔍 Checking data for user ID ${userId}...\n`);

    // Get patient profile
    const patient = await Patient.findOne({ where: { userId } });
    if (patient) {
      console.log('✅ Patient Profile Found:');
      console.log(`   - Name: ${patient.name}`);
      console.log(`   - Surgery Date: ${patient.surgeryDate}`);
      console.log(`   - Patient ID: ${patient.id}`);
    } else {
      console.log('❌ No patient profile found');
    }

    // Check vitals
    const vitalsCount = await VitalsSample.count({ where: { userId } });
    console.log(`\n📊 Vitals Samples: ${vitalsCount} records`);
    if (vitalsCount > 0) {
      const latest = await VitalsSample.findOne({
        where: { userId },
        order: [['timestamp', 'DESC']]
      });
      console.log(`   Latest: ${latest?.timestamp} - HR: ${latest?.heartRate}, BP: ${latest?.bloodPressureSystolic}/${latest?.bloodPressureDiastolic}`);
    }

    // Check meals
    const mealsCount = await MealEntry.count({ where: { userId } });
    console.log(`\n🍽️  Meal Entries: ${mealsCount} records`);
    if (mealsCount > 0) {
      const latest = await MealEntry.findOne({
        where: { userId },
        order: [['timestamp', 'DESC']]
      });
      console.log(`   Latest: ${latest?.timestamp} - ${latest?.mealType}, ${latest?.calories} cal`);
    }

    // Check exercise logs - need to check BOTH patientId AND userId
    if (patient) {
      const exerciseByPatientId = await ExerciseLog.count({ where: { patientId: patient.id } });
      const exerciseByUserId = await ExerciseLog.count({ where: { patientId: userId } });
      console.log(`\n🏃 Exercise Logs:`);
      console.log(`   By patientId (${patient.id}): ${exerciseByPatientId} records`);
      console.log(`   By userId (${userId}): ${exerciseByUserId} records`);

      if (exerciseByPatientId > 0) {
        const latest = await ExerciseLog.findOne({
          where: { patientId: patient.id },
          order: [['completedAt', 'DESC']]
        });
        console.log(`   Latest: ${latest?.completedAt} - ${latest?.actualDuration} min, ${latest?.caloriesBurned} cal`);
      }
    }

    // Check sleep
    const sleepCount = await SleepLog.count({ where: { userId } });
    console.log(`\n😴 Sleep Logs: ${sleepCount} records`);

    // Check hydration
    const hydrationCount = await HydrationLog.count({ where: { userId } });
    console.log(`\n💧 Hydration Logs: ${hydrationCount} records`);

    console.log('\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUserData();
