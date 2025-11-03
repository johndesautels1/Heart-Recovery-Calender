-- Add nap tracking, dream journal, and sleep score fields to sleep_logs table
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS is_nap BOOLEAN DEFAULT FALSE;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS nap_duration DECIMAL(4, 2);
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS dream_notes TEXT;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100);

COMMENT ON COLUMN sleep_logs.is_nap IS 'Whether this is a nap (not overnight sleep)';
COMMENT ON COLUMN sleep_logs.nap_duration IS 'Duration of nap in hours';
COMMENT ON COLUMN sleep_logs.dream_notes IS 'Dream journal notes';
COMMENT ON COLUMN sleep_logs.sleep_score IS 'Calculated sleep score (0-100)';

-- Note: sleepGoalHours will be stored in users.preferences JSONB field, no migration needed
