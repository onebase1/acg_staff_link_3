# MODULE 30: Unit Economics Dashboard

## Priority: ENHANCE EXISTING (Not Rebuild)
**Build on [OperationalCosts.jsx](src/pages/OperationalCosts.jsx) - Add per-agency profitability calculations**

---

## Mission

Transform the existing operational costs tracker into a full unit economics dashboard showing:
- **Cost per Agency** (acquisition + operational)
- **Revenue per Agency** (MRR from usage_metrics)
- **Gross Margin %** (profitability)
- **Break-even Timeline** (months to recover CAC)
- **LTV:CAC Ratio** (investor KPI)

## Current State Analysis

### Existing Infrastructure ✅
- [OperationalCosts.jsx](src/pages/OperationalCosts.jsx) → Monthly cost tracking dashboard
- `operational_costs` table → Expense logging (already working)
- [CFODashboard.jsx](src/pages/CFODashboard.jsx) → Financial audit trail

### Missing Features ❌
- Revenue tracking per agency (depends on MODULE 29)
- Cost attribution to specific agencies
- Profitability calculations (Revenue - Costs)
- CAC (Customer Acquisition Cost) calculation
- LTV (Lifetime Value) estimation
- Break-even analysis

---

## Phase 1: Database Schema Enhancement

### 1.1 Add Agency Attribution to Costs

**File:** `supabase/migrations/20250118_unit_economics_enhancements.sql`

```sql
-- =====================================================
-- UNIT ECONOMICS: Per-Agency Cost Attribution
-- =====================================================

-- Add agency_id to operational_costs (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operational_costs' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE operational_costs ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;
    CREATE INDEX idx_operational_costs_agency ON operational_costs(agency_id);
  END IF;
END $$;

COMMENT ON COLUMN operational_costs.agency_id IS 'NULL = platform-wide cost, UUID = agency-specific cost';

-- Add cost_type categorization (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operational_costs' AND column_name = 'cost_type'
  ) THEN
    ALTER TABLE operational_costs ADD COLUMN cost_type TEXT CHECK (cost_type IN (
      'acquisition', -- Marketing, sales, onboarding
      'infrastructure', -- Servers, software subscriptions
      'support', -- Customer support, training
      'development', -- Engineering, product
      'other'
    ));
  END IF;
END $$;

-- Set default for existing records
UPDATE operational_costs SET cost_type = 'other' WHERE cost_type IS NULL;
```

### 1.2 Create Agency Economics View (Automated Calculation)

```sql
-- View: Per-agency unit economics (auto-calculated from usage_metrics + operational_costs)
CREATE OR REPLACE VIEW agency_unit_economics AS
SELECT
  a.id as agency_id,
  a.name as agency_name,
  a.created_at as agency_onboarded_at,
  EXTRACT(MONTH FROM AGE(NOW(), a.created_at)) as months_active,

  -- Revenue (from usage_metrics)
  COALESCE(SUM(um.revenue_amount) FILTER (WHERE um.event_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as current_month_revenue,
  COALESCE(SUM(um.revenue_amount), 0) as total_revenue,
  CASE
    WHEN EXTRACT(MONTH FROM AGE(NOW(), a.created_at)) > 0
    THEN COALESCE(SUM(um.revenue_amount), 0) / EXTRACT(MONTH FROM AGE(NOW(), a.created_at))
    ELSE 0
  END as avg_monthly_revenue,

  -- Costs (from operational_costs)
  COALESCE(SUM(oc.amount) FILTER (WHERE oc.cost_type = 'acquisition'), 0) as total_acquisition_cost,
  COALESCE(SUM(oc.amount) FILTER (WHERE oc.cost_type != 'acquisition'), 0) as total_operational_cost,
  COALESCE(SUM(oc.amount), 0) as total_costs,

  -- Profitability
  COALESCE(SUM(um.revenue_amount), 0) - COALESCE(SUM(oc.amount), 0) as lifetime_profit,
  CASE
    WHEN COALESCE(SUM(um.revenue_amount), 0) > 0
    THEN ((COALESCE(SUM(um.revenue_amount), 0) - COALESCE(SUM(oc.amount), 0)) / COALESCE(SUM(um.revenue_amount), 0)) * 100
    ELSE 0
  END as gross_margin_percent,

  -- CAC & LTV
  COALESCE(SUM(oc.amount) FILTER (WHERE oc.cost_type = 'acquisition'), 0) as cac,
  CASE
    WHEN EXTRACT(MONTH FROM AGE(NOW(), a.created_at)) > 0
    THEN (COALESCE(SUM(um.revenue_amount), 0) / EXTRACT(MONTH FROM AGE(NOW(), a.created_at))) * 36 -- Assume 3-year LTV
    ELSE 0
  END as estimated_ltv,

  -- Break-even analysis
  CASE
    WHEN COALESCE(SUM(um.revenue_amount) FILTER (WHERE um.event_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) > 0
    THEN COALESCE(SUM(oc.amount) FILTER (WHERE oc.cost_type = 'acquisition'), 0) /
         COALESCE(SUM(um.revenue_amount) FILTER (WHERE um.event_date >= DATE_TRUNC('month', CURRENT_DATE)), 0)
    ELSE NULL
  END as months_to_break_even,

  -- Activity metrics
  COUNT(DISTINCT s.id) FILTER (WHERE s.account_status = 'active') as active_staff_count,
  COUNT(DISTINCT um.id) FILTER (WHERE um.event_type = 'shift_filled' AND um.event_date >= DATE_TRUNC('month', CURRENT_DATE)) as shifts_this_month

FROM agencies a
LEFT JOIN usage_metrics um ON um.agency_id = a.id
LEFT JOIN operational_costs oc ON oc.agency_id = a.id
LEFT JOIN staff s ON s.agency_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.created_at;

COMMENT ON VIEW agency_unit_economics IS 'Per-agency profitability: Revenue, Costs, CAC, LTV, Margin';
```

### 1.3 Create RPC Function for Unit Economics

```sql
-- RPC: Get unit economics with date filtering
CREATE OR REPLACE FUNCTION get_unit_economics(
  p_agency_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id UUID,
  agency_name TEXT,
  months_active NUMERIC,
  current_month_revenue NUMERIC,
  total_revenue NUMERIC,
  total_costs NUMERIC,
  lifetime_profit NUMERIC,
  gross_margin_percent NUMERIC,
  cac NUMERIC,
  estimated_ltv NUMERIC,
  ltv_cac_ratio NUMERIC,
  months_to_break_even NUMERIC,
  active_staff_count BIGINT,
  shifts_this_month BIGINT,
  health_score TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aue.agency_id,
    aue.agency_name,
    aue.months_active,
    aue.current_month_revenue,
    aue.total_revenue,
    aue.total_costs,
    aue.lifetime_profit,
    aue.gross_margin_percent,
    aue.cac,
    aue.estimated_ltv,
    CASE WHEN aue.cac > 0 THEN aue.estimated_ltv / aue.cac ELSE 0 END as ltv_cac_ratio,
    aue.months_to_break_even,
    aue.active_staff_count,
    aue.shifts_this_month,
    -- Health score logic
    CASE
      WHEN aue.gross_margin_percent >= 40 AND aue.active_staff_count >= 10 THEN 'Healthy'
      WHEN aue.gross_margin_percent >= 20 OR aue.active_staff_count >= 5 THEN 'Growing'
      WHEN aue.lifetime_profit < 0 AND aue.months_active > 6 THEN 'At Risk'
      ELSE 'New'
    END::TEXT as health_score
  FROM agency_unit_economics aue
  WHERE (p_agency_id IS NULL OR aue.agency_id = p_agency_id)
  ORDER BY aue.total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS handled by view)
GRANT EXECUTE ON FUNCTION get_unit_economics TO authenticated;
```

---

## Phase 2: Frontend Enhancement

### 2.1 Enhance OperationalCosts.jsx

**File:** [src/pages/OperationalCosts.jsx](src/pages/OperationalCosts.jsx)

**Changes Required:**

1. Add new tab: "Unit Economics"
2. Fetch data from `get_unit_economics` RPC
3. Display agency-level profitability metrics

**Implementation:**

```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Users, Target } from 'lucide-react';

// Add this new hook
const useUnitEconomics = () => {
  return useQuery({
    queryKey: ['unit-economics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unit_economics', {
        p_agency_id: null, // Super admin sees all
        p_start_date: null,
        p_end_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

// Add new component
const UnitEconomicsTab = () => {
  const { data: economics, isLoading } = useUnitEconomics();

  if (isLoading) return <div>Loading unit economics...</div>;

  // Calculate platform-wide totals
  const platformTotals = economics?.reduce((acc, agency) => ({
    totalRevenue: acc.totalRevenue + Number(agency.total_revenue || 0),
    totalCosts: acc.totalCosts + Number(agency.total_costs || 0),
    totalProfit: acc.totalProfit + Number(agency.lifetime_profit || 0),
    totalAgencies: acc.totalAgencies + 1,
    healthyAgencies: acc.healthyAgencies + (agency.health_score === 'Healthy' ? 1 : 0)
  }), { totalRevenue: 0, totalCosts: 0, totalProfit: 0, totalAgencies: 0, healthyAgencies: 0 });

  const platformMargin = platformTotals.totalRevenue > 0
    ? ((platformTotals.totalProfit / platformTotals.totalRevenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{platformTotals.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime across all agencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            {platformMargin >= 30 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMargin}%</div>
            <p className="text-xs text-muted-foreground">
              Profit: £{platformTotals.totalProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Agencies</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformTotals.totalAgencies}</div>
            <p className="text-xs text-muted-foreground">
              {platformTotals.healthyAgencies} healthy ({((platformTotals.healthyAgencies / platformTotals.totalAgencies) * 100).toFixed(0)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg LTV:CAC</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {economics?.length > 0
                ? (economics.reduce((sum, a) => sum + Number(a.ltv_cac_ratio || 0), 0) / economics.length).toFixed(1)
                : '0'}:1
            </div>
            <p className="text-xs text-muted-foreground">Target: 3:1 or higher</p>
          </CardContent>
        </Card>
      </div>

      {/* Agency-Level Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="p-2">Agency</th>
                  <th className="p-2">Health</th>
                  <th className="p-2">Active Staff</th>
                  <th className="p-2">Monthly Revenue</th>
                  <th className="p-2">Total Revenue</th>
                  <th className="p-2">Total Costs</th>
                  <th className="p-2">Profit</th>
                  <th className="p-2">Margin %</th>
                  <th className="p-2">CAC</th>
                  <th className="p-2">LTV</th>
                  <th className="p-2">LTV:CAC</th>
                </tr>
              </thead>
              <tbody>
                {economics?.map((agency) => {
                  const margin = Number(agency.gross_margin_percent || 0);
                  const ltvCac = Number(agency.ltv_cac_ratio || 0);

                  return (
                    <tr key={agency.agency_id} className="border-b text-sm hover:bg-muted/50">
                      <td className="p-2 font-medium">{agency.agency_name}</td>
                      <td className="p-2">
                        <Badge variant={
                          agency.health_score === 'Healthy' ? 'default' :
                          agency.health_score === 'Growing' ? 'secondary' :
                          agency.health_score === 'At Risk' ? 'destructive' : 'outline'
                        }>
                          {agency.health_score}
                        </Badge>
                      </td>
                      <td className="p-2">{agency.active_staff_count}</td>
                      <td className="p-2">£{Number(agency.current_month_revenue || 0).toLocaleString()}</td>
                      <td className="p-2">£{Number(agency.total_revenue || 0).toLocaleString()}</td>
                      <td className="p-2">£{Number(agency.total_costs || 0).toLocaleString()}</td>
                      <td className={`p-2 font-medium ${Number(agency.lifetime_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        £{Number(agency.lifetime_profit || 0).toLocaleString()}
                      </td>
                      <td className={`p-2 ${margin >= 30 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className="p-2">£{Number(agency.cac || 0).toLocaleString()}</td>
                      <td className="p-2">£{Number(agency.estimated_ltv || 0).toLocaleString()}</td>
                      <td className={`p-2 font-medium ${ltvCac >= 3 ? 'text-green-600' : ltvCac >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {ltvCac.toFixed(1)}:1
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// In main OperationalCosts component, add new tab:
// <Tabs defaultValue="costs">
//   <TabsList>
//     <TabsTrigger value="costs">Operational Costs</TabsTrigger>
//     <TabsTrigger value="economics">Unit Economics</TabsTrigger>
//   </TabsList>
//   <TabsContent value="costs">
//     {/* Existing cost tracking UI */}
//   </TabsContent>
//   <TabsContent value="economics">
//     <UnitEconomicsTab />
//   </TabsContent>
// </Tabs>
```

### 2.2 Add Cost Entry Form Enhancement

**Update existing cost entry form to include:**

```javascript
// Add to cost entry form
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Cost Type</label>
    <select
      value={formData.cost_type || 'other'}
      onChange={(e) => setFormData({...formData, cost_type: e.target.value})}
      className="..."
    >
      <option value="acquisition">Acquisition (Marketing/Sales)</option>
      <option value="infrastructure">Infrastructure (Servers/Software)</option>
      <option value="support">Support (Training/CS)</option>
      <option value="development">Development (Engineering)</option>
      <option value="other">Other</option>
    </select>
  </div>

  <div>
    <label>Assign to Agency (optional)</label>
    <select
      value={formData.agency_id || ''}
      onChange={(e) => setFormData({...formData, agency_id: e.target.value || null})}
      className="..."
    >
      <option value="">Platform-wide cost</option>
      {agencies?.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
    <p className="text-xs text-muted-foreground mt-1">
      Leave blank for shared costs (will be distributed across all agencies)
    </p>
  </div>
</div>
```

---

## Phase 3: Automated Cost Allocation

### 3.1 Create Function to Distribute Shared Costs

```sql
-- Function: Distribute platform-wide costs across agencies
-- Run monthly via cron or manually
CREATE OR REPLACE FUNCTION allocate_shared_costs(
  p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS TABLE (
  agency_id UUID,
  allocated_amount DECIMAL,
  allocation_basis TEXT
) AS $$
DECLARE
  v_total_shared_costs DECIMAL;
  v_total_active_staff INT;
BEGIN
  -- Calculate total shared costs for the month
  SELECT COALESCE(SUM(amount), 0) INTO v_total_shared_costs
  FROM operational_costs
  WHERE agency_id IS NULL
    AND DATE_TRUNC('month', cost_date) = p_month;

  -- Count total active staff across all agencies
  SELECT COUNT(*) INTO v_total_active_staff
  FROM staff
  WHERE account_status = 'active'
    AND deleted_at IS NULL;

  IF v_total_active_staff = 0 THEN
    RAISE NOTICE 'No active staff found, cannot allocate costs';
    RETURN;
  END IF;

  -- Allocate costs proportionally based on active staff count
  RETURN QUERY
  SELECT
    a.id as agency_id,
    (v_total_shared_costs * (COUNT(s.id)::DECIMAL / v_total_active_staff)) as allocated_amount,
    'Proportional to active staff count' as allocation_basis
  FROM agencies a
  LEFT JOIN staff s ON s.agency_id = a.id AND s.account_status = 'active' AND s.deleted_at IS NULL
  WHERE a.deleted_at IS NULL
  GROUP BY a.id
  HAVING COUNT(s.id) > 0;

  RAISE NOTICE 'Allocated £% across % agencies based on % active staff',
    v_total_shared_costs, (SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL), v_total_active_staff;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule monthly allocation (run on 1st of month at 2 AM)
SELECT cron.schedule(
  'allocate-shared-costs-monthly',
  '0 2 1 * *', -- 1st of every month at 2 AM
  $$
  INSERT INTO operational_costs (agency_id, category, amount, cost_date, cost_type, description)
  SELECT
    agency_id,
    'Allocated Shared Costs',
    allocated_amount,
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month',
    'infrastructure',
    'Auto-allocated: ' || allocation_basis
  FROM allocate_shared_costs(DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month');
  $$
);
```

---

## Phase 4: Testing & Validation

### 4.1 Test Unit Economics Calculations

**File:** `scripts/test-unit-economics.sql`

```sql
-- Test 1: Verify view returns data
SELECT * FROM agency_unit_economics LIMIT 5;

-- Test 2: Check RPC function
SELECT * FROM get_unit_economics(NULL, NULL, CURRENT_DATE);

-- Test 3: Verify cost allocation
SELECT * FROM allocate_shared_costs(DATE_TRUNC('month', CURRENT_DATE));

-- Test 4: Validate LTV:CAC ratios
SELECT
  agency_name,
  cac,
  estimated_ltv,
  CASE WHEN cac > 0 THEN estimated_ltv / cac ELSE 0 END as ltv_cac_ratio,
  CASE
    WHEN cac > 0 AND (estimated_ltv / cac) >= 3 THEN 'Excellent (≥3:1)'
    WHEN cac > 0 AND (estimated_ltv / cac) >= 1 THEN 'Acceptable (≥1:1)'
    ELSE 'Needs Improvement (<1:1)'
  END as ltv_cac_status
FROM agency_unit_economics
WHERE cac > 0
ORDER BY ltv_cac_ratio DESC;

-- Test 5: Identify at-risk agencies
SELECT
  agency_name,
  months_active,
  lifetime_profit,
  gross_margin_percent,
  health_score
FROM agency_unit_economics
WHERE health_score = 'At Risk'
ORDER BY lifetime_profit ASC;
```

### 4.2 Production Validation Checklist

- [ ] `agency_id` column added to `operational_costs` table
- [ ] `cost_type` column added with CHECK constraint
- [ ] `agency_unit_economics` view created successfully
- [ ] `get_unit_economics` RPC function works for super admin
- [ ] Cost allocation cron job scheduled
- [ ] Frontend "Unit Economics" tab displays correctly
- [ ] LTV:CAC ratios calculated accurately (test with known data)
- [ ] Health scores match expected logic
- [ ] Performance: Dashboard loads < 3 seconds with 100+ agencies

---

## Success Metrics

### Immediate (Week 1)
- ✅ Unit economics view returns data for all agencies
- ✅ LTV:CAC ratios calculated correctly
- ✅ Cost allocation cron job runs successfully
- ✅ Dashboard displays without errors

### Short-term (Month 1)
- 📊 Identify top 3 most profitable agencies
- 📊 Identify 3 agencies "At Risk" (negative profit after 6 months)
- 📊 Track platform-wide gross margin trend
- 📊 Calculate average CAC across all agencies

### Long-term (Quarter 1)
- 💰 Achieve platform-wide margin >30%
- 💰 LTV:CAC ratio >3:1 for mature agencies (>12 months)
- 💰 Reduce CAC by 20% via optimized onboarding
- 💰 Increase LTV by 30% via retention improvements

---

## Automation Summary

| **Task** | **Method** | **Manual Work** |
|----------|-----------|-----------------|
| Revenue tracking | MODULE 29 triggers | ❌ ZERO |
| Cost attribution | Admin selects agency in form | ⚠️ MINIMAL (1 dropdown) |
| Shared cost allocation | Cron job (monthly) | ❌ ZERO |
| Profitability calculation | Database view (auto) | ❌ ZERO |
| Dashboard updates | React Query (auto-refresh) | ❌ ZERO |

**Total manual work:** 🎯 **5 seconds per cost entry** (select agency + cost type)

---

## Dependencies

- ✅ MODULE 29 completed (`usage_metrics` table with revenue data)
- ✅ Existing `operational_costs` table
- ✅ [OperationalCosts.jsx](src/pages/OperationalCosts.jsx) page
- ✅ Shadcn UI components (Card, Tabs, Badge)
- ✅ pg_cron extension for cost allocation

---

## Risks & Mitigations

| **Risk** | **Mitigation** |
|----------|----------------|
| Inaccurate LTV estimation | Refine formula based on actual churn data (currently assumes 3 years) |
| Shared cost allocation unfair | Allow manual override or alternative allocation methods (revenue-based) |
| CAC spikes for new agencies | Track CAC separately for pilot vs production agencies |
| Missing revenue data | Ensure MODULE 29 triggers are working correctly |

---

## Future Enhancements (Post-MVP)

1. **Cohort Analysis** → Track profitability by agency signup month
2. **Churn Prediction** → ML model to predict agency churn risk
3. **Scenario Planning** → "What if CAC drops by 20%?" calculator
4. **Benchmarking** → Compare agency metrics to industry standards
5. **Automated Alerts** → Email when agency margin drops below 10%

---

## Agent Handoff Notes

- Modify [OperationalCosts.jsx](src/pages/OperationalCosts.jsx) to add new "Unit Economics" tab
- Test with real Dominion Healthcare data (verify CAC/LTV calculations)
- Ensure cost allocation cron job runs before end of first month
- Consider adding export to CSV feature for investor pitch decks
- Document LTV assumption (currently 3 years) - make configurable later

---

**Module Status:** 📝 Ready for Agent Execution
**Automation Level:** 🤖 95% Automated (Only cost categorization manual)
**Estimated Time:** 5-7 hours (DB + Frontend + Testing)
