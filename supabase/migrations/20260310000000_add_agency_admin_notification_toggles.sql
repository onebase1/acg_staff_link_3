-- Migration: Add multi-admin notification toggles to agencies table
-- Date: 2026-03-10

-- Add columns for multi-admin notification control
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS notify_admins_critical BOOLEAN DEFAULT false;

ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS notify_admins_daily BOOLEAN DEFAULT false;

ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS notify_admins_weekly BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN public.agencies.notify_admins_critical IS 'Whether to send critical alerts (cancellations, etc.) to all agency admins';
COMMENT ON COLUMN public.agencies.notify_admins_daily IS 'Whether to send the daily digest to all agency admins';
COMMENT ON COLUMN public.agencies.notify_admins_weekly IS 'Whether to send the weekly summary to all agency admins';
