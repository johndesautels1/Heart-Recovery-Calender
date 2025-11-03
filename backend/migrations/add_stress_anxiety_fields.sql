-- Add stress and anxiety level tracking fields to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10);
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10);

COMMENT ON COLUMN vitals_samples.stress_level IS 'Stress level (1-10 scale, 1=relaxed, 10=very stressed)';
COMMENT ON COLUMN vitals_samples.anxiety_level IS 'Anxiety level (1-10 scale, 1=calm, 10=very anxious)';
