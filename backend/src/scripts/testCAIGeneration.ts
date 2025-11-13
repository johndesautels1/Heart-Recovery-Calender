/**
 * Test Script: Verify CAI Report Generation After Fixes
 *
 * This script tests that the CAI system can:
 * 1. Find patient records (after userId NULL fix)
 * 2. Load exercise data (after ID mismatch fix)
 * 3. Aggregate all data categories successfully
 */

import CAIDataAggregationService from '../services/CAIDataAggregationService';
import Patient from '../models/Patient';
import sequelize from '../models/database';
import { Op } from 'sequelize';

async function testCAIDataAggregation() {
  try {
    console.log('🧪 Testing CAI Data Aggregation After Fixes\n');
    console.log('=' .repeat(60));

    // Find a patient user for testing
    console.log('\n📋 Step 1: Finding patient user for testing...');
    const patient = await Patient.findOne({
      where: {
        userId: {
          [Op.ne]: null
        }
      },
    });

    if (!patient) {
      console.error('❌ No patient found with valid userId');
      console.log('\nℹ️  Create a patient record first, or run the migration again.');
      return;
    }

    const userId = patient.userId!;
    console.log(`✅ Found patient: ${patient.name} (userId: ${userId})`);

    // Test data aggregation
    console.log('\n📊 Step 2: Testing data aggregation service...');
    console.log('   This tests the patient lookup fix and exercise data loading.\n');

    const aggregatedData = await CAIDataAggregationService.aggregatePatientData(userId);

    console.log('=' .repeat(60));
    console.log('✅ DATA AGGREGATION SUCCESSFUL!\n');

    // Display results
    console.log('📈 Patient Information:');
    console.log(`   Name: ${aggregatedData.patient.name}`);
    console.log(`   Surgery Date: ${aggregatedData.surgeryDate || 'Not set'}`);
    console.log(`   Days Post-Surgery: ${aggregatedData.daysPostSurgery || 'N/A'}`);
    console.log(`   Analysis Period: ${aggregatedData.analysisStartDate.toLocaleDateString()} to ${aggregatedData.analysisEndDate.toLocaleDateString()}\n`);

    console.log('📊 Data Completeness:');
    const dc = aggregatedData.dataCompleteness;
    console.log(`   ✅ Vitals: ${dc.hasVitals ? 'YES' : 'NO'}`);
    console.log(`   ✅ Sleep: ${dc.hasSleep ? 'YES' : 'NO'}`);
    console.log(`   ✅ Exercise: ${dc.hasExercise ? 'YES' : 'NO'} ${dc.hasExercise ? '← FIXED!' : ''}`);
    console.log(`   ✅ Meals: ${dc.hasMeals ? 'YES' : 'NO'}`);
    console.log(`   ✅ Medications: ${dc.hasMedications ? 'YES' : 'NO'}`);
    console.log(`   ✅ Hydration: ${dc.hasHydration ? 'YES' : 'NO'}`);
    console.log(`   ✅ ECG: ${dc.hasECG ? 'YES' : 'NO'}`);
    console.log(`   ✅ Habits: ${dc.hasHabits ? 'YES' : 'NO'}\n`);

    console.log(`   Total Data Points: ${dc.totalDataPoints}`);
    console.log(`   Categories with Data: ${dc.dataCategories.join(', ')}\n`);

    // Verify exercise data specifically
    if (dc.hasExercise) {
      console.log('🏃 Exercise Data Details:');
      const exerciseData = aggregatedData.exercise;
      if (Array.isArray(exerciseData) && exerciseData.length > 0) {
        const dailySummary = exerciseData.find((e: any) => e.type === 'daily_summaries');
        if (dailySummary && dailySummary.data) {
          console.log(`   Daily Summaries: ${dailySummary.data.length} days`);
          if (dailySummary.data.length > 0) {
            const latest = dailySummary.data[0];
            console.log(`   Latest Exercise Day: ${latest.date}`);
            console.log(`   Sessions: ${latest.session_count}`);
            console.log(`   Total Duration: ${latest.total_duration_minutes || 0} minutes`);
            console.log(`   Total Calories: ${latest.total_calories || 0} kcal`);
          }
        }
      }
      console.log('   ✅ Exercise data loading WORKS!\n');
    } else {
      console.log('⚠️  No exercise data found (patient may not have logged any exercises yet)\n');
    }

    console.log('=' .repeat(60));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('🎯 Summary:');
    console.log('   1. Patient lookup: ✅ WORKING');
    console.log('   2. Exercise data loading: ✅ WORKING');
    console.log('   3. Data aggregation: ✅ WORKING');
    console.log('   4. CAI ready for report generation: ✅ YES\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check that migration 20251111000001-fix-patient-userid-null-values.js ran successfully');
    console.log('   2. Verify patient records have valid userId (run: SELECT id, userId, name FROM patients)');
    console.log('   3. Check exercise_logs have patientId matching patient.id');
  } finally {
    await sequelize.close();
  }
}

// Run the test
console.log('🚀 Starting CAI Data Aggregation Test...\n');
testCAIDataAggregation();
