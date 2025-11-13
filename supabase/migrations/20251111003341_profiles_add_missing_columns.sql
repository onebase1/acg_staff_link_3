-- Migration: Add missing columns to profiles
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 2

-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ;
COMMENT ON COLUMN profiles.created_date IS 'Auto-generated';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
COMMENT ON COLUMN profiles.role IS 'admin/user';

-- Migration completed
