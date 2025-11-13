/**
 * Check the format of risk assessment in existing CAI reports
 */

import sequelize from '../models/database';
import CAIReport from '../models/CAIReport';

async function checkRiskAssessmentFormat() {
  try {
    const userId = 2;
    console.log('\n📋 CHECKING RISK ASSESSMENT FORMAT\n');

    const report = await CAIReport.findOne({
      where: { userId },
      order: [['generatedAt', 'DESC']],
    });

    if (!report) {
      console.log('❌ No report found\n');
      return;
    }

    console.log(`Report #${report.id}`);
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`Recovery Score: ${report.recoveryScore}/100`);
    console.log(`Status: ${report.status}\n`);

    console.log('--- RISK ASSESSMENT ---');
    console.log(`Type: ${typeof report.riskAssessment}`);
    if (typeof report.riskAssessment === 'object') {
      const jsonStr = JSON.stringify(report.riskAssessment, null, 2);
      console.log(`\nFull JSON:\n${jsonStr}\n`);
    } else if (typeof report.riskAssessment === 'string') {
      console.log(`Length: ${report.riskAssessment.length} characters`);
      console.log(`\nContent (first 1000 chars):\n${report.riskAssessment.substring(0, 1000)}\n`);
    } else {
      console.log('Value:', report.riskAssessment);
    }

    console.log('--- UNUSUAL FINDINGS ---');
    console.log(`Type: ${typeof report.unusualFindings}`);
    if (typeof report.unusualFindings === 'object') {
      const jsonStr = JSON.stringify(report.unusualFindings, null, 2);
      console.log(`\nFull JSON:\n${jsonStr}\n`);
    } else if (typeof report.unusualFindings === 'string') {
      console.log(`Length: ${report.unusualFindings.length} characters`);
      console.log(`\nContent (first 500 chars):\n${report.unusualFindings.substring(0, 500)}\n`);
    } else {
      console.log('Value:', report.unusualFindings);
    }

    console.log('--- SUMMARY ---');
    console.log(`Type: ${typeof report.summary}`);
    if (typeof report.summary === 'object') {
      const jsonStr = JSON.stringify(report.summary, null, 2);
      console.log(`\nFull JSON:\n${jsonStr}\n`);
    } else if (typeof report.summary === 'string') {
      console.log(`Length: ${report.summary.length} characters`);
      console.log(`\nContent (first 500 chars):\n${report.summary.substring(0, 500)}\n`);
    } else {
      console.log('Value:', report.summary);
    }

    console.log('✅ Check complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkRiskAssessmentFormat();
