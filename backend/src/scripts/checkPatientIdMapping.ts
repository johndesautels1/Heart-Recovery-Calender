/**
 * Diagnostic: Check patient ID mappings to find ID mismatch
 */

import sequelize from '../models/database';

async function checkPatientIdMapping() {
  try {
    console.log('🔍 Checking Patient ID Mappings\n');
    console.log('='.repeat(60));

    const userId = 2;

    // 1. Check patient record for userId 2
    console.log(`\n1️⃣  Looking up patient record for userId = ${userId}...`);
    const [patientResult] = await sequelize.query<any>(`
      SELECT id, "userId", "therapistId", name, "surgeryDate"
      FROM patients
      WHERE "userId" = :userId
      LIMIT 1
    `, {
      replacements: { userId },
      type: 'SELECT' as any,
    });

    // Note: Sequelize returns a single object when we use type: 'SELECT', not an array
    const patient: any = patientResult;

    if (!patient || typeof patient !== 'object' || !patient.id) {
      console.log(`   ❌ NO PATIENT FOUND with userId = ${userId}`);

      // Check if patient exists with different mapping
      const [allPatients] = await sequelize.query<any>(`
        SELECT id, "userId", "therapistId", name
        FROM patients
        ORDER BY id
      `, { type: 'SELECT' as any });

      console.log(`\n   Available patients:`);
      console.log(JSON.stringify(allPatients, null, 2));
      return;
    }

    console.log(`   ✅ FOUND Patient:`);
    console.log(`      patient.id = ${patient.id}`);
    console.log(`      patient.userId = ${patient.userId}`);
    console.log(`      patient.therapistId = ${patient.therapistId}`);
    console.log(`      patient.name = ${patient.name}`);
    console.log(`      patient.surgeryDate = ${patient.surgeryDate}`);

    const patientId = patient.id;

    // 2. Check vitals count for userId
    console.log(`\n2️⃣  Checking vitals for userId = ${userId}...`);
    const [vitalsCount] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
    `, {
      replacements: { userId },
      type: 'SELECT' as any,
    });
    console.log(`   Vitals records: ${vitalsCount.total || 0}`);

    // 3. Check exercise logs for THIS patient.id
    console.log(`\n3️⃣  Checking exercise logs for patientId = ${patientId}...`);
    const [exerciseCount] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM exercise_logs
      WHERE "patientId" = :patientId
    `, {
      replacements: { patientId },
      type: 'SELECT' as any,
    });
    console.log(`   Exercise logs: ${exerciseCount.total || 0}`);

    // 4. Check exercise logs for EACH patientId to find mismatch
    console.log(`\n4️⃣  Checking ALL exercise logs grouped by patientId...`);
    const [exerciseByPatient] = await sequelize.query<any>(`
      SELECT "patientId", COUNT(*) as total
      FROM exercise_logs
      GROUP BY "patientId"
      ORDER BY "patientId"
    `, { type: 'SELECT' as any });
    console.log('   Exercise logs by patientId:');
    console.log(JSON.stringify(exerciseByPatient, null, 2));

    // 5. Check meal entries for userId
    console.log(`\n5️⃣  Checking meal entries for userId = ${userId}...`);
    const [mealsCount] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM meal_entries
      WHERE "userId" = :userId
    `, {
      replacements: { userId },
      type: 'SELECT' as any,
    });
    console.log(`   Meal entries: ${mealsCount.total || 0}`);

    // 6. THE KEY QUESTION: Is there an ID mismatch?
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ANALYSIS:\n');

    const totalExerciseForPatient = exerciseCount.total || 0;
    const allExerciseLogs = Array.isArray(exerciseByPatient) ? exerciseByPatient : (exerciseByPatient ? [exerciseByPatient] : []);

    if (totalExerciseForPatient === 0 && allExerciseLogs.length > 0) {
      console.log('   ❌ ID MISMATCH DETECTED!');
      console.log(`   ❌ Patient record says patientId = ${patientId}`);
      console.log(`   ❌ But exercise_logs have data for different patientId(s)`);
      console.log('\n   🔧 SOLUTION: Exercise logs need to be updated to use patientId = ' + patientId);
      console.log('      OR patient.id needs to match existing exercise logs');
    } else if (totalExerciseForPatient > 0) {
      console.log(`   ✅ NO ID MISMATCH - Found ${totalExerciseForPatient} exercise logs for patientId ${patientId}`);
      console.log('   The problem is likely with the date filtering, not ID mapping');
    } else {
      console.log('   ⚠️  No exercise logs found at all');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkPatientIdMapping();
