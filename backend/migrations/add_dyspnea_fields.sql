-- Add shortness of breath (dyspnea) tracking fields to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS dyspnea INTEGER CHECK (dyspnea >= 0 AND dyspnea <= 4);
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS dyspnea_triggers TEXT;

COMMENT ON COLUMN vitals_samples.dyspnea IS 'Shortness of breath scale (0=none, 1=mild, 2=moderate, 3=severe, 4=very severe)';
COMMENT ON COLUMN vitals_samples.dyspnea_triggers IS 'What triggers shortness of breath';
