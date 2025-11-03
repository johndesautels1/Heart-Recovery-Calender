-- Add dizziness/lightheadedness tracking fields to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS dizziness BOOLEAN;
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS dizziness_severity INTEGER CHECK (dizziness_severity >= 1 AND dizziness_severity <= 10);
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS dizziness_frequency TEXT;

COMMENT ON COLUMN vitals_samples.dizziness IS 'Presence of dizziness/lightheadedness';
COMMENT ON COLUMN vitals_samples.dizziness_severity IS 'Dizziness severity (1-10 scale)';
COMMENT ON COLUMN vitals_samples.dizziness_frequency IS 'How often dizziness occurs';
