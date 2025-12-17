-- Migration: Staff Gamification & Redemption System
-- Module: MODULE_6_SHIFT_AUTOMATION Phase 5
-- Description: Adds streak tracking, badges table, and RPC for streak updates

-- ============================================
-- 1. ADD STREAK TRACKING COLUMNS TO STAFF
-- ============================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS urgent_shifts_covered INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_incident_date TIMESTAMPTZ;

COMMENT ON COLUMN staff.current_streak IS 'Consecutive completed shifts without incident';
COMMENT ON COLUMN staff.longest_streak IS 'Highest streak ever achieved';
COMMENT ON COLUMN staff.urgent_shifts_covered IS 'Count of urgent shifts (24h notice) covered';
COMMENT ON COLUMN staff.last_incident_date IS 'Last no-show or late cancellation date for time decay calculation';

-- ============================================
-- 2. CREATE STAFF BADGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS staff_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  UNIQUE(staff_id, badge_type)
);

COMMENT ON TABLE staff_badges IS 'Staff achievement badges. Types: reliable (10+ shifts), on_fire (5+ streak), redeemed (recovered <50 to 70+), client_favorite (3+ 5-star ratings), urgency_hero (3+ urgent shifts), rising_star (20+ pts increase in 30 days)';

-- ============================================
-- 3. RLS FOR STAFF_BADGES
-- ============================================

ALTER TABLE staff_badges ENABLE ROW LEVEL SECURITY;

-- Staff can view their own badges
CREATE POLICY "Staff can view own badges" ON staff_badges
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

-- Admin can view all badges in their agency
CREATE POLICY "Admin can view agency badges" ON staff_badges
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- System/Admin can insert badges
CREATE POLICY "System can insert badges" ON staff_badges
  FOR INSERT WITH CHECK (true);

-- Admin can delete badges
CREATE POLICY "Admin can delete badges" ON staff_badges
  FOR DELETE USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 4. RPC: UPDATE STAFF STREAK
-- ============================================

CREATE OR REPLACE FUNCTION update_staff_streak(p_staff_id UUID, p_completed BOOLEAN)
RETURNS void AS $$
BEGIN
  IF p_completed THEN
    -- Increment streak on successful completion
    UPDATE staff
    SET
      current_streak = COALESCE(current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1)
    WHERE id = p_staff_id;
  ELSE
    -- Reset streak on no-show/cancellation
    UPDATE staff
    SET
      current_streak = 0,
      last_incident_date = NOW()
    WHERE id = p_staff_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_staff_streak IS 'Updates staff streak counter. Call with p_completed=true for successful shift, false for incident.';

-- ============================================
-- 5. RPC: INCREMENT URGENT SHIFTS COVERED
-- ============================================

CREATE OR REPLACE FUNCTION increment_urgent_shifts(p_staff_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE staff
  SET urgent_shifts_covered = COALESCE(urgent_shifts_covered, 0) + 1
  WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_urgent_shifts IS 'Increments the urgent shifts covered counter for staff gamification.';

-- ============================================
-- 6. RPC: AWARD BADGE
-- ============================================

CREATE OR REPLACE FUNCTION award_badge(
  p_staff_id UUID,
  p_badge_type TEXT,
  p_badge_name TEXT,
  p_badge_icon TEXT DEFAULT '🏆'
)
RETURNS UUID AS $$
DECLARE
  v_badge_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get agency_id from staff
  SELECT agency_id INTO v_agency_id FROM staff WHERE id = p_staff_id;
  
  -- Insert badge (ignore if already exists due to UNIQUE constraint)
  INSERT INTO staff_badges (staff_id, badge_type, badge_name, badge_icon, agency_id)
  VALUES (p_staff_id, p_badge_type, p_badge_name, p_badge_icon, v_agency_id)
  ON CONFLICT (staff_id, badge_type) DO NOTHING
  RETURNING id INTO v_badge_id;
  
  RETURN v_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_badge IS 'Awards a badge to staff. Idempotent - will not duplicate badges.';

-- ============================================
-- 7. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_badges_staff_id ON staff_badges(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_badges_agency_id ON staff_badges(agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_current_streak ON staff(current_streak) WHERE current_streak > 0;

