/**
 * Test what data is being passed to the CIA AI prompt
 */

import ciaDataAggregationService from '../services/ciaDataAggregationService';

async function testPromptData() {
  try {
    const userId = 2;
    console.log('\n📋 TESTING CIA PROMPT DATA STRUCTURE\n');

    const aggregatedData = await ciaDataAggregationService.aggregatePatientData(userId);

    console.log('✅ Data aggregation complete\n');

    console.log('📊 VITALS STRUCTURE:');
    console.log(`   data.vitals.length = ${aggregatedData.vitals.length}`);
    console.log(`   data.vitals =`, JSON.stringify(aggregatedData.vitals, null, 2).substring(0, 500));

    const vitalsDailySummaries = aggregatedData.vitals.find((v: any) => v.type === 'daily_summaries');
    console.log(`   \n   Actual daily_summaries count = ${vitalsDailySummaries?.data?.length || 0}`);
    if (vitalsDailySummaries?.data?.length > 0) {
      console.log(`   First day:`, vitalsDailySummaries.data[0]);
    }

    console.log('\n🍽️  MEALS STRUCTURE:');
    console.log(`   data.meals.length = ${aggregatedData.meals.length}`);
    console.log(`   data.meals =`, JSON.stringify(aggregatedData.meals, null, 2).substring(0, 500));

    const mealsDailySummaries = aggregatedData.meals.find((m: any) => m.type === 'daily_summaries');
    console.log(`   \n   Actual daily_summaries count = ${mealsDailySummaries?.data?.length || 0}`);
    if (mealsDailySummaries?.data?.length > 0) {
      console.log(`   First day:`, mealsDailySummaries.data[0]);
    }

    console.log('\n🏃 EXERCISE STRUCTURE:');
    console.log(`   data.exercise.length = ${aggregatedData.exercise.length}`);
    console.log(`   data.exercise =`, JSON.stringify(aggregatedData.exercise, null, 2).substring(0, 500));

    const exerciseDailySummaries = aggregatedData.exercise.find((e: any) => e.type === 'daily_summaries');
    console.log(`   \n   Actual daily_summaries count = ${exerciseDailySummaries?.data?.length || 0}`);
    if (exerciseDailySummaries?.data?.length > 0) {
      console.log(`   First day:`, exerciseDailySummaries.data[0]);
    }

    console.log('\n📦 DATA COMPLETENESS:');
    console.log(JSON.stringify(aggregatedData.dataCompleteness, null, 2));

    console.log('\n✅ Test complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testPromptData();
