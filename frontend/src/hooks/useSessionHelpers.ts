import { useMemo } from 'react';
import { addMonths, addWeeks, addDays, startOfDay, endOfDay } from 'date-fns';
import { useSession } from '../contexts/SessionContext';
import type { MedicalData } from '../contexts/SessionContext';

/**
 * TimeView type for date range calculations
 */
export type TimeView = 'day' | 'week' | 'month' | '3month' | 'year' | 'all';

/**
 * Date range result
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  surgeryDate: Date | null;
}

/**
 * Custom hook: Get surgery date with fallback logic
 *
 * Priority:
 * 1. Selected patient's surgery date (for therapists viewing patient)
 * 2. Authenticated user's surgery date (for patients)
 * 3. null if no surgery date available
 *
 * Usage:
 * ```typescript
 * const { surgeryDate, hasSurgeryDate, postSurgeryDays } = useSurgeryDate();
 * ```
 */
export function useSurgeryDate() {
  const { user, selectedPatient, surgeryDate: userSurgeryDate } = useSession();

  const surgeryDate = useMemo(() => {
    // Priority 1: Selected patient's surgery date (therapist viewing patient)
    if (selectedPatient?.surgeryDate) {
      return new Date(selectedPatient.surgeryDate);
    }

    // Priority 2: User's surgery date (patient viewing own data)
    if (userSurgeryDate) {
      return new Date(userSurgeryDate);
    }

    // No surgery date available
    return null;
  }, [selectedPatient, userSurgeryDate]);

  const hasSurgeryDate = surgeryDate !== null;

  // Calculate days since surgery
  const postSurgeryDays = useMemo(() => {
    if (!surgeryDate) return null;

    const today = startOfDay(new Date());
    const surgery = startOfDay(surgeryDate);
    const diffMs = today.getTime() - surgery.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }, [surgeryDate]);

  return {
    surgeryDate,
    hasSurgeryDate,
    postSurgeryDays,
    surgeryDateString: surgeryDate?.toISOString().split('T')[0] || null,
  };
}

/**
 * Custom hook: Get patient medical data from JSONB field
 *
 * Returns medical data for:
 * - Selected patient (if therapist viewing patient)
 * - Authenticated user (if patient)
 * - null if no medical data available
 *
 * Usage:
 * ```typescript
 * const {
 *   medicalData,
 *   demographics,
 *   cardiac,
 *   devices,
 *   measurements
 * } = usePatientData();
 * ```
 */
export function usePatientData() {
  const { user, selectedPatient, patientData } = useSession();

  const medicalData: MedicalData | null = useMemo(() => {
    // Priority 1: Selected patient's medical data (therapist viewing patient)
    if (selectedPatient?.medicalData) {
      return selectedPatient.medicalData;
    }

    // Priority 2: User's medical data (patient viewing own data)
    if (patientData) {
      return patientData;
    }

    return null;
  }, [selectedPatient, patientData]);

  // Extract specific sections for convenience
  const demographics = medicalData?.demographics || null;
  const contact = medicalData?.contact || null;
  const address = medicalData?.address || null;
  const emergencyContacts = medicalData?.emergencyContacts || [];
  const measurements = medicalData?.measurements || null;
  const surgery = medicalData?.surgery || null;
  const history = medicalData?.history || null;
  const cardiac = medicalData?.cardiac || null;
  const devices = medicalData?.devices || null;
  const telehealth = medicalData?.telehealth || null;

  return {
    medicalData,
    demographics,
    contact,
    address,
    emergencyContacts,
    measurements,
    surgery,
    history,
    cardiac,
    devices,
    telehealth,
    hasMedicalData: medicalData !== null,
  };
}

/**
 * Custom hook: Calculate date range based on timeView
 *
 * Default behavior (no dates provided):
 * - If surgery date exists: surgery date to +1 month from today
 * - If no surgery date: today to +1 month from today
 *
 * TimeView overrides:
 * - 'day': Today only
 * - 'week': Last 7 days
 * - 'month': Last 30 days
 * - '3month': Last 90 days
 * - 'year': Last 365 days
 * - 'all': Surgery date (or 1 year ago) to today
 *
 * Usage:
 * ```typescript
 * const { startDate, endDate, surgeryDate } = useDateRange('week');
 * const customRange = useDateRange('all', new Date('2024-01-01'), new Date('2024-12-31'));
 * ```
 */
export function useDateRange(
  timeView: TimeView = 'all',
  customStartDate?: Date | string,
  customEndDate?: Date | string
): DateRange {
  const { surgeryDate } = useSurgeryDate();

  const dateRange = useMemo(() => {
    const today = new Date();

    // If custom dates provided, use them explicitly
    if (customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
        surgeryDate,
      };
    }

    // Calculate based on timeView
    let startDate: Date;
    let endDate: Date;

    switch (timeView) {
      case 'day':
        // Today only
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;

      case 'week':
        // Last 7 days
        startDate = addDays(startOfDay(today), -7);
        endDate = endOfDay(today);
        break;

      case 'month':
        // Last 30 days
        startDate = addDays(startOfDay(today), -30);
        endDate = endOfDay(today);
        break;

      case '3month':
        // Last 90 days
        startDate = addMonths(startOfDay(today), -3);
        endDate = endOfDay(today);
        break;

      case 'year':
        // Last 365 days
        startDate = addDays(startOfDay(today), -365);
        endDate = endOfDay(today);
        break;

      case 'all':
      default:
        // Surgery date to +1 month from today (or 1 year ago to +1 month if no surgery date)
        if (surgeryDate) {
          startDate = startOfDay(surgeryDate);
        } else {
          // Fallback: 1 year ago
          startDate = addDays(startOfDay(today), -365);
        }
        endDate = endOfDay(addMonths(today, 1));
        break;
    }

    return {
      startDate,
      endDate,
      surgeryDate,
    };
  }, [timeView, customStartDate, customEndDate, surgeryDate]);

  return dateRange;
}

/**
 * Custom hook: Get target user ID for API queries
 *
 * Returns:
 * - Selected patient's user ID (if therapist viewing patient)
 * - Authenticated user's ID (if patient)
 *
 * Usage:
 * ```typescript
 * const { targetUserId, isViewingOwnData } = useTargetUserId();
 * const url = `/api/vitals?userId=${targetUserId}`;
 * ```
 */
export function useTargetUserId() {
  const { user, selectedPatient, isViewingAsTherapist } = useSession();

  const targetUserId = useMemo(() => {
    // If therapist viewing a patient, use selected patient's ID
    if (isViewingAsTherapist && selectedPatient) {
      return selectedPatient.userId || selectedPatient.id;
    }

    // Otherwise, use authenticated user's ID
    return user?.id || null;
  }, [user, selectedPatient, isViewingAsTherapist]);

  const isViewingOwnData = user?.id === targetUserId;

  return {
    targetUserId,
    isViewingOwnData,
    hasTargetUser: targetUserId !== null,
  };
}
