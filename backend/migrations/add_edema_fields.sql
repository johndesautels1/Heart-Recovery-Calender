-- Add edema tracking fields to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS edema TEXT;
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS edema_severity VARCHAR(20);

COMMENT ON COLUMN vitals_samples.edema IS 'Location of edema/swelling (ankles/feet/hands/abdomen)';
COMMENT ON COLUMN vitals_samples.edema_severity IS 'Severity of edema/swelling (none/mild/moderate/severe)';
