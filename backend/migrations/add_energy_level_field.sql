-- Add energy level tracking field to vitals_samples table
ALTER TABLE vitals_samples ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10);

COMMENT ON COLUMN vitals_samples.energy_level IS 'Energy level (1-10 scale, 1=exhausted, 10=energetic)';
