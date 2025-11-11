import { Op } from 'sequelize';
import { models } from '../models/index';
import Patient from '../models/Patient';
import VitalsSample from '../models/VitalsSample';
import SleepLog from '../models/SleepLog';
import ExerciseLog from '../models/ExerciseLog';
import MealEntry from '../models/MealEntry';
import Medication from '../models/Medication';
import MedicationLog from '../models/MedicationLog';
import HydrationLog from '../models/HydrationLog';
import ECGSample from '../models/ECGSample';
import HabitLog from '../models/HabitLog';
import DailyScore from '../models/DailyScore';
import Provider from '../models/Provider';

export interface DataCompleteness {
  hasVitals: boolean;
  hasSleep: boolean;
  hasExercise: boolean;
  hasMeals: boolean;
  hasMedications: boolean;
  hasHydration: boolean;
  hasECG: boolean;
  hasHabits: boolean;
  totalDataPoints: number;
  dataCategories: string[];
}

export interface AggregatedPatientData {
  patient: any;
  surgeryDate: Date | null;
  daysPostSurgery: number | null;
  analysisStartDate: Date;
  analysisEndDate: Date;
  dataCompleteness: DataCompleteness;
  vitals: any[];
  sleep: any[];
  exercise: any[];
  meals: any[];
  medications: any[];
  medicationLogs: any[];
  hydration: any[];
  ecg: any[];
  habits: any[];
  dailyScores: any[];
  providers: any[];
}

export class CIADataAggregationService {
  /**
   * Aggregate all patient data from Day 0 (surgery date) through analysis period
   * Analysis period: surgery date to current date OR 90 days, whichever is longer
   */
  async aggregatePatientData(userId: number): Promise<AggregatedPatientData> {
    // Get patient record to find surgery date (Day 0)
    const patient = await Patient.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new Error(`No patient profile found for user ${userId}`);
    }

    const surgeryDate = patient.surgeryDate;
    const now = new Date();

    // Calculate analysis period
    let analysisStartDate: Date;
    let analysisEndDate: Date;
    let daysPostSurgery: number | null = null;

    if (surgeryDate) {
      analysisStartDate = new Date(surgeryDate);

      // Calculate days since surgery
      daysPostSurgery = Math.floor((now.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));

      // End date is current date OR 90 days post-surgery, whichever is longer
      const ninetyDaysOut = new Date(surgeryDate);
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

      analysisEndDate = now > ninetyDaysOut ? now : ninetyDaysOut;
    } else {
      // No surgery date: use last 90 days
      analysisEndDate = now;
      analysisStartDate = new Date(now);
      analysisStartDate.setDate(analysisStartDate.getDate() - 90);
    }

    // Fetch all data sources in parallel
    const [
      vitals,
      sleep,
      exercise,
      meals,
      medications,
      medicationLogs,
      hydration,
      ecg,
      habits,
      dailyScores,
      providers,
    ] = await Promise.all([
      this.fetchVitals(userId, analysisStartDate, analysisEndDate),
      this.fetchSleep(userId, analysisStartDate, analysisEndDate),
      this.fetchExercise(patient.id, analysisStartDate, analysisEndDate),
      this.fetchMeals(userId, analysisStartDate, analysisEndDate),
      this.fetchMedications(userId),
      this.fetchMedicationLogs(userId, analysisStartDate, analysisEndDate),
      this.fetchHydration(userId, analysisStartDate, analysisEndDate),
      this.fetchECG(userId, analysisStartDate, analysisEndDate),
      this.fetchHabits(userId, analysisStartDate, analysisEndDate),
      this.fetchDailyScores(userId, analysisStartDate, analysisEndDate),
      this.fetchProviders(userId),
    ]);

    // Calculate data completeness
    const dataCompleteness = this.calculateDataCompleteness({
      vitals,
      sleep,
      exercise,
      meals,
      medications,
      medicationLogs,
      hydration,
      ecg,
      habits,
    });

    return {
      patient: patient.toJSON(),
      surgeryDate,
      daysPostSurgery,
      analysisStartDate,
      analysisEndDate,
      dataCompleteness,
      vitals,
      sleep,
      exercise,
      meals,
      medications,
      medicationLogs,
      hydration,
      ecg,
      habits,
      dailyScores,
      providers,
    };
  }

  private async fetchVitals(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // SMART AGGREGATION: Fetch daily summaries instead of 10,000+ individual readings
    // This reduces data transfer by ~99% while maintaining AI analysis quality

    const [dailySummaries] = await VitalsSample.sequelize!.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as sample_count,
        AVG(heart_rate) as avg_heart_rate,
        MIN(heart_rate) as min_heart_rate,
        MAX(heart_rate) as max_heart_rate,
        STDDEV(heart_rate) as stddev_heart_rate,
        AVG(systolic_bp) as avg_systolic_bp,
        MIN(systolic_bp) as min_systolic_bp,
        MAX(systolic_bp) as max_systolic_bp,
        AVG(diastolic_bp) as avg_diastolic_bp,
        MIN(diastolic_bp) as min_diastolic_bp,
        MAX(diastolic_bp) as max_diastolic_bp,
        AVG(spo2) as avg_spo2,
        MIN(spo2) as min_spo2,
        AVG(respiratory_rate) as avg_respiratory_rate,
        AVG(temperature) as avg_temperature
      FROM vitals_samples
      WHERE user_id = :userId
        AND timestamp BETWEEN :startDate AND :endDate
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    // Fetch critical/abnormal readings for detailed analysis
    const [criticalReadings] = await VitalsSample.sequelize!.query(`
      SELECT *
      FROM vitals_samples
      WHERE user_id = :userId
        AND timestamp BETWEEN :startDate AND :endDate
        AND (
          heart_rate < 50 OR heart_rate > 120 OR
          systolic_bp > 140 OR systolic_bp < 90 OR
          diastolic_bp > 90 OR diastolic_bp < 60 OR
          spo2 < 92
        )
      ORDER BY timestamp DESC
      LIMIT 100
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    return [
      { type: 'daily_summaries', data: dailySummaries },
      { type: 'critical_readings', data: criticalReadings },
    ];
  }

  private async fetchSleep(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const sleep = await SleepLog.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
    });

    return sleep.map(s => s.toJSON());
  }

  private async fetchExercise(patientId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // SMART AGGREGATION: Daily exercise summaries instead of 5,000+ individual logs
    const [dailySummaries] = await ExerciseLog.sequelize!.query(`
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as session_count,
        SUM(actual_duration) as total_duration_minutes,
        SUM(calories_burned) as total_calories,
        SUM(steps) as total_steps,
        SUM(distance_miles) as total_distance_miles,
        AVG(during_heart_rate_avg) as avg_heart_rate_during_exercise,
        MAX(during_heart_rate_max) as max_heart_rate_during_exercise,
        AVG(perceived_exertion) as avg_perceived_exertion,
        AVG(pain_level) as avg_pain_level,
        AVG(difficulty_rating) as avg_difficulty_rating,
        AVG(actual_met) as avg_met
      FROM exercise_logs
      WHERE patient_id = :patientId
        AND completed_at BETWEEN :startDate AND :endDate
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
    `, {
      replacements: { patientId, startDate, endDate },
      type: 'SELECT' as any,
    });

    // Fetch high-intensity or problematic sessions (high pain, high exertion)
    const [noteworthySessions] = await ExerciseLog.sequelize!.query(`
      SELECT *
      FROM exercise_logs
      WHERE patient_id = :patientId
        AND completed_at BETWEEN :startDate AND :endDate
        AND (
          pain_level >= 5 OR
          perceived_exertion >= 8 OR
          during_heart_rate_max > 140 OR
          notes IS NOT NULL
        )
      ORDER BY completed_at DESC
      LIMIT 50
    `, {
      replacements: { patientId, startDate, endDate },
      type: 'SELECT' as any,
    });

    return [
      { type: 'daily_summaries', data: dailySummaries },
      { type: 'noteworthy_sessions', data: noteworthySessions },
    ];
  }

  private async fetchMeals(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // SMART AGGREGATION: Daily nutritional summaries instead of 5,000+ individual meal entries
    const [dailySummaries] = await MealEntry.sequelize!.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as meal_count,
        SUM(calories) as total_calories,
        SUM(protein) as total_protein_g,
        SUM(carbohydrates) as total_carbs_g,
        SUM(total_fat) as total_fat_g,
        SUM(saturated_fat) as total_saturated_fat_g,
        SUM(fiber) as total_fiber_g,
        SUM(sugar) as total_sugar_g,
        SUM(sodium) as total_sodium_mg,
        SUM(cholesterol) as total_cholesterol_mg,
        AVG(satisfaction_rating) as avg_satisfaction,
        SUM(CASE WHEN within_spec = true THEN 1 ELSE 0 END) as meals_within_spec,
        SUM(CASE WHEN within_spec = false THEN 1 ELSE 0 END) as meals_out_of_spec
      FROM meal_entries
      WHERE user_id = :userId
        AND timestamp BETWEEN :startDate AND :endDate
        AND status = 'completed'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    // Fetch meals that exceeded dietary limits (out of spec)
    const [problematicMeals] = await MealEntry.sequelize!.query(`
      SELECT *
      FROM meal_entries
      WHERE user_id = :userId
        AND timestamp BETWEEN :startDate AND :endDate
        AND within_spec = false
      ORDER BY timestamp DESC
      LIMIT 50
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    return [
      { type: 'daily_summaries', data: dailySummaries },
      { type: 'problematic_meals', data: problematicMeals },
    ];
  }

  private async fetchMedications(userId: number): Promise<any[]> {
    const medications = await Medication.findAll({
      where: { userId },
    });

    return medications.map(m => m.toJSON());
  }

  private async fetchMedicationLogs(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const logs = await MedicationLog.findAll({
      where: {
        userId,
        takenTime: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['takenTime', 'DESC']],
      limit: 5000,
    });

    return logs.map(l => l.toJSON());
  }

  private async fetchHydration(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const hydration = await HydrationLog.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
    });

    return hydration.map(h => h.toJSON());
  }

  private async fetchECG(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const ecg = await ECGSample.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'DESC']],
      limit: 1000, // ECG can be huge, limit it
    });

    return ecg.map(e => e.toJSON());
  }

  private async fetchHabits(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const habits = await HabitLog.findAll({
      where: {
        userId,
        completedAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['completedAt', 'DESC']],
    });

    return habits.map(h => h.toJSON());
  }

  private async fetchDailyScores(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const scores = await DailyScore.findAll({
      where: {
        userId,
        scoreDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['scoreDate', 'DESC']],
    });

    return scores.map(s => s.toJSON());
  }

  private async fetchProviders(userId: number): Promise<any[]> {
    const providers = await Provider.findAll({
      where: { userId },
    });

    return providers.map(p => p.toJSON());
  }

  private calculateDataCompleteness(data: {
    vitals: any[];
    sleep: any[];
    exercise: any[];
    meals: any[];
    medications: any[];
    medicationLogs: any[];
    hydration: any[];
    ecg: any[];
    habits: any[];
  }): DataCompleteness {
    // Handle aggregated data structure: [{ type: 'daily_summaries', data: [...] }, { type: 'critical_readings', data: [...] }]
    const getDailySummaryLength = (aggregatedData: any[]): number => {
      const dailySummary = Array.isArray(aggregatedData) && aggregatedData.find((item: any) => item.type === 'daily_summaries');
      return dailySummary?.data?.length || 0;
    };

    const vitalsCount = getDailySummaryLength(data.vitals);
    const exerciseCount = getDailySummaryLength(data.exercise);
    const mealsCount = getDailySummaryLength(data.meals);

    const hasVitals = vitalsCount > 0;
    const hasSleep = data.sleep.length > 0;
    const hasExercise = exerciseCount > 0;
    const hasMeals = mealsCount > 0;
    const hasMedications = data.medications.length > 0 || data.medicationLogs.length > 0;
    const hasHydration = data.hydration.length > 0;
    const hasECG = data.ecg.length > 0;
    const hasHabits = data.habits.length > 0;

    const dataCategories: string[] = [];
    if (hasVitals) dataCategories.push('vitals');
    if (hasSleep) dataCategories.push('sleep');
    if (hasExercise) dataCategories.push('exercise');
    if (hasMeals) dataCategories.push('meals');
    if (hasMedications) dataCategories.push('medications');
    if (hasHydration) dataCategories.push('hydration');
    if (hasECG) dataCategories.push('ecg');
    if (hasHabits) dataCategories.push('habits');

    // Count daily data points (each day = 1 data point, much more manageable)
    const totalDataPoints =
      vitalsCount +
      data.sleep.length +
      exerciseCount +
      mealsCount +
      data.medicationLogs.length +
      data.hydration.length +
      data.ecg.length +
      data.habits.length;

    return {
      hasVitals,
      hasSleep,
      hasExercise,
      hasMeals,
      hasMedications,
      hasHydration,
      hasECG,
      hasHabits,
      totalDataPoints,
      dataCategories,
    };
  }
}

export default new CIADataAggregationService();
