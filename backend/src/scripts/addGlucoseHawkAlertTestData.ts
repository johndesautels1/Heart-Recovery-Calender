import sequelize from '../models/database';
import Medication from '../models/Medication';
import VitalsSample from '../models/VitalsSample';
import MealEntry from '../models/MealEntry';

async function addGlucoseTestData() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const userId = 2; // User ID to add test data for

    // 1. Add Prednisone (corticosteroid) - raises blood sugar
    const highBloodSugarMed = await Medication.create({
      userId,
      name: 'Prednisone',
      dosage: '10mg',
      frequency: 'once daily',
      timeOfDay: 'morning',
      startDate: new Date(),
      isActive: true,
      knownSideEffects: {
        raisesBloodSugar: true,
        weightGain: true,
        interactsWithSodium: true,
        interactsWithSugar: true
      }
    });
    console.log('✅ Medication added:', highBloodSugarMed.name, '(raises blood sugar)');

    // 2. Add Insulin (diabetes medication) - lowers blood sugar
    const lowBloodSugarMed = await Medication.create({
      userId,
      name: 'Insulin Glargine',
      dosage: '20 units',
      frequency: 'once daily',
      timeOfDay: 'evening',
      startDate: new Date(),
      isActive: true,
      knownSideEffects: {
        lowersBloodSugar: true,
        requiresFood: true
      }
    });
    console.log('✅ Medication added:', lowBloodSugarMed.name, '(lowers blood sugar)');

    // 3. Add high-sodium, high-sugar meal from today
    const highSodiumMeal = await MealEntry.create({
      userId,
      timestamp: new Date(),
      mealType: 'lunch',
      foodItems: 'Fast food burger, large fries, soda',
      calories: 1200,
      sodium: 2400, // High sodium (>2000mg threshold)
      sugar: 65, // High sugar (>50g threshold)
      protein: 30,
      carbohydrates: 120,
      totalFat: 50,
      withinSpec: false,
      status: 'completed',
      notes: 'Fast food meal - high sodium and sugar'
    });
    console.log('✅ Meal entry added:', highSodiumMeal.foodItems);
    console.log('   Sodium:', highSodiumMeal.sodium + 'mg, Sugar:', highSodiumMeal.sugar + 'g');

    // 4. Add HYPERGLYCEMIA reading (dangerous high blood sugar)
    const highGlucoseVital = await VitalsSample.create({
      userId,
      bloodSugar: 195, // >180 = DANGER level
      timestamp: new Date(),
      medicationsTaken: true,
      notes: 'High blood sugar reading - should trigger hyperglycemia Hawk Alert'
    });
    console.log('✅ High glucose reading added:', highGlucoseVital.bloodSugar, 'mg/dL');

    // 5. Add HYPOGLYCEMIA reading (dangerous low blood sugar) from 2 hours ago
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const lowGlucoseVital = await VitalsSample.create({
      userId,
      bloodSugar: 65, // <70 = DANGER level
      timestamp: twoHoursAgo,
      medicationsTaken: true,
      notes: 'Low blood sugar reading - should trigger hypoglycemia Hawk Alert'
    });
    console.log('✅ Low glucose reading added:', lowGlucoseVital.bloodSugar, 'mg/dL');

    console.log('\n🦅 GLUCOSE HAWK ALERT CONDITIONS MET:');
    console.log('   ─────────────────────────────────────');
    console.log('   1. HYPERGLYCEMIA ALERT:');
    console.log('      • Blood sugar:', highGlucoseVital.bloodSugar, 'mg/dL (>180 = DANGER)');
    console.log('      • Medication:', highBloodSugarMed.name, '(raises blood sugar)');
    console.log('');
    console.log('   2. HYPOGLYCEMIA ALERT:');
    console.log('      • Blood sugar:', lowGlucoseVital.bloodSugar, 'mg/dL (<70 = DANGER)');
    console.log('      • Medication:', lowBloodSugarMed.name, '(lowers blood sugar)');
    console.log('');
    console.log('   3. FOOD-MEDICATION INTERACTION ALERT:');
    console.log('      • Recent meal: High sodium (2400mg) + High sugar (65g)');
    console.log('      • Blood sugar: 195 mg/dL (elevated)');
    console.log('      • Medication:', highBloodSugarMed.name, '(interacts with sodium & sugar)');
    console.log('');
    console.log('📱 Go to Vitals page → Glucose tab to see the Hawk Alert banners!');
    console.log('📧 Check your email and phone for alert notifications!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addGlucoseTestData();
