-- Migration: Create Module 1 specific tables (ClientRating, ClientNotification)
-- Date: 2025-12-02
-- Purpose: Staff rating system and in-app notification hub for client portal

-- ============================================================================
-- CREATE client_ratings TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  
  -- Rating Dimensions (1-5 stars each)
  professionalism_rating INTEGER NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  competence_rating INTEGER NOT NULL CHECK (competence_rating BETWEEN 1 AND 5),
  communication_rating INTEGER NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  reliability_rating INTEGER NOT NULL CHECK (reliability_rating BETWEEN 1 AND 5),
  
  -- Overall Rating (auto-calculated)
  overall_rating DECIMAL(3,2) GENERATED ALWAYS AS (
    (professionalism_rating + competence_rating + communication_rating + reliability_rating) / 4.0
  ) STORED,
  
  -- Feedback
  comments TEXT,
  anonymized BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_rating_per_shift UNIQUE (shift_id, contact_id)
);

-- ============================================================================
-- CREATE client_notifications TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  
  -- Notification Details
  type TEXT NOT NULL,
  -- Types: shift_assigned, shift_confirmed, shift_reminder, shift_complete, 
  --        payment_due, payment_overdue, payment_received, compliance_warning, system_update
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Entity (optional)
  related_entity_id UUID,
  related_entity_type TEXT,
  -- Types: shift, invoice, compliance, staff
  
  -- Delivery Channels
  channel TEXT DEFAULT 'in_app',
  -- Channels: in_app, email, sms, whatsapp
  
  -- Status
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'normal',
  -- Priorities: low, normal, high, urgent
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_notification_type CHECK (type IN (
    'shift_assigned', 'shift_confirmed', 'shift_reminder_24h', 'shift_reminder_2h',
    'shift_complete', 'staff_arrived', 'staff_no_show',
    'invoice_generated', 'payment_due', 'payment_overdue', 'payment_received',
    'compliance_warning', 'document_expiring', 'document_expired',
    'system_update', 'feature_announcement', 'maintenance_notice'
  )),
  CONSTRAINT valid_channel CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================================
-- ADD COLUMNS TO SHIFTS TABLE
-- ============================================================================

-- Add client_created flag
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS client_created BOOLEAN DEFAULT FALSE;

-- Add rating_status
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS rating_status TEXT DEFAULT 'awaiting_rating';

-- Add constraint for rating_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'valid_rating_status'
  ) THEN
    ALTER TABLE shifts 
      ADD CONSTRAINT valid_rating_status 
      CHECK (rating_status IN ('awaiting_rating', 'rated', 'disputed', 'not_required'));
  END IF;
END $$;

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- client_ratings indexes
CREATE INDEX IF NOT EXISTS idx_client_ratings_client_id ON client_ratings(client_id);
CREATE INDEX IF NOT EXISTS idx_client_ratings_staff_id ON client_ratings(staff_id);
CREATE INDEX IF NOT EXISTS idx_client_ratings_shift_id ON client_ratings(shift_id);
CREATE INDEX IF NOT EXISTS idx_client_ratings_contact_id ON client_ratings(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_ratings_overall_rating ON client_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_client_ratings_created_at ON client_ratings(created_at DESC);

-- client_notifications indexes
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_contact_id ON client_notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type ON client_notifications(type);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read_at ON client_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_notifications_priority ON client_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- client_ratings RLS
ALTER TABLE client_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings for their client's shifts"
  ON client_ratings
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create ratings for their client's shifts"
  ON client_ratings
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM shifts 
      WHERE shifts.id = shift_id 
      AND shifts.client_id = client_ratings.client_id
    )
  );

CREATE POLICY "Admins can view all ratings"
  ON client_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- client_notifications RLS
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client's notifications"
  ON client_notifications
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
    OR contact_id IN (
      SELECT id FROM client_contacts WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their notifications"
  ON client_notifications
  FOR UPDATE
  USING (
    contact_id IN (
      SELECT id FROM client_contacts WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all notifications"
  ON client_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Calculate staff average rating
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_staff_average_rating(staff_uuid UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT AVG(overall_rating) INTO avg_rating
  FROM client_ratings
  WHERE staff_id = staff_uuid;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM client_notifications cn
  JOIN client_contacts cc ON cn.contact_id = cc.id
  WHERE cc.profile_id = user_id
    AND cn.read_at IS NULL
    AND cn.dismissed_at IS NULL;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- ============================================================================
-- TRIGGER: Update shift rating_status when rating created
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shift_rating_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE shifts
  SET rating_status = 'rated'
  WHERE id = NEW.shift_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_shift_rating_status
  AFTER INSERT ON client_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_rating_status();

-- ============================================================================
-- TRIGGER: Create notification when rating < 3 stars
-- ============================================================================

CREATE OR REPLACE FUNCTION create_low_rating_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.overall_rating < 3.0 THEN
    INSERT INTO client_notifications (
      client_id,
      contact_id,
      type,
      title,
      message,
      related_entity_id,
      related_entity_type,
      priority,
      channel
    )
    SELECT 
      NEW.client_id,
      cc.id,
      'compliance_warning',
      'Low Staff Rating Alert',
      'A shift was rated below 3 stars. Admin review required.',
      NEW.shift_id,
      'shift',
      'high',
      'in_app'
    FROM client_contacts cc
    WHERE cc.client_id = NEW.client_id
      AND cc.is_primary_contact = TRUE
      AND cc.is_active = TRUE
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_low_rating_notification
  AFTER INSERT ON client_ratings
  FOR EACH ROW
  EXECUTE FUNCTION create_low_rating_notification();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_client_ratings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_client_ratings_timestamp
  BEFORE UPDATE ON client_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_client_ratings_updated_at();

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE client_ratings IS 'Client ratings for staff performance after shift completion (Module 1)';
COMMENT ON COLUMN client_ratings.overall_rating IS 'Auto-calculated average of 4 rating dimensions';
COMMENT ON COLUMN client_ratings.anonymized IS 'If true, rating is shown to staff without client name';

COMMENT ON TABLE client_notifications IS 'In-app notifications for client portal users (Module 1)';
COMMENT ON COLUMN client_notifications.type IS 'Notification category for filtering and routing';
COMMENT ON COLUMN client_notifications.priority IS 'Display priority (urgent shows first)';

COMMENT ON COLUMN shifts.client_created IS 'True if shift was created by client via portal (vs agency admin)';
COMMENT ON COLUMN shifts.rating_status IS 'Tracking whether shift has been rated by client';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_ratings') THEN
    RAISE NOTICE '✅ client_ratings table created successfully';
  ELSE
    RAISE EXCEPTION '❌ client_ratings table creation failed';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_notifications') THEN
    RAISE NOTICE '✅ client_notifications table created successfully';
  ELSE
    RAISE EXCEPTION '❌ client_notifications table creation failed';
  END IF;
END $$;
