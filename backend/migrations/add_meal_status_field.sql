-- Migration: Add status field to meal_entries table
-- Date: November 3, 2025
-- Purpose: Enable meal completion tracking (planned, completed, missed)

-- Add status column to meal_entries table
ALTER TABLE meal_entries
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'missed'));

-- Add index for performance (filtering by status will be common)
CREATE INDEX IF NOT EXISTS idx_meal_entries_status ON meal_entries(status);

-- Add composite index for user queries by status
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_status ON meal_entries("userId", status);

-- Update existing NULL status values to 'planned' (if any)
UPDATE meal_entries SET status = 'planned' WHERE status IS NULL;
