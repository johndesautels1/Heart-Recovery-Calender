-- Migration: Allow NULL prescriptionId for device-synced exercise logs
-- Purpose: Strava and other device integrations sync general workouts that may not be linked to specific prescriptions
-- Date: 2025-11-05

-- Allow NULL values for prescriptionId in exercise_logs table
ALTER TABLE exercise_logs
ALTER COLUMN "prescriptionId" DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN exercise_logs."prescriptionId" IS 'Links to exercise prescription. NULL for device-synced activities not linked to a prescription (e.g., Strava workouts)';
