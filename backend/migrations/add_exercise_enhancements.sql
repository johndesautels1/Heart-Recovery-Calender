-- Migration: Add Exercise Enhancements
-- Date: 2025-10-27
-- Description: Add form tips, modifications, weight tracking, ROM, and pain location fields

-- Add new columns to exercises table
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS "formTips" TEXT,
ADD COLUMN IF NOT EXISTS "modifications" TEXT;

COMMENT ON COLUMN exercises."formTips" IS 'Proper form and technique tips';
COMMENT ON COLUMN exercises."modifications" IS 'Exercise modifications for different abilities or limitations';

-- Add new columns to exercise_logs table
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS "weight" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "rangeOfMotion" INTEGER,
ADD COLUMN IF NOT EXISTS "painLocation" VARCHAR(255);

COMMENT ON COLUMN exercise_logs."weight" IS 'Weight used in pounds for progressive overload tracking';
COMMENT ON COLUMN exercise_logs."rangeOfMotion" IS 'Range of motion in degrees (0-180) or percentage (0-100)';
COMMENT ON COLUMN exercise_logs."painLocation" IS 'Location of pain/discomfort (e.g., chest, shoulder, knee)';

-- Create index for faster querying of exercise logs by patient and date
CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient_date ON exercise_logs("patientId", "completedAt");
CREATE INDEX IF NOT EXISTS idx_exercise_logs_prescription ON exercise_logs("prescriptionId");
