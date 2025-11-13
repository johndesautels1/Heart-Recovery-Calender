/**
 * Custom hooks for Heart Recovery Calendar
 *
 * Session-related hooks:
 * - useSurgeryDate: Get surgery date with fallback logic
 * - usePatientData: Get patient medical data from JSONB
 * - useDateRange: Calculate date range based on timeView
 * - useTargetUserId: Get target user ID for API queries
 */

export {
  useSurgeryDate,
  usePatientData,
  useDateRange,
  useTargetUserId,
  type TimeView,
  type DateRange,
} from './useSessionHelpers';
