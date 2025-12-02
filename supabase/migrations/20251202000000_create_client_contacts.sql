-- Migration: Create ClientContact table for Module 1-4 support
-- Date: 2025-12-02
-- Purpose: Enable RBAC, multi-contact per client, notification preferences, chatbot verification

-- ============================================================================
-- CREATE client_contacts TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role-Based Access Control (Module 1)
  role TEXT NOT NULL DEFAULT 'OPERATIONS_MANAGER',
  -- Options: OPERATIONS_MANAGER, FINANCE_MANAGER, FACILITY_COORDINATOR, VIEW_ONLY_CONTACT
  
  -- Contact Information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,  -- For chatbot verification (Module 4)
  job_title TEXT,
  department TEXT,
  
  -- Notification Preferences (Module 2)
  notification_preferences JSONB DEFAULT '{
    "shift_assigned": true,
    "shift_24h_reminder": true,
    "shift_2h_reminder": true,
    "shift_complete": true,
    "rating_reminder": true,
    "invoice_notification": true,
    "payment_reminder": true,
    "compliance_warning": true,
    "system_updates": false,
    "promotional": false
  }'::jsonb,
  
  -- Contact Status
  is_primary_contact BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Constraints
  CONSTRAINT unique_profile_per_client UNIQUE (client_id, profile_id),
  CONSTRAINT valid_role CHECK (role IN (
    'OPERATIONS_MANAGER', 
    'FINANCE_MANAGER', 
    'FACILITY_COORDINATOR', 
    'VIEW_ONLY_CONTACT'
  ))
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_profile_id ON client_contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_phone_number ON client_contacts(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_role ON client_contacts(role);
CREATE INDEX IF NOT EXISTS idx_client_contacts_is_active ON client_contacts(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contacts for their own client
CREATE POLICY "Users can view their client contacts"
  ON client_contacts
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own contact record
CREATE POLICY "Users can update their own contact"
  ON client_contacts
  FOR UPDATE
  USING (
    profile_id = auth.uid()
  );

-- Policy: Admins/Agency staff can view all contacts
CREATE POLICY "Admins can view all contacts"
  ON client_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- BACKFILL EXISTING CLIENT USERS
-- ============================================================================

-- Insert contact records for all existing client users
INSERT INTO client_contacts (
  client_id, 
  profile_id, 
  role, 
  first_name, 
  last_name, 
  email, 
  phone_number, 
  is_primary_contact,
  created_by
)
SELECT 
  p.client_id,
  p.id AS profile_id,
  'OPERATIONS_MANAGER' AS role,  -- Default all existing users to Operations Manager
  SPLIT_PART(p.full_name, ' ', 1) AS first_name,
  COALESCE(NULLIF(SPLIT_PART(p.full_name, ' ', 2), ''), SPLIT_PART(p.full_name, ' ', 1)) AS last_name,
  p.email,
  p.phone AS phone_number,
  TRUE AS is_primary_contact,  -- Mark as primary (first contact)
  'migration_backfill' AS created_by
FROM profiles p
WHERE p.client_id IS NOT NULL
  AND p.user_type = 'client'
  AND NOT EXISTS (
    -- Don't insert duplicates if migration already ran
    SELECT 1 FROM client_contacts cc 
    WHERE cc.profile_id = p.id
  );

-- ============================================================================
-- HELPER FUNCTION: Get contact role for user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_client_contact_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM client_contacts
  WHERE profile_id = user_id
    AND is_active = TRUE
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'VIEW_ONLY_CONTACT');
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user has permission
-- ============================================================================

CREATE OR REPLACE FUNCTION has_client_permission(
  user_id UUID,
  required_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  role_hierarchy JSONB;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM client_contacts
  WHERE profile_id = user_id
    AND is_active = TRUE
  LIMIT 1;
  
  -- If no role found, return false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Role hierarchy (higher roles inherit lower role permissions)
  role_hierarchy := '{
    "OPERATIONS_MANAGER": ["OPERATIONS_MANAGER", "FACILITY_COORDINATOR", "VIEW_ONLY_CONTACT"],
    "FINANCE_MANAGER": ["FINANCE_MANAGER", "VIEW_ONLY_CONTACT"],
    "FACILITY_COORDINATOR": ["FACILITY_COORDINATOR", "VIEW_ONLY_CONTACT"],
    "VIEW_ONLY_CONTACT": ["VIEW_ONLY_CONTACT"]
  }'::jsonb;
  
  -- Check if user's role includes required role
  RETURN role_hierarchy->user_role ? required_role;
END;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_client_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_client_contacts_timestamp
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_client_contacts_updated_at();

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE client_contacts IS 'Client contact records with RBAC roles for multi-user client portal access (Module 1-4 dependency)';
COMMENT ON COLUMN client_contacts.role IS 'RBAC role: OPERATIONS_MANAGER (full access), FINANCE_MANAGER (billing only), FACILITY_COORDINATOR (assigned shifts), VIEW_ONLY_CONTACT (read only)';
COMMENT ON COLUMN client_contacts.notification_preferences IS 'Per-contact notification preferences for Module 2';
COMMENT ON COLUMN client_contacts.phone_number IS 'Phone number for WhatsApp/SMS verification in Module 4 chatbot';
COMMENT ON COLUMN client_contacts.is_primary_contact IS 'Primary contact receives critical notifications and has elevated permissions';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_contacts') THEN
    RAISE NOTICE '✅ client_contacts table created successfully';
  ELSE
    RAISE EXCEPTION '❌ client_contacts table creation failed';
  END IF;
END $$;

-- Verify backfill completed
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfill_count FROM client_contacts WHERE created_by = 'migration_backfill';
  RAISE NOTICE '✅ Backfilled % existing client contacts', backfill_count;
END $$;
