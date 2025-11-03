-- Add chest pain tracking fields to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS chest_pain BOOLEAN;
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS chest_pain_severity INTEGER CHECK (chest_pain_severity >= 1 AND chest_pain_severity <= 10);
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS chest_pain_type TEXT;

COMMENT ON COLUMN vitals_samples.chest_pain IS 'Presence of chest pain';
COMMENT ON COLUMN vitals_samples.chest_pain_severity IS 'Chest pain severity (1-10 scale)';
COMMENT ON COLUMN vitals_samples.chest_pain_type IS 'Type of chest pain (sharp/dull/pressure/burning)';
