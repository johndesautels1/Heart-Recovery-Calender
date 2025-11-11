/**
 * Fix surgery date to be in the past so CIA reports work
 */

import sequelize from '../models/database';
import Patient from '../models/Patient';

async function fixSurgeryDate() {
  try {
    const userId = 2;
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
      console.log('❌ No patient found');
      return;
    }

    console.log(`Current surgery date: ${patient.surgeryDate}`);

    // Set surgery date to 60 days ago (realistic recovery period)
    const newSurgeryDate = new Date();
    newSurgeryDate.setDate(newSurgeryDate.getDate() - 60);

    await patient.update({ surgeryDate: newSurgeryDate });

    console.log(`✅ Updated surgery date to: ${newSurgeryDate}`);
    console.log(`   This is ${60} days ago - realistic for CIA analysis`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixSurgeryDate();
