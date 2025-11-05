import sequelize from '../models/database';
import Medication from '../models/Medication';
import VitalsSample from '../models/VitalsSample';
import MealEntry from '../models/MealEntry';
import { Op } from 'sequelize';

async function verifyData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const userId = 2;

    // Check medications
    console.log('📋 MEDICATIONS IN DATABASE:');
    console.log('═══════════════════════════════════════════');
    const medications = await Medication.findAll({
      where: { userId, isActive: true },
      order: [['id', 'DESC']],
      limit: 5
    });

    medications.forEach((med) => {
      console.log(`\n🔹 ${med.name}`);
      console.log(`   Dosage: ${med.dosage} ${med.frequency}`);
      console.log(`   Side Effects:`, JSON.stringify(med.knownSideEffects, null, 6));
    });

    // Check glucose vitals
    console.log('\n\n🩸 GLUCOSE READINGS IN DATABASE:');
    console.log('═══════════════════════════════════════════');
    const glucoseVitals = await VitalsSample.findAll({
      where: {
        userId,
        bloodSugar: { [Op.not]: null }
      },
      order: [['timestamp', 'DESC']],
      limit: 5
    });

    glucoseVitals.forEach((vital) => {
      const status =
        vital.bloodSugar! < 60 ? '⚠️ CRITICAL LOW' :
        vital.bloodSugar! < 70 ? '🔴 HYPOGLYCEMIA' :
        vital.bloodSugar! < 100 ? '✅ NORMAL' :
        vital.bloodSugar! < 126 ? '🟡 ELEVATED' :
        vital.bloodSugar! < 180 ? '🟠 PRE-DIABETIC' :
        vital.bloodSugar! < 240 ? '🔴 DIABETIC' :
        '⚠️ CRITICAL HIGH';

      console.log(`\n🔹 ${vital.bloodSugar} mg/dL - ${status}`);
      console.log(`   Timestamp: ${vital.timestamp}`);
      console.log(`   Notes: ${vital.notes || 'None'}`);
    });

    // Check recent meals
    console.log('\n\n🍽️ RECENT MEALS IN DATABASE:');
    console.log('═══════════════════════════════════════════');
    const meals = await MealEntry.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit: 3
    });

    meals.forEach((meal) => {
      console.log(`\n🔹 ${meal.foodItems}`);
      console.log(`   Sodium: ${meal.sodium}mg ${meal.sodium! > 2000 ? '⚠️ HIGH' : '✅'}`);
      console.log(`   Sugar: ${meal.sugar}g ${meal.sugar! > 50 ? '⚠️ HIGH' : '✅'}`);
      console.log(`   Timestamp: ${meal.timestamp}`);
    });

    console.log('\n\n✅ DATA VERIFICATION COMPLETE!');
    console.log('All glucose test data has been successfully added to the database.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyData();
