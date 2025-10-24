import { Request, Response } from 'express';
import { Op } from 'sequelize';
import VitalsSample from '../models/VitalsSample';
import MealEntry from '../models/MealEntry';
import Medication from '../models/Medication';
import CalendarEvent from '../models/CalendarEvent';

// GET /api/reports/health-summary - Get comprehensive health summary
export const getHealthSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Fetch vitals data
    const vitals = await VitalsSample.findAll({
      where: {
        userId,
        timestamp: { [Op.between]: [start, end] }
      },
      order: [['timestamp', 'ASC']]
    });

    // Fetch meal data
    const meals = await MealEntry.findAll({
      where: {
        userId,
        timestamp: { [Op.between]: [start, end] }
      },
      order: [['timestamp', 'ASC']]
    });

    // Fetch medications
    const medications = await Medication.findAll({
      where: { userId, isActive: true }
    });

    // Fetch events
    const events = await CalendarEvent.findAll({
      where: {
        startTime: { [Op.between]: [start, end] }
      },
      include: [{ association: 'calendar', where: { userId } }],
      order: [['startTime', 'ASC']]
    });

    // Calculate vitals averages and trends
    const vitalsAverages = calculateVitalsAverages(vitals);
    const vitalsTrends = calculateVitalsTrends(vitals);

    // Calculate meal compliance
    const mealCompliance = calculateMealCompliance(meals);

    // Calculate medication adherence
    const medicationAdherence = calculateMedicationAdherence(events, medications);

    res.json({
      period: { startDate: start, endDate: end },
      vitals: {
        averages: vitalsAverages,
        trends: vitalsTrends,
        totalReadings: vitals.length
      },
      meals: mealCompliance,
      medications: medicationAdherence,
      appointments: {
        total: events.filter(e => e.eventType === 'appointment').length,
        completed: events.filter(e => e.eventType === 'appointment' && e.status === 'completed').length
      }
    });
  } catch (error) {
    console.error('Error generating health summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/reports/compliance - Get detailed compliance analytics
export const getComplianceAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, metric } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let analytics: any = {};

    // Meal compliance by day
    if (!metric || metric === 'meals') {
      const meals = await MealEntry.findAll({
        where: {
          userId,
          timestamp: { [Op.between]: [start, end] }
        },
        order: [['timestamp', 'ASC']]
      });

      analytics.meals = calculateDailyMealCompliance(meals, start, end);
    }

    // Vitals compliance (readings frequency)
    if (!metric || metric === 'vitals') {
      const vitals = await VitalsSample.findAll({
        where: {
          userId,
          timestamp: { [Op.between]: [start, end] }
        },
        order: [['timestamp', 'ASC']]
      });

      analytics.vitals = calculateDailyVitalsCompliance(vitals, start, end);
    }

    // Medication adherence by day
    if (!metric || metric === 'medications') {
      const medications = await Medication.findAll({
        where: { userId, isActive: true }
      });

      const events = await CalendarEvent.findAll({
        where: {
          startTime: { [Op.between]: [start, end] },
          eventType: 'medication'
        },
        include: [{ association: 'calendar', where: { userId } }],
        order: [['startTime', 'ASC']]
      });

      analytics.medications = calculateDailyMedicationCompliance(events, medications, start, end);
    }

    // Overall compliance score
    analytics.overallScore = calculateOverallComplianceScore(analytics);

    res.json({
      period: { startDate: start, endDate: end },
      analytics
    });
  } catch (error) {
    console.error('Error generating compliance analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/reports/export/pdf - Export health report as PDF
export const exportPDF = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    // Note: Actual PDF generation requires pdfkit library
    // For now, returning a placeholder response
    res.status(501).json({
      error: 'PDF export not yet implemented',
      message: 'Install pdfkit and implement PDF generation'
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/reports/export/csv - Export health data as CSV
export const exportCSV = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dataType, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let csvData = '';
    let filename = '';

    switch (dataType) {
      case 'vitals':
        const vitals = await VitalsSample.findAll({
          where: { userId, timestamp: { [Op.between]: [start, end] } },
          order: [['timestamp', 'ASC']]
        });
        csvData = generateVitalsCSV(vitals);
        filename = 'vitals-export.csv';
        break;

      case 'meals':
        const meals = await MealEntry.findAll({
          where: { userId, timestamp: { [Op.between]: [start, end] } },
          order: [['timestamp', 'ASC']]
        });
        csvData = generateMealsCSV(meals);
        filename = 'meals-export.csv';
        break;

      case 'medications':
        const medications = await Medication.findAll({
          where: { userId },
          order: [['createdAt', 'ASC']]
        });
        csvData = generateMedicationsCSV(medications);
        filename = 'medications-export.csv';
        break;

      default:
        return res.status(400).json({ error: 'Invalid dataType. Use: vitals, meals, or medications' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions

function calculateVitalsAverages(vitals: any[]) {
  if (vitals.length === 0) return {};

  const sum: any = {};
  const count: any = {};
  const fields = ['bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate', 'weight',
                  'temperature', 'oxygenSaturation', 'bloodSugar', 'cholesterol', 'ldl', 'hdl', 'triglycerides'];

  vitals.forEach(v => {
    fields.forEach(field => {
      if (v[field] !== null && v[field] !== undefined) {
        sum[field] = (sum[field] || 0) + v[field];
        count[field] = (count[field] || 0) + 1;
      }
    });
  });

  const averages: any = {};
  fields.forEach(field => {
    if (count[field]) {
      averages[field] = Math.round((sum[field] / count[field]) * 10) / 10;
    }
  });

  return averages;
}

function calculateVitalsTrends(vitals: any[]) {
  if (vitals.length < 2) return {};

  const first = vitals[0];
  const last = vitals[vitals.length - 1];
  const trends: any = {};

  const fields = ['bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate', 'weight'];

  fields.forEach(field => {
    if (first[field] && last[field]) {
      const change = last[field] - first[field];
      const percentChange = Math.round((change / first[field]) * 1000) / 10;
      trends[field] = {
        change,
        percentChange,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    }
  });

  return trends;
}

function calculateMealCompliance(meals: any[]) {
  const total = meals.length;
  const compliant = meals.filter(m => m.withinSpec).length;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return {
    totalMeals: total,
    compliantMeals: compliant,
    complianceRate,
    averageCalories: total > 0 ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / total) : 0,
    averageSodium: total > 0 ? Math.round(meals.reduce((sum, m) => sum + (m.sodium || 0), 0) / total) : 0
  };
}

function calculateMedicationAdherence(events: any[], medications: any[]) {
  const medicationEvents = events.filter(e => e.eventType === 'medication');
  const scheduled = medicationEvents.length;
  const taken = medicationEvents.filter(e => e.status === 'completed').length;
  const adherenceRate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;

  return {
    activeMedications: medications.length,
    scheduledDoses: scheduled,
    takenDoses: taken,
    adherenceRate
  };
}

function calculateDailyMealCompliance(meals: any[], start: Date, end: Date) {
  const dailyData: any = {};
  const current = new Date(start);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    dailyData[dateKey] = { total: 0, compliant: 0, rate: 0 };
    current.setDate(current.getDate() + 1);
  }

  meals.forEach(meal => {
    const dateKey = new Date(meal.timestamp).toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].total++;
      if (meal.withinSpec) dailyData[dateKey].compliant++;
    }
  });

  Object.keys(dailyData).forEach(key => {
    const data = dailyData[key];
    data.rate = data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;
  });

  return dailyData;
}

function calculateDailyVitalsCompliance(vitals: any[], start: Date, end: Date) {
  const dailyData: any = {};
  const current = new Date(start);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    dailyData[dateKey] = { readings: 0, compliant: false };
    current.setDate(current.getDate() + 1);
  }

  vitals.forEach(vital => {
    const dateKey = new Date(vital.timestamp).toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].readings++;
      dailyData[dateKey].compliant = dailyData[dateKey].readings >= 1; // At least 1 reading per day
    }
  });

  return dailyData;
}

function calculateDailyMedicationCompliance(events: any[], medications: any[], start: Date, end: Date) {
  const dailyData: any = {};
  const current = new Date(start);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    dailyData[dateKey] = { scheduled: 0, taken: 0, rate: 0 };
    current.setDate(current.getDate() + 1);
  }

  events.forEach(event => {
    const dateKey = new Date(event.startTime).toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].scheduled++;
      if (event.status === 'completed') dailyData[dateKey].taken++;
    }
  });

  Object.keys(dailyData).forEach(key => {
    const data = dailyData[key];
    data.rate = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 0;
  });

  return dailyData;
}

function calculateOverallComplianceScore(analytics: any) {
  const scores: number[] = [];

  if (analytics.meals) {
    const mealDays = Object.values(analytics.meals) as any[];
    const avgMealRate = mealDays.reduce((sum: number, day: any) => sum + day.rate, 0) / mealDays.length;
    scores.push(avgMealRate || 0);
  }

  if (analytics.vitals) {
    const vitalDays = Object.values(analytics.vitals) as any[];
    const compliantDays = vitalDays.filter((day: any) => day.compliant).length;
    const vitalsRate = (compliantDays / vitalDays.length) * 100;
    scores.push(vitalsRate || 0);
  }

  if (analytics.medications) {
    const medDays = Object.values(analytics.medications) as any[];
    const avgMedRate = medDays.reduce((sum: number, day: any) => sum + day.rate, 0) / medDays.length;
    scores.push(avgMedRate || 0);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

function generateVitalsCSV(vitals: any[]): string {
  const headers = 'Timestamp,Systolic BP,Diastolic BP,Heart Rate,Weight,Temperature,Oxygen Sat,Blood Sugar,Cholesterol,LDL,HDL,Triglycerides,Notes\n';
  const rows = vitals.map(v =>
    `${v.timestamp},${v.bloodPressureSystolic || ''},${v.bloodPressureDiastolic || ''},${v.heartRate || ''},${v.weight || ''},${v.temperature || ''},${v.oxygenSaturation || ''},${v.bloodSugar || ''},${v.cholesterol || ''},${v.ldl || ''},${v.hdl || ''},${v.triglycerides || ''},"${v.notes || ''}"`
  ).join('\n');
  return headers + rows;
}

function generateMealsCSV(meals: any[]): string {
  const headers = 'Timestamp,Meal Type,Description,Calories,Sodium,Cholesterol,Saturated Fat,Total Fat,Fiber,Sugar,Protein,Carbs,Within Spec\n';
  const rows = meals.map(m =>
    `${m.timestamp},${m.mealType},"${m.description || ''}",${m.calories || ''},${m.sodium || ''},${m.cholesterol || ''},${m.saturatedFat || ''},${m.totalFat || ''},${m.fiber || ''},${m.sugar || ''},${m.protein || ''},${m.carbohydrates || ''},${m.withinSpec ? 'Yes' : 'No'}`
  ).join('\n');
  return headers + rows;
}

function generateMedicationsCSV(medications: any[]): string {
  const headers = 'Name,Dosage,Frequency,Prescribed By,Start Date,End Date,Refill Date,Pharmacy,Remaining Refills,Active\n';
  const rows = medications.map(m =>
    `"${m.name}","${m.dosage}",${m.frequency},"${m.prescribedBy || ''}",${m.startDate || ''},${m.endDate || ''},${m.refillDate || ''},"${m.pharmacy || ''}",${m.remainingRefills || ''},${m.isActive ? 'Yes' : 'No'}`
  ).join('\n');
  return headers + rows;
}
