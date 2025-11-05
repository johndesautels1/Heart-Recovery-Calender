import sequelize from '../models/database';
import Medication from '../models/Medication';
import VitalsSample from '../models/VitalsSample';

async function addTestData() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const userId = 2; // User ID to add test data for

    // Add Metoprolol medication with weight gain side effect
    const medication = await Medication.create({
      userId,
      name: 'Metoprolol',
      dosage: '25mg',
      frequency: 'twice daily',
      timeOfDay: 'morning,evening',
      startDate: new Date(),
      isActive: true,
      knownSideEffects: {
        weightGain: true,
        fatigue: true
      }
    });
    console.log('✅ Medication added:', medication.name);

    // Add weight entry from 7 days ago (180 lbs)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const vital1 = await VitalsSample.create({
      userId,
      weight: 180,
      timestamp: sevenDaysAgo,
      medicationsTaken: true,
      notes: 'Baseline weight'
    });
    console.log('✅ Weight entry 1 added:', vital1.weight, 'lbs on', vital1.timestamp);

    // Add current weight entry (189 lbs) - 9 lbs gain in 7 days = 9 lbs/week (DANGER!)
    const vital2 = await VitalsSample.create({
      userId,
      weight: 189,
      timestamp: new Date(),
      medicationsTaken: true,
      notes: 'Current weight - rapid gain detected'
    });
    console.log('✅ Weight entry 2 added:', vital2.weight, 'lbs on', vital2.timestamp);

    const weightGain = vital2.weight - vital1.weight;
    console.log('\n🦅 HAWK ALERT CONDITIONS MET:');
    console.log(`   Weight gain: ${weightGain} lbs in 7 days`);
    console.log(`   Rate: ${weightGain} lbs/week (>2 lbs/week threshold)`);
    console.log(`   Medication: ${medication.name} (causes weight gain)`);
    console.log('\n📱 Go to Vitals page to see the Hawk Alert banner!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestData();
