/**
 * Test the new auto-alert creation from CIA reports
 */

import sequelize from '../models/database';
import Alert from '../models/Alert';
import CIAReport from '../models/CIAReport';

async function testAutoAlerts() {
  try {
    const userId = 2;
    console.log('\n🔔 TESTING CIA AUTO-ALERT CREATION\n');

    // Check for recent CIA reports
    console.log('1. Checking for recent CIA reports...');
    const recentReports = await CIAReport.findAll({
      where: { userId },
      order: [['generatedAt', 'DESC']],
      limit: 5,
    });

    console.log(`   Found ${recentReports.length} recent reports\n`);

    if (recentReports.length === 0) {
      console.log('❌ No reports found. Generate a CIA report first.\n');
      return;
    }

    // Check for alerts created for these reports
    console.log('2. Checking for alerts linked to CIA reports...');
    const reportIds = recentReports.map(r => r.id);

    const alerts = await Alert.findAll({
      where: {
        userId,
        relatedEntityType: 'cia_report',
      },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    console.log(`   Found ${alerts.length} total CIA-related alerts\n`);

    // Group alerts by report
    const alertsByReport = new Map<number, any[]>();
    for (const alert of alerts) {
      const reportId = alert.relatedEntityId || 0;
      if (!alertsByReport.has(reportId)) {
        alertsByReport.set(reportId, []);
      }
      alertsByReport.get(reportId)!.push(alert);
    }

    // Display results
    console.log('3. Alert Summary by Report:\n');
    for (const report of recentReports.slice(0, 3)) {
      const reportAlerts = alertsByReport.get(report.id) || [];
      console.log(`   📋 Report #${report.id} (${report.generatedAt})`);
      console.log(`      Recovery Score: ${report.recoveryScore}/100`);
      console.log(`      Status: ${report.status}`);
      console.log(`      Alerts Created: ${reportAlerts.length}`);

      if (reportAlerts.length > 0) {
        for (const alert of reportAlerts) {
          console.log(`      ${alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'} [${alert.severity}] ${alert.title}`);
          console.log(`         Type: ${alert.alertType}`);
          console.log(`         Notification Sent: ${alert.notificationSent ? 'Yes' : 'No'}`);
          if (alert.notificationMethods && alert.notificationMethods.length > 0) {
            console.log(`         Methods: ${alert.notificationMethods.join(', ')}`);
          }
          console.log(`         Resolved: ${alert.resolved ? 'Yes' : 'No'}`);
        }
      } else {
        console.log(`      ⚠️ No alerts created (may be low recovery score with no critical findings)`);
      }
      console.log('');
    }

    // Statistics
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    const notificationsSent = alerts.filter(a => a.notificationSent).length;

    console.log('4. Overall Statistics:');
    console.log(`   Total Alerts: ${alerts.length}`);
    console.log(`   🚨 Critical: ${criticalAlerts}`);
    console.log(`   ⚠️ Warning: ${warningAlerts}`);
    console.log(`   📨 Notifications Sent: ${notificationsSent}`);

    console.log('\n✅ Test complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testAutoAlerts();
