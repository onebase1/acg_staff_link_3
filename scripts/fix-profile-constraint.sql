-- Fix magic_link_tokens constraint to allow 'profile' download type
-- Required for Module 34 privacy fix: staff profile magic links

ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_download_type_check;
ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_download_type_check
CHECK (download_type IN ('pdf', 'csv', 'ics', 'profile'));

-- Verify constraint was updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'magic_link_tokens'::regclass
AND conname = 'magic_link_tokens_download_type_check';
