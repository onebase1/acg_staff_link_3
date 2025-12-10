-- Migration: Create client_contact_invitations table
-- Date: 2025-12-04
-- Purpose: Enable agency admins to invite users to existing clients (like SuperAdmin invites to agencies)

-- Create invitations table
CREATE TABLE IF NOT EXISTS client_contact_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  contact_name TEXT,
  role TEXT DEFAULT 'Manager',
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create index for faster lookups
CREATE INDEX idx_client_contact_invitations_client_id ON client_contact_invitations(client_id);
CREATE INDEX idx_client_contact_invitations_email ON client_contact_invitations(email);
CREATE INDEX idx_client_contact_invitations_status ON client_contact_invitations(status);

-- Enable RLS
ALTER TABLE client_contact_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Agency admins can insert invitations for their clients
CREATE POLICY "Agency admins can invite contacts to their clients"
  ON client_contact_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN profiles p ON p.agency_id = c.agency_id
      WHERE c.id = client_contact_invitations.client_id
        AND p.id = auth.uid()
        AND p.user_type IN ('agency_admin', 'super_admin')
    )
  );

-- Policy: Agency admins can view invitations for their clients
CREATE POLICY "Agency admins can view client invitations"
  ON client_contact_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN profiles p ON p.agency_id = c.agency_id
      WHERE c.id = client_contact_invitations.client_id
        AND p.id = auth.uid()
        AND p.user_type IN ('agency_admin', 'super_admin')
    )
    OR 
    -- Super admins can see all
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.email = 'g.basera@yahoo.com' OR p.user_type = 'super_admin')
    )
  );

-- Policy: Agency admins can update invitation status
CREATE POLICY "Agency admins can update invitation status"
  ON client_contact_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN profiles p ON p.agency_id = c.agency_id
      WHERE c.id = client_contact_invitations.client_id
        AND p.id = auth.uid()
        AND p.user_type IN ('agency_admin', 'super_admin')
    )
  );
