-- Add satisfaction rating to meal_entries table
ALTER TABLE meal_entries ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);

COMMENT ON COLUMN meal_entries.satisfaction_rating IS 'Meal satisfaction rating (1-5 stars)';
