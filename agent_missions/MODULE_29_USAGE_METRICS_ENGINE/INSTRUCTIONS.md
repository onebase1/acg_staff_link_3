# MODULE 29: Usage Metrics Engine (Automated)

## Priority: AUTOMATION FIRST
**Zero manual data entry. All metrics auto-logged via triggers, hooks, and cron jobs.**

---

## Mission

Build automated usage metrics collection system to track platform activity for investor KPIs (MRR, CAC, LTV, retention). All data collection must be **triggered automatically** by user actions—no manual logging required.

## Current State Analysis

### Existing Infrastructure (DO NOT DUPLICATE)
- `operational_costs` table → tracks expenses (already working)
- `change_logs` table → audit trail for data changes
- `invoice_amendments` table → financial audit trail
- [PerformanceAnalytics.jsx](src/pages/PerformanceAnalytics.jsx) → staff/shift analytics
- [CFODashboard.jsx](src/pages/CFODashboard.jsx) → financial audit view

### Missing Infrastructure
- ❌ Usage metrics table (platform activity tracking)
- ❌ Automated event logging (shift posts, staff onboarding, logins)
- ❌ Aggregated daily/monthly metrics (for trend analysis)
- ❌ Revenue tracking per agency (MRR calculation)
- ❌ Agency health scores (for retention prediction)

---

## Phase 1: Database Schema (AUTOMATED TRIGGERS)

### 1.1 Create `usage_metrics` Table

**File:** `supabase/migrations/20250118_usage_metrics_engine.sql`

```sql
-- =====================================================
-- USAGE METRICS: Automated Platform Activity Tracking
-- =====================================================

-- Main metrics table (auto-populated via triggers)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Event metadata
  event_type TEXT NOT NULL, -- 'shift_posted', 'staff_invited', 'shift_filled', 'timesheet_submitted', 'invoice_generated', 'user_login'
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event details (flexible JSONB for different event types)
  event_data JSONB DEFAULT '{}'::JSONB,
  -- Examples:
  -- shift_posted: {"shift_id": "...", "role": "hca", "is_urgent": true}
  -- staff_invited: {"staff_id": "...", "invitation_method": "email"}
  -- shift_filled: {"shift_id": "...", "staff_id": "...", "fill_time_hours": 2.5}

  -- Financial data (for revenue tracking)
  revenue_amount DECIMAL(10,2) DEFAULT 0, -- e.g., shift fee, subscription fee
  cost_amount DECIMAL(10,2) DEFAULT 0, -- e.g., staff pay, platform costs

  -- User attribution
  triggered_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_usage_metrics_agency_date ON usage_metrics(agency_id, event_date DESC);
CREATE INDEX idx_usage_metrics_event_type ON usage_metrics(event_type, event_date DESC);
CREATE INDEX idx_usage_metrics_timestamp ON usage_metrics(event_timestamp DESC);

-- RLS Policies
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Super admin sees all
CREATE POLICY "Super admin full access" ON usage_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Agency owners see their own metrics
CREATE POLICY "Agency owners view own metrics" ON usage_metrics
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE usage_metrics IS 'Automated platform activity tracking for investor KPIs (MRR, CAC, LTV, retention)';
```

### 1.2 Create Aggregated Metrics Table (Cron Job Target)

```sql
-- Daily/monthly rollups for fast dashboard queries
CREATE TABLE IF NOT EXISTS usage_metrics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Activity metrics
  shifts_posted INT DEFAULT 0,
  shifts_filled INT DEFAULT 0,
  shifts_cancelled INT DEFAULT 0,
  staff_invited INT DEFAULT 0,
  staff_activated INT DEFAULT 0, -- completed profile
  timesheets_submitted INT DEFAULT 0,
  invoices_generated INT DEFAULT 0,
  user_logins INT DEFAULT 0,

  -- Financial metrics
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_costs DECIMAL(10,2) DEFAULT 0,
  gross_margin DECIMAL(10,2) DEFAULT 0,

  -- Efficiency metrics
  avg_shift_fill_time_hours DECIMAL(5,2) DEFAULT 0, -- time from post to filled
  shift_fill_rate DECIMAL(5,2) DEFAULT 0, -- percentage filled

  -- Calculated at summary time
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, period_type, period_start)
);

CREATE INDEX idx_usage_summary_agency_period ON usage_metrics_summary(agency_id, period_type, period_start DESC);

-- RLS (same as usage_metrics)
ALTER TABLE usage_metrics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access summary" ON usage_metrics_summary
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

CREATE POLICY "Agency owners view own summary" ON usage_metrics_summary
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid()));
```

---

## Phase 2: Database Triggers (AUTO-LOGGING)

### 2.1 Shift Posted Trigger

```sql
-- Function to log shift posts
CREATE OR REPLACE FUNCTION log_shift_posted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_metrics (
    agency_id,
    event_type,
    event_date,
    event_timestamp,
    event_data,
    triggered_by_user_id
  )
  VALUES (
    NEW.agency_id,
    'shift_posted',
    NEW.created_at::DATE,
    NEW.created_at,
    jsonb_build_object(
      'shift_id', NEW.id,
      'role', NEW.role_required,
      'is_urgent', COALESCE(NEW.is_urgent, false),
      'date', NEW.shift_date,
      'hours', NEW.hours
    ),
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to shifts table
DROP TRIGGER IF EXISTS trigger_log_shift_posted ON shifts;
CREATE TRIGGER trigger_log_shift_posted
  AFTER INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION log_shift_posted();
```

### 2.2 Shift Filled Trigger

```sql
-- Function to log shift fills
CREATE OR REPLACE FUNCTION log_shift_filled()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_created_at TIMESTAMPTZ;
  v_fill_time_hours DECIMAL(5,2);
BEGIN
  -- Only log when status changes to 'accepted' or 'confirmed'
  IF NEW.status IN ('accepted', 'confirmed') AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'confirmed')) THEN

    -- Calculate fill time
    SELECT created_at INTO v_shift_created_at FROM shifts WHERE id = NEW.id;
    v_fill_time_hours := EXTRACT(EPOCH FROM (NOW() - v_shift_created_at)) / 3600;

    INSERT INTO usage_metrics (
      agency_id,
      event_type,
      event_date,
      event_timestamp,
      event_data,
      triggered_by_user_id
    )
    VALUES (
      NEW.agency_id,
      'shift_filled',
      NOW()::DATE,
      NOW(),
      jsonb_build_object(
        'shift_id', NEW.id,
        'staff_id', NEW.assigned_staff_id,
        'fill_time_hours', v_fill_time_hours,
        'status', NEW.status
      ),
      NEW.assigned_staff_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_log_shift_filled ON shifts;
CREATE TRIGGER trigger_log_shift_filled
  AFTER UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION log_shift_filled();
```

### 2.3 Staff Invited Trigger

```sql
-- Function to log staff invitations
CREATE OR REPLACE FUNCTION log_staff_invited()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when invitation_sent_at is first set
  IF NEW.invitation_sent_at IS NOT NULL AND OLD.invitation_sent_at IS NULL THEN
    INSERT INTO usage_metrics (
      agency_id,
      event_type,
      event_date,
      event_timestamp,
      event_data,
      triggered_by_user_id
    )
    VALUES (
      NEW.agency_id,
      'staff_invited',
      NEW.invitation_sent_at::DATE,
      NEW.invitation_sent_at,
      jsonb_build_object(
        'staff_id', NEW.id,
        'email', NEW.email,
        'role', NEW.role
      ),
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_log_staff_invited ON staff;
CREATE TRIGGER trigger_log_staff_invited
  AFTER UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION log_staff_invited();
```

### 2.4 Staff Activated Trigger

```sql
-- Function to log staff activation (profile completion)
CREATE OR REPLACE FUNCTION log_staff_activated()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when account_status changes to 'active'
  IF NEW.account_status = 'active' AND (OLD.account_status IS NULL OR OLD.account_status != 'active') THEN
    INSERT INTO usage_metrics (
      agency_id,
      event_type,
      event_date,
      event_timestamp,
      event_data,
      triggered_by_user_id
    )
    VALUES (
      NEW.agency_id,
      'staff_activated',
      NOW()::DATE,
      NOW(),
      jsonb_build_object(
        'staff_id', NEW.id,
        'role', NEW.role,
        'days_to_activate', EXTRACT(DAY FROM (NOW() - NEW.invitation_sent_at))
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_log_staff_activated ON staff;
CREATE TRIGGER trigger_log_staff_activated
  AFTER UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION log_staff_activated();
```

### 2.5 Invoice Generated Trigger

```sql
-- Function to log invoice generation (revenue tracking)
CREATE OR REPLACE FUNCTION log_invoice_generated()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_metrics (
    agency_id,
    event_type,
    event_date,
    event_timestamp,
    event_data,
    revenue_amount,
    triggered_by_user_id
  )
  VALUES (
    NEW.agency_id,
    'invoice_generated',
    NEW.created_at::DATE,
    NEW.created_at,
    jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_number', NEW.invoice_number,
      'client_id', NEW.client_id
    ),
    NEW.total_amount,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger (if invoices table exists)
-- DROP TRIGGER IF EXISTS trigger_log_invoice_generated ON invoices;
-- CREATE TRIGGER trigger_log_invoice_generated
--   AFTER INSERT ON invoices
--   FOR EACH ROW
--   EXECUTE FUNCTION log_invoice_generated();

-- NOTE: Uncomment above if invoices table exists, or adapt to your billing system
```

---

## Phase 3: Cron Job for Daily Aggregation

### 3.1 Create Aggregation Function

```sql
-- Function to aggregate daily metrics (run by cron)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics()
RETURNS void AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_agency RECORD;
BEGIN
  -- Loop through each agency
  FOR v_agency IN SELECT id FROM agencies WHERE deleted_at IS NULL LOOP

    -- Insert or update daily summary
    INSERT INTO usage_metrics_summary (
      agency_id,
      period_type,
      period_start,
      period_end,
      shifts_posted,
      shifts_filled,
      staff_invited,
      staff_activated,
      total_revenue,
      total_costs,
      avg_shift_fill_time_hours,
      shift_fill_rate
    )
    SELECT
      v_agency.id,
      'daily',
      v_yesterday,
      v_yesterday,
      COUNT(*) FILTER (WHERE event_type = 'shift_posted'),
      COUNT(*) FILTER (WHERE event_type = 'shift_filled'),
      COUNT(*) FILTER (WHERE event_type = 'staff_invited'),
      COUNT(*) FILTER (WHERE event_type = 'staff_activated'),
      SUM(COALESCE(revenue_amount, 0)),
      SUM(COALESCE(cost_amount, 0)),
      AVG((event_data->>'fill_time_hours')::DECIMAL) FILTER (WHERE event_type = 'shift_filled'),
      CASE
        WHEN COUNT(*) FILTER (WHERE event_type = 'shift_posted') > 0
        THEN (COUNT(*) FILTER (WHERE event_type = 'shift_filled')::DECIMAL / COUNT(*) FILTER (WHERE event_type = 'shift_posted')) * 100
        ELSE 0
      END
    FROM usage_metrics
    WHERE agency_id = v_agency.id
      AND event_date = v_yesterday
    ON CONFLICT (agency_id, period_type, period_start)
    DO UPDATE SET
      shifts_posted = EXCLUDED.shifts_posted,
      shifts_filled = EXCLUDED.shifts_filled,
      staff_invited = EXCLUDED.staff_invited,
      staff_activated = EXCLUDED.staff_activated,
      total_revenue = EXCLUDED.total_revenue,
      total_costs = EXCLUDED.total_costs,
      avg_shift_fill_time_hours = EXCLUDED.avg_shift_fill_time_hours,
      shift_fill_rate = EXCLUDED.shift_fill_rate,
      calculated_at = NOW();

  END LOOP;

  RAISE NOTICE 'Daily metrics aggregated for %', v_yesterday;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.2 Schedule Cron Job

```sql
-- Run daily at 1 AM UTC
SELECT cron.schedule(
  'aggregate-daily-metrics',
  '0 1 * * *', -- Every day at 1 AM
  $$SELECT aggregate_daily_metrics();$$
);

-- Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'aggregate-daily-metrics';
```

---

## Phase 4: RPC Functions for Dashboard Queries

### 4.1 Get Agency Usage Summary

**File:** Continue in migration file

```sql
-- RPC: Get usage summary for date range
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_agency_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  total_revenue DECIMAL,
  total_costs DECIMAL
) AS $$
BEGIN
  -- Super admin can query all agencies
  IF p_agency_id IS NULL THEN
    -- Check if user is super admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Super admin access required';
    END IF;

    RETURN QUERY
    SELECT
      um.event_type,
      COUNT(*) as event_count,
      SUM(COALESCE(um.revenue_amount, 0)) as total_revenue,
      SUM(COALESCE(um.cost_amount, 0)) as total_costs
    FROM usage_metrics um
    WHERE um.event_date BETWEEN p_start_date AND p_end_date
    GROUP BY um.event_type
    ORDER BY event_count DESC;
  ELSE
    -- Agency-specific query
    RETURN QUERY
    SELECT
      um.event_type,
      COUNT(*) as event_count,
      SUM(COALESCE(um.revenue_amount, 0)) as total_revenue,
      SUM(COALESCE(um.cost_amount, 0)) as total_costs
    FROM usage_metrics um
    WHERE um.agency_id = p_agency_id
      AND um.event_date BETWEEN p_start_date AND p_end_date
    GROUP BY um.event_type
    ORDER BY event_count DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Calculate Monthly Recurring Revenue (MRR)

```sql
-- RPC: Calculate MRR per agency
CREATE OR REPLACE FUNCTION calculate_mrr(
  p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id UUID,
  agency_name TEXT,
  monthly_revenue DECIMAL,
  active_staff_count INT,
  shifts_filled INT,
  revenue_per_shift DECIMAL
) AS $$
BEGIN
  -- Super admin only
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    COALESCE(SUM(um.revenue_amount), 0) as monthly_revenue,
    COUNT(DISTINCT s.id) FILTER (WHERE s.account_status = 'active') as active_staff_count,
    COUNT(*) FILTER (WHERE um.event_type = 'shift_filled') as shifts_filled,
    CASE
      WHEN COUNT(*) FILTER (WHERE um.event_type = 'shift_filled') > 0
      THEN COALESCE(SUM(um.revenue_amount), 0) / COUNT(*) FILTER (WHERE um.event_type = 'shift_filled')
      ELSE 0
    END as revenue_per_shift
  FROM agencies a
  LEFT JOIN usage_metrics um ON um.agency_id = a.id AND um.event_date BETWEEN p_start_date AND p_end_date
  LEFT JOIN staff s ON s.agency_id = a.id
  WHERE a.deleted_at IS NULL
  GROUP BY a.id, a.name
  ORDER BY monthly_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 5: Frontend Integration (Minimal Changes)

### 5.1 No Manual Logging Required!

**Key Point:** Because all logging is trigger-based, existing mutations need **ZERO changes**. The system automatically logs:

- Shift creation → `createShift` mutation (already working)
- Staff invitation → `updateStaff` mutation (already working)
- Shift assignment → `updateShift` mutation (already working)

### 5.2 Add Usage Metrics Hook (Optional)

**File:** `src/hooks/useUsageMetrics.js` (NEW)

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useUsageMetrics = (agencyId, startDate, endDate) => {
  return useQuery({
    queryKey: ['usage-metrics', agencyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_summary', {
        p_agency_id: agencyId || null,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useMRRCalculation = (startDate, endDate) => {
  return useQuery({
    queryKey: ['mrr-calculation', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_mrr', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
};
```

---

## Phase 6: Testing & Validation

### 6.1 Trigger Testing Script

**File:** `scripts/test-usage-metrics.sql`

```sql
-- Test 1: Verify triggers are installed
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%log_%';

-- Expected: 5 triggers (shift_posted, shift_filled, staff_invited, staff_activated, invoice_generated)

-- Test 2: Manually insert test shift and verify logging
BEGIN;
  -- Insert test shift (will trigger log_shift_posted)
  INSERT INTO shifts (agency_id, role_required, shift_date, hours, created_by)
  VALUES (
    (SELECT id FROM agencies LIMIT 1),
    'hca',
    CURRENT_DATE + INTERVAL '1 day',
    8,
    (SELECT id FROM profiles WHERE role = 'agency_owner' LIMIT 1)
  );

  -- Verify metric logged
  SELECT * FROM usage_metrics
  WHERE event_type = 'shift_posted'
  ORDER BY created_at DESC
  LIMIT 1;
ROLLBACK; -- Don't actually insert test data

-- Test 3: Check daily aggregation works
SELECT aggregate_daily_metrics(); -- Run manually
SELECT * FROM usage_metrics_summary ORDER BY calculated_at DESC LIMIT 5;

-- Test 4: Verify RPC functions
SELECT * FROM get_usage_summary(NULL, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE);
SELECT * FROM calculate_mrr(DATE_TRUNC('month', CURRENT_DATE), CURRENT_DATE);
```

### 6.2 Production Validation Checklist

- [ ] All 5 triggers created successfully
- [ ] Cron job scheduled (verify in `cron.job` table)
- [ ] RLS policies prevent unauthorized access
- [ ] Test shift creation logs metric automatically
- [ ] Test staff invitation logs metric automatically
- [ ] Daily aggregation runs without errors
- [ ] Super admin can query all agencies
- [ ] Agency owners see only their metrics
- [ ] Performance: Query response < 2 seconds for 10K metrics

---

## Success Metrics

### Immediate (Week 1)
- ✅ All triggers fire correctly (100% capture rate)
- ✅ Zero manual logging required
- ✅ Daily cron job runs successfully
- ✅ RPC functions return data < 2 seconds

### Short-term (Month 1)
- 📊 Track 10,000+ events across all agencies
- 📊 Calculate accurate MRR for each agency
- 📊 Identify top 3 most active agencies
- 📊 Measure shift fill rate (target: >70%)

### Long-term (Quarter 1)
- 💰 MRR growth tracking (month-over-month)
- 💰 CAC calculation (cost per activated staff)
- 💰 LTV estimation (lifetime value per agency)
- 💰 Churn prediction (agencies with declining activity)

---

## Automation Summary

| **Event** | **Trigger** | **Manual Work Required** |
|-----------|-------------|-------------------------|
| Shift posted | `trigger_log_shift_posted` | ❌ ZERO |
| Shift filled | `trigger_log_shift_filled` | ❌ ZERO |
| Staff invited | `trigger_log_staff_invited` | ❌ ZERO |
| Staff activated | `trigger_log_staff_activated` | ❌ ZERO |
| Invoice generated | `trigger_log_invoice_generated` | ❌ ZERO |
| Daily aggregation | Cron job (1 AM UTC) | ❌ ZERO |
| Dashboard queries | RPC functions | ❌ ZERO |

**Total manual work:** 🎉 **ZERO** - fully automated!

---

## Dependencies

- ✅ PostgreSQL database with trigger support
- ✅ pg_cron extension (already installed)
- ✅ Supabase RLS policies (already configured)
- ✅ Existing tables: `shifts`, `staff`, `agencies`, `profiles`
- ⚠️ Optional: `invoices` table (adapt if different billing system)

---

## Risks & Mitigations

| **Risk** | **Mitigation** |
|----------|----------------|
| Trigger performance (high volume) | Async logging via background job if needed |
| Cron job fails silently | Add monitoring alerts (email on failure) |
| Data inconsistency | Daily reconciliation job to fix gaps |
| Storage growth (millions of events) | Archive old metrics (>12 months) to cold storage |

---

## Future Enhancements (Post-MVP)

1. **Real-time Websocket Events** → Live dashboard updates
2. **Predictive Analytics** → Churn risk scoring (ML model)
3. **Automated Alerts** → Email when MRR drops >10%
4. **A/B Testing Framework** → Track feature adoption rates
5. **Customer Health Score** → Combine usage + support tickets

---

## Agent Handoff Notes

- **No frontend changes required for Phase 1-4** (triggers work automatically)
- Test thoroughly in production using [test-usage-metrics.sql](scripts/test-usage-metrics.sql)
- Monitor cron job logs for first 7 days
- If invoice table doesn't exist, skip invoice trigger (document in migration)
- Consider adding `user_login` event via Edge Function hook (future phase)

---

**Module Status:** 📝 Ready for Agent Execution
**Automation Level:** 🤖 100% Automated (Zero Manual Logging)
**Estimated Time:** 4-6 hours (mostly SQL + testing)
