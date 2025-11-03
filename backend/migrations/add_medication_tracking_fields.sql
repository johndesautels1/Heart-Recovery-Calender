-- Add effectiveness rating and OTC flag to medications table
ALTER TABLE medications ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5);
ALTER TABLE medications ADD COLUMN IF NOT EXISTS is_otc BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN medications.effectiveness_rating IS 'Effectiveness rating (1-5 stars)';
COMMENT ON COLUMN medications.is_otc IS 'Whether this is an over-the-counter medication';
