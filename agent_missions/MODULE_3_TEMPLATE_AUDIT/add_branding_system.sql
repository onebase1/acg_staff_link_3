-- ============================================================
-- MODULE 3: BRANDING SYSTEM - Database Migration
-- ============================================================
--
-- Purpose: Enable multi-tenant white-label branding
-- Created: 2025-12-16
-- Status: READY FOR REVIEW
--
-- This migration creates a comprehensive branding system that allows:
-- 1. SaaS-level default branding (via env variables)
-- 2. Agency-specific branding overrides (custom domains, logos, colors)
-- 3. Dynamic email templates, UI, and notifications
-- ============================================================

-- ============================================================
-- STEP 1: Create saas_configuration table
-- ============================================================

CREATE TABLE IF NOT EXISTS saas_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- SaaS Branding (Agency can override defaults)
  saas_name TEXT DEFAULT 'StaffLink Pro',
  saas_company_name TEXT DEFAULT 'YourCompany Ltd',

  -- Contact Information
  support_email TEXT DEFAULT 'support@stafflinkpro.com',
  support_phone TEXT DEFAULT '+44 20 7946 0958',
  noreply_email TEXT DEFAULT 'noreply@stafflinkpro.com',

  -- Domain Configuration
  from_domain TEXT DEFAULT 'stafflinkpro.com',
  custom_domain TEXT,                    -- For premium agencies (e.g., staffing.dominionhealthcare.co.uk)
  site_url TEXT,                         -- Override site URL (for white-label)
  portal_url TEXT,                       -- Override portal URL
  app_url TEXT,                          -- Override app URL

  -- Visual Branding
  logo_url TEXT,                         -- Agency logo URL
  primary_color TEXT DEFAULT '#667eea',  -- Main brand color
  secondary_color TEXT DEFAULT '#764ba2',-- Accent color
  favicon_url TEXT,                      -- Custom favicon

  -- Email Template Branding
  email_header_color TEXT DEFAULT '#667eea',
  email_footer_text TEXT,                -- Custom footer text (e.g., "Powered by YourCompany")

  -- Feature Flags (Optional - for agency-specific features)
  enable_custom_branding BOOLEAN DEFAULT FALSE,  -- Premium feature flag
  enable_white_label BOOLEAN DEFAULT FALSE,      -- Hide "Powered by StaffLink Pro"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_agency_config UNIQUE (agency_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saas_config_agency ON saas_configuration(agency_id);
CREATE INDEX IF NOT EXISTS idx_saas_config_custom_domain ON saas_configuration(custom_domain) WHERE custom_domain IS NOT NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE saas_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Agencies can only see their own configuration
CREATE POLICY saas_config_agency_isolation ON saas_configuration
  FOR ALL
  USING (
    agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

-- RLS Policy: Service role can access all (for edge functions)
CREATE POLICY saas_config_service_role ON saas_configuration
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- STEP 2: Seed default configuration for existing agencies
-- ============================================================

-- Insert default branding for all existing agencies
INSERT INTO saas_configuration (agency_id, saas_name, saas_company_name, support_email, support_phone, from_domain)
SELECT
  id,
  'ACG StaffLink',                               -- Current SaaS name (will be updated later)
  'Agile Care Management',                       -- Current company name (will be updated later)
  'support@agilecaremanagement.co.uk',          -- Current support email
  '+44 20 1234 5678',                           -- Placeholder support phone
  'agilecaremanagement.co.uk'                   -- Current domain
FROM agencies
WHERE id NOT IN (SELECT agency_id FROM saas_configuration WHERE agency_id IS NOT NULL)
ON CONFLICT (agency_id) DO NOTHING;

-- ============================================================
-- STEP 3: Update existing agencies table (add branding JSONB column as backup)
-- ============================================================

-- Add branding column to agencies table for lightweight customization
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#667eea",
  "secondary_color": "#764ba2"
}'::jsonb;

-- Create index on branding JSONB column
CREATE INDEX IF NOT EXISTS idx_agencies_branding ON agencies USING gin(branding);

-- ============================================================
-- STEP 4: Create helper functions for branding retrieval
-- ============================================================

-- Function: Get branding configuration for an agency
CREATE OR REPLACE FUNCTION get_agency_branding(p_agency_id UUID)
RETURNS TABLE (
  saas_name TEXT,
  saas_company_name TEXT,
  support_email TEXT,
  support_phone TEXT,
  noreply_email TEXT,
  from_domain TEXT,
  custom_domain TEXT,
  site_url TEXT,
  portal_url TEXT,
  app_url TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  email_header_color TEXT,
  email_footer_text TEXT,
  enable_white_label BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.saas_name,
    sc.saas_company_name,
    sc.support_email,
    sc.support_phone,
    sc.noreply_email,
    sc.from_domain,
    sc.custom_domain,
    sc.site_url,
    sc.portal_url,
    sc.app_url,
    sc.logo_url,
    sc.primary_color,
    sc.secondary_color,
    sc.email_header_color,
    sc.email_footer_text,
    sc.enable_white_label
  FROM saas_configuration sc
  WHERE sc.agency_id = p_agency_id
  LIMIT 1;

  -- If no configuration found, return system defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'ACG StaffLink'::TEXT,
      'Agile Care Management'::TEXT,
      'support@agilecaremanagement.co.uk'::TEXT,
      '+44 20 1234 5678'::TEXT,
      'noreply@agilecaremanagement.co.uk'::TEXT,
      'agilecaremanagement.co.uk'::TEXT,
      NULL::TEXT,
      'https://agilecaremanagement.co.uk'::TEXT,
      'https://agilecaremanagement.co.uk/portal'::TEXT,
      'https://agilecaremanagement.co.uk'::TEXT,
      NULL::TEXT,
      '#667eea'::TEXT,
      '#764ba2'::TEXT,
      '#667eea'::TEXT,
      NULL::TEXT,
      FALSE::BOOLEAN;
  END IF;
END;
$$;

-- Function: Update branding configuration
CREATE OR REPLACE FUNCTION update_agency_branding(
  p_agency_id UUID,
  p_updates JSONB
)
RETURNS saas_configuration
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result saas_configuration;
BEGIN
  -- Upsert branding configuration
  INSERT INTO saas_configuration (
    agency_id,
    saas_name,
    saas_company_name,
    support_email,
    support_phone,
    custom_domain,
    logo_url,
    primary_color,
    secondary_color,
    updated_at
  )
  VALUES (
    p_agency_id,
    COALESCE(p_updates->>'saas_name', 'ACG StaffLink'),
    COALESCE(p_updates->>'saas_company_name', 'Agile Care Management'),
    COALESCE(p_updates->>'support_email', 'support@agilecaremanagement.co.uk'),
    COALESCE(p_updates->>'support_phone', '+44 20 1234 5678'),
    p_updates->>'custom_domain',
    p_updates->>'logo_url',
    COALESCE(p_updates->>'primary_color', '#667eea'),
    COALESCE(p_updates->>'secondary_color', '#764ba2'),
    NOW()
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    saas_name = COALESCE(EXCLUDED.saas_name, saas_configuration.saas_name),
    saas_company_name = COALESCE(EXCLUDED.saas_company_name, saas_configuration.saas_company_name),
    support_email = COALESCE(EXCLUDED.support_email, saas_configuration.support_email),
    support_phone = COALESCE(EXCLUDED.support_phone, saas_configuration.support_phone),
    custom_domain = COALESCE(EXCLUDED.custom_domain, saas_configuration.custom_domain),
    logo_url = COALESCE(EXCLUDED.logo_url, saas_configuration.logo_url),
    primary_color = COALESCE(EXCLUDED.primary_color, saas_configuration.primary_color),
    secondary_color = COALESCE(EXCLUDED.secondary_color, saas_configuration.secondary_color),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- STEP 5: Create updated_at trigger
-- ============================================================

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saas_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS saas_config_updated_at ON saas_configuration;
CREATE TRIGGER saas_config_updated_at
  BEFORE UPDATE ON saas_configuration
  FOR EACH ROW
  EXECUTE FUNCTION update_saas_config_timestamp();

-- ============================================================
-- STEP 6: Grant permissions
-- ============================================================

-- Grant permissions to authenticated users (can read their own agency config)
GRANT SELECT ON saas_configuration TO authenticated;

-- Grant permissions to service role (full access for edge functions)
GRANT ALL ON saas_configuration TO service_role;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Query 1: Check if table created successfully
-- SELECT * FROM saas_configuration LIMIT 5;

-- Query 2: Test branding retrieval for an agency
-- SELECT * FROM get_agency_branding('agency-id-here');

-- Query 3: Count configurations per agency
-- SELECT
--   a.name AS agency_name,
--   CASE WHEN sc.id IS NOT NULL THEN 'Configured' ELSE 'Missing' END AS config_status
-- FROM agencies a
-- LEFT JOIN saas_configuration sc ON sc.agency_id = a.id;

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================

-- To rollback this migration:
-- DROP FUNCTION IF EXISTS get_agency_branding(UUID);
-- DROP FUNCTION IF EXISTS update_agency_branding(UUID, JSONB);
-- DROP FUNCTION IF EXISTS update_saas_config_timestamp();
-- DROP TABLE IF EXISTS saas_configuration CASCADE;
-- ALTER TABLE agencies DROP COLUMN IF EXISTS branding;

-- ============================================================
-- DONE! ✅
-- ============================================================

-- Next Steps:
-- 1. Run this migration in Supabase Dashboard → SQL Editor
-- 2. Update .env with new environment variables (SAAS_NAME, SAAS_SUPPORT_EMAIL, etc.)
-- 3. Update edge functions to use get_agency_branding() helper
-- 4. Update React components to fetch branding from database
-- 5. Test multi-tenant isolation
