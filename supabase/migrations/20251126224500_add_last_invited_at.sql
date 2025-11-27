-- Add last_invited_at to staff table

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS last_invited_at timestamp with time zone;

COMMENT ON COLUMN staff.last_invited_at IS 'Timestamp of when the last invitation email was sent';
