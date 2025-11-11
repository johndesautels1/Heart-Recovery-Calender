/**
 * Restore surgery date to original September 18, 2025
 */

import sequelize from '../models/database';
import Patient from '../models/Patient';

async function restoreSurgeryDate() {
  try {
    const userId = 2;
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
      console.log('❌ No patient found');
      return;
    }

    console.log(`Current surgery date: ${patient.surgeryDate}`);

    // Restore to original September 18, 2025
    const originalSurgeryDate = new Date('2025-09-18');

    await patient.update({ surgeryDate: originalSurgeryDate });

    console.log(`✅ Restored surgery date to: ${originalSurgeryDate}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

restoreSurgeryDate();
