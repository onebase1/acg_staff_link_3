-- Migration: Add magic_link_tokens table for secure download links
-- Purpose: Store time-limited tokens for client downloads (PDFs, CSVs, Calendar files)

CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    download_type TEXT CHECK (download_type IN ('pdf', 'csv', 'ics')),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Index for fast lookups
CREATE INDEX idx_magic_link_tokens_token ON magic_link_tokens(token);
CREATE INDEX idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);
CREATE INDEX idx_magic_link_tokens_booking_id ON magic_link_tokens(booking_id);

-- RLS: No RLS needed - tokens provide access
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role has full access to magic_link_tokens"
    ON magic_link_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous can read valid tokens (for download links)
CREATE POLICY "Anyone can read valid magic_link_tokens"
    ON magic_link_tokens
    FOR SELECT
    TO anon
    USING (expires_at > NOW() AND used_at IS NULL);

COMMENT ON TABLE magic_link_tokens IS 'Secure time-limited tokens for client downloads. Tokens expire after 30 days and can be used once.';
