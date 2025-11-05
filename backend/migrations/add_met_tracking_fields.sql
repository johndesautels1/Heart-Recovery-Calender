-- Add MET tracking fields to exercise_logs table
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS "actualMET" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "targetMETMin" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "targetMETMax" DECIMAL(5, 2);

COMMENT ON COLUMN exercise_logs."actualMET" IS 'Actual MET level achieved during exercise (calculated from heart rate or manually entered)';
COMMENT ON COLUMN exercise_logs."targetMETMin" IS 'Minimum target MET level for this exercise session';
COMMENT ON COLUMN exercise_logs."targetMETMax" IS 'Maximum target MET level for this exercise session';

-- Add target MET fields to exercise_prescriptions table
ALTER TABLE exercise_prescriptions
ADD COLUMN IF NOT EXISTS "targetMETMin" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "targetMETMax" DECIMAL(5, 2);

COMMENT ON COLUMN exercise_prescriptions."targetMETMin" IS 'Target minimum MET level for this exercise prescription';
COMMENT ON COLUMN exercise_prescriptions."targetMETMax" IS 'Target maximum MET level for this exercise prescription';
