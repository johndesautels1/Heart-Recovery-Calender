/**
 * Delete all CIA reports for user ID 2
 */

import sequelize from '../models/database';
import CIAReport from '../models/CIAReport';
import CIAReportComment from '../models/CIAReportComment';

async function deleteAllReports() {
  try {
    console.log('🗑️  Starting to delete all CIA reports for user ID 2...');

    // First, get all reports for this user
    const reports = await CIAReport.findAll({
      where: { userId: 2 }
    });

    console.log(`📊 Found ${reports.length} reports to delete`);

    // Delete each report one by one
    for (const report of reports) {
      console.log(`\n🔄 Deleting report ID ${report.id}...`);

      // First delete comments
      const commentsDeleted = await CIAReportComment.destroy({
        where: { reportId: report.id }
      });
      console.log(`  ├─ Deleted ${commentsDeleted} comment(s)`);

      // Then delete the report
      await report.destroy();
      console.log(`  └─ ✅ Report ${report.id} deleted successfully`);
    }

    console.log(`\n🎉 Successfully deleted all ${reports.length} CIA reports!`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

deleteAllReports();
