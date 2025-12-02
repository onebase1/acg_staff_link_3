-- Migration: Add Scoring Columns for Module 3
-- Description: Adds reliability_score to staff, desirability_score to clients, and creates score_history table.

-- 1. Update Staff Table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS reliability_score INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{"base": 50}',
ADD COLUMN IF NOT EXISTS last_score_update TIMESTAMPTZ;

-- 2. Update Clients Table (Note: table name might be 'clients' or 'agencies' depending on schema, assuming 'clients' based on spec)
-- Checking previous migrations, 'clients' table exists.
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS desirability_score INT DEFAULT 70,
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{"base": 70}';

-- 3. Create Score History Table
CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Optional, if tracking client score history too
    old_score INT,
    new_score INT,
    change_reason TEXT,
    change_amount INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_staff_reliability_score ON staff(reliability_score);
CREATE INDEX IF NOT EXISTS idx_score_history_staff_id ON score_history(staff_id);
