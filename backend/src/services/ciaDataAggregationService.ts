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
    const vitals = await VitalsSample.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'DESC']],
      limit: 10000, // Safety limit
    });

    return vitals.map(v => v.toJSON());
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
    const exercise = await ExerciseLog.findAll({
      where: {
        patientId,
        completedAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['completedAt', 'DESC']],
      limit: 5000,
    });

    return exercise.map(e => e.toJSON());
  }

  private async fetchMeals(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const meals = await MealEntry.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'DESC']],
      limit: 5000,
    });

    return meals.map(m => m.toJSON());
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
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'DESC']],
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
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
    });

    return habits.map(h => h.toJSON());
  }

  private async fetchDailyScores(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const scores = await DailyScore.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
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
    const hasVitals = data.vitals.length > 0;
    const hasSleep = data.sleep.length > 0;
    const hasExercise = data.exercise.length > 0;
    const hasMeals = data.meals.length > 0;
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

    const totalDataPoints =
      data.vitals.length +
      data.sleep.length +
      data.exercise.length +
      data.meals.length +
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
