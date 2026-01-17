-- Migration: Add WhatsApp opt-out columns to staff table
-- Purpose: GDPR compliance - allow staff to opt out of WhatsApp notifications
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Add opt-out columns to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_opt_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_last_interaction_at TIMESTAMPTZ;

-- Create index for fast opt-out checks
CREATE INDEX IF NOT EXISTS idx_staff_whatsapp_opt_out
  ON staff(whatsapp_opt_out)
  WHERE whatsapp_opt_out = TRUE;

CREATE INDEX IF NOT EXISTS idx_staff_whatsapp_last_interaction
  ON staff(whatsapp_last_interaction_at DESC);

-- Comments for documentation
COMMENT ON COLUMN staff.whatsapp_opt_out IS 'TRUE if staff opted out of WhatsApp notifications (via STOP command)';
COMMENT ON COLUMN staff.whatsapp_opt_out_date IS 'When staff opted out of WhatsApp notifications';
COMMENT ON COLUMN staff.whatsapp_last_interaction_at IS 'Last time staff sent a message to Kylie';

-- Function to check if staff can receive non-critical WhatsApp messages
CREATE OR REPLACE FUNCTION can_send_whatsapp(p_staff_id UUID, p_message_type TEXT DEFAULT 'general')
RETURNS BOOLEAN AS $$
DECLARE
  v_staff RECORD;
  v_critical_types TEXT[] := ARRAY[
    'shift_confirmation',
    'shift_cancellation_urgent',
    'timesheet_approval',
    'payment_processed',
    'compliance_critical'
  ];
BEGIN
  SELECT * INTO v_staff
  FROM staff
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If opted out, only send critical messages
  IF v_staff.whatsapp_opt_out THEN
    RETURN p_message_type = ANY(v_critical_types);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle opt-out (called from n8n when user sends "STOP")
CREATE OR REPLACE FUNCTION whatsapp_opt_out(p_staff_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE staff
  SET whatsapp_opt_out = TRUE,
      whatsapp_opt_out_date = NOW()
  WHERE id = p_staff_id;

  -- Log to change_logs
  INSERT INTO change_logs (
    table_name,
    record_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    'staff',
    p_staff_id,
    p_staff_id,
    'whatsapp_opt_out',
    jsonb_build_object('whatsapp_opt_out', FALSE),
    jsonb_build_object('whatsapp_opt_out', TRUE, 'whatsapp_opt_out_date', NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle opt-in (called from n8n when user sends "START")
CREATE OR REPLACE FUNCTION whatsapp_opt_in(p_staff_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE staff
  SET whatsapp_opt_out = FALSE,
      whatsapp_opt_out_date = NULL
  WHERE id = p_staff_id;

  -- Log to change_logs
  INSERT INTO change_logs (
    table_name,
    record_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    'staff',
    p_staff_id,
    p_staff_id,
    'whatsapp_opt_in',
    jsonb_build_object('whatsapp_opt_out', TRUE),
    jsonb_build_object('whatsapp_opt_out', FALSE, 'whatsapp_opt_out_date', NULL)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update last interaction timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_last_interaction(p_staff_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE staff
  SET whatsapp_last_interaction_at = NOW()
  WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql;
