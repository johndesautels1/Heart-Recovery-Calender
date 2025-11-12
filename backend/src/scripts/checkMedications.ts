/**
 * Check current medications for user
 */

import sequelize from '../models/database';
import Medication from '../models/Medication';

async function checkMedications() {
  try {
    const userId = 2;
    console.log('\n💊 CHECKING CURRENT MEDICATIONS\n');

    const medications = await Medication.findAll({
      where: { userId, isActive: true },
      order: [['name', 'ASC']],
    });

    console.log(`Found ${medications.length} active medications:\n`);

    for (const med of medications) {
      console.log(`  📋 ${med.name}`);
      console.log(`     Dosage: ${med.dosage}`);
      console.log(`     Frequency: ${med.frequency}`);
      if (med.purpose) console.log(`     Purpose: ${med.purpose}`);
      if (med.prescribedBy) console.log(`     Prescribed by: ${med.prescribedBy}`);
      if (med.knownSideEffects) {
        const effects = Object.keys(med.knownSideEffects).filter(k => med.knownSideEffects![k]);
        if (effects.length > 0) {
          console.log(`     Known side effects: ${effects.join(', ')}`);
        }
      }
      console.log('');
    }

    console.log('✅ Check complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkMedications();
