-- Migration: Create whatsapp_conversations table
-- Purpose: Track conversation state and context for Kylie AI chatbot
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Create whatsapp_conversations table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,

  -- Notification context linking (for context-aware replies)
  last_notification_id UUID,
  last_notification_template TEXT,
  last_notification_metadata JSONB,
  last_notification_sent_at TIMESTAMPTZ,

  -- Conversation state management
  conversation_state TEXT DEFAULT 'idle',
  -- States: idle, awaiting_confirmation, awaiting_shift_number, awaiting_availability

  pending_action JSONB,
  -- e.g., {"action": "decline_shift", "shift_id": "123", "requires_confirmation": true}

  conversation_history JSONB DEFAULT '[]'::jsonb,
  -- Last 10 messages for context: [{"role": "user", "content": "...", "timestamp": "..."}, ...]

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_conversation_state CHECK (
    conversation_state IN ('idle', 'awaiting_confirmation', 'awaiting_shift_number', 'awaiting_availability', 'awaiting_input')
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conversations_staff ON whatsapp_conversations(staff_id);
CREATE INDEX idx_whatsapp_conversations_updated ON whatsapp_conversations(updated_at DESC);
CREATE INDEX idx_whatsapp_conversations_state ON whatsapp_conversations(conversation_state) WHERE conversation_state != 'idle';

-- Comments for documentation
COMMENT ON TABLE whatsapp_conversations IS 'Tracks conversation state and context for Kylie WhatsApp AI chatbot';
COMMENT ON COLUMN whatsapp_conversations.phone_number IS 'Staff WhatsApp number in E.164 format';
COMMENT ON COLUMN whatsapp_conversations.staff_id IS 'Reference to staff member';
COMMENT ON COLUMN whatsapp_conversations.last_notification_id IS 'ID of last notification sent to this number (for context-aware replies)';
COMMENT ON COLUMN whatsapp_conversations.last_notification_template IS 'Template name of last notification (e.g., shift_reminder, timesheetreminder)';
COMMENT ON COLUMN whatsapp_conversations.last_notification_metadata IS 'Metadata from last notification (shift_id, client_name, etc.)';
COMMENT ON COLUMN whatsapp_conversations.conversation_state IS 'Current conversation state for multi-turn interactions';
COMMENT ON COLUMN whatsapp_conversations.pending_action IS 'Action awaiting confirmation or completion';
COMMENT ON COLUMN whatsapp_conversations.conversation_history IS 'Last 10 messages for conversation context';

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- RLS Policies
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Staff can only see their own conversations
CREATE POLICY whatsapp_conversations_select_own
  ON whatsapp_conversations
  FOR SELECT
  USING (
    staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.whatsapp_number_verified = whatsapp_conversations.phone_number
    )
  );

-- Admins can see all conversations
CREATE POLICY whatsapp_conversations_select_admin
  ON whatsapp_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert/update (for n8n workflows)
CREATE POLICY whatsapp_conversations_service_role
  ON whatsapp_conversations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
