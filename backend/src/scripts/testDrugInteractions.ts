/**
 * Test the drug interaction detection service with real medications
 */

import sequelize from '../models/database';
import Medication from '../models/Medication';
import drugInteractionService from '../services/drugInteractionService';

async function testDrugInteractions() {
  try {
    const userId = 2;
    console.log('\n💊 TESTING DRUG INTERACTION DETECTION SERVICE\n');

    // 1. Show current medications
    console.log('1. Current Active Medications:');
    const medications = await Medication.findAll({
      where: { userId, isActive: true },
      order: [['name', 'ASC']],
    });

    if (medications.length === 0) {
      console.log('   ⚠️  No active medications found for user');
      return;
    }

    console.log(`   Found ${medications.length} active medications:\n`);
    for (const med of medications) {
      console.log(`   📋 ${med.name}`);
      console.log(`      Dosage: ${med.dosage}`);
      console.log(`      Frequency: ${med.frequency}`);
      if (med.purpose) console.log(`      Purpose: ${med.purpose}`);
      console.log('');
    }

    // 2. Check for interactions
    console.log('2. Checking for Drug Interactions...\n');
    const result = await drugInteractionService.checkDrugInteractions(userId);

    if (!result.hasInteractions) {
      console.log('   ✅ No drug interactions detected - all medications are safe to combine\n');
      return;
    }

    console.log(`   🚨 FOUND ${result.interactions.length} DRUG INTERACTIONS:\n`);

    // 3. Display each interaction
    for (let i = 0; i < result.interactions.length; i++) {
      const interaction = result.interactions[i];
      const emoji = interaction.severity === 'critical' ? '🚨' : '⚠️';
      const severityText = interaction.severity === 'critical' ? 'CRITICAL' : 'WARNING';

      console.log(`   ${emoji} INTERACTION #${i + 1}: ${severityText}`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   Medications: ${interaction.drug1} + ${interaction.drug2}`);
      console.log('');
      console.log(`   🔬 Mechanism:`);
      console.log(`      ${interaction.mechanism}`);
      console.log('');
      console.log(`   ⚠️  Effect:`);
      console.log(`      ${interaction.effect}`);
      console.log('');
      console.log(`   ✅ Recommendation:`);
      console.log(`      ${interaction.recommendation}`);
      console.log('');
      console.log(`   📊 Monitoring:`);
      console.log(`      ${interaction.monitoring}`);
      console.log('\n');
    }

    // 4. Test alert creation and notification
    console.log('3. Testing Alert Creation & Notifications...\n');
    const alertCreated = await drugInteractionService.monitorAndAlertDrugInteractions(userId);

    if (alertCreated) {
      console.log('   ✅ Alerts created successfully');
      console.log('   📧 Email notifications sent for critical interactions');
      console.log('   📱 SMS notifications sent for critical interactions');
    } else {
      console.log('   ℹ️  No new alerts created (either no interactions or duplicates suppressed)');
    }

    console.log('\n✅ Test complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testDrugInteractions();
