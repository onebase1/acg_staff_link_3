# MODULE 31: Investor KPI Dashboard

## Priority: EXECUTIVE SUMMARY (Auto-Refresh)
**One-page view of 6 critical investor KPIs - No manual data entry, all pulled from existing systems**

---

## Mission

Create a single-page executive dashboard for investor pitches showing:
- **MRR & ARR** (Monthly/Annual Recurring Revenue)
- **Customer Count & Growth Rate** (Active agencies)
- **Gross Margin %** (Profitability)
- **LTV:CAC Ratio** (Unit economics health)
- **Net Retention** (Churn vs expansion)
- **Burn Rate** (Monthly cash consumption)

**Target Audience:** Investors, board members, CEO (not super admin)

---

## Current State Analysis

### Data Sources (Already Exist) ✅
- `usage_metrics` table → Revenue tracking (MODULE 29)
- `usage_metrics_summary` table → Aggregated monthly data (MODULE 29)
- `agency_unit_economics` view → Profitability per agency (MODULE 30)
- `operational_costs` table → Expense tracking (existing)
- `agencies` table → Customer count and signup dates
- `staff` table → Active user count
- `shifts` table → Platform activity

### Missing Features ❌
- Executive KPI dashboard page
- MRR/ARR calculation function
- Retention cohort analysis
- Burn rate calculation
- Investor-friendly export (PDF/CSV)

---

## Phase 1: Database Functions (Auto-Calculate KPIs)

### 1.1 Create Investor KPIs Function

**File:** `supabase/migrations/20250118_investor_kpi_dashboard.sql`

```sql
-- =====================================================
-- INVESTOR KPI DASHBOARD: Auto-Calculated Metrics
-- =====================================================

-- Function: Calculate all investor KPIs in one query
CREATE OR REPLACE FUNCTION get_investor_kpis(
  p_current_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  p_previous_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
)
RETURNS TABLE (
  -- Revenue metrics
  mrr DECIMAL,
  arr DECIMAL,
  mrr_growth_percent DECIMAL,

  -- Customer metrics
  total_customers INT,
  active_customers INT,
  new_customers_this_month INT,
  churned_customers_this_month INT,
  customer_growth_rate DECIMAL,

  -- Profitability metrics
  gross_margin_percent DECIMAL,
  total_revenue_this_month DECIMAL,
  total_costs_this_month DECIMAL,
  net_profit_this_month DECIMAL,

  -- Unit economics
  avg_ltv DECIMAL,
  avg_cac DECIMAL,
  ltv_cac_ratio DECIMAL,

  -- Retention metrics
  net_retention_rate DECIMAL,
  gross_retention_rate DECIMAL,

  -- Burn rate
  monthly_burn_rate DECIMAL,
  runway_months DECIMAL,

  -- Activity metrics
  total_active_staff INT,
  total_shifts_filled_this_month INT,
  platform_utilization_percent DECIMAL
) AS $$
DECLARE
  v_mrr_current DECIMAL;
  v_mrr_previous DECIMAL;
  v_total_cash DECIMAL := 0; -- TODO: Link to actual bank balance
BEGIN
  -- Calculate current month MRR
  SELECT COALESCE(SUM(revenue_amount), 0) INTO v_mrr_current
  FROM usage_metrics
  WHERE event_date >= p_current_month
    AND event_date < p_current_month + INTERVAL '1 month';

  -- Calculate previous month MRR
  SELECT COALESCE(SUM(revenue_amount), 0) INTO v_mrr_previous
  FROM usage_metrics
  WHERE event_date >= p_previous_month
    AND event_date < p_previous_month + INTERVAL '1 month';

  RETURN QUERY
  SELECT
    -- Revenue metrics
    v_mrr_current as mrr,
    v_mrr_current * 12 as arr,
    CASE WHEN v_mrr_previous > 0 THEN ((v_mrr_current - v_mrr_previous) / v_mrr_previous) * 100 ELSE 0 END as mrr_growth_percent,

    -- Customer metrics
    (SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL) as total_customers,
    (SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL AND id IN (
      SELECT DISTINCT agency_id FROM usage_metrics WHERE event_date >= p_current_month - INTERVAL '30 days'
    )) as active_customers,
    (SELECT COUNT(*) FROM agencies WHERE created_at >= p_current_month AND created_at < p_current_month + INTERVAL '1 month') as new_customers_this_month,
    (SELECT COUNT(*) FROM agencies WHERE deleted_at >= p_current_month AND deleted_at < p_current_month + INTERVAL '1 month') as churned_customers_this_month,
    CASE
      WHEN (SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL) > 0
      THEN (
        (SELECT COUNT(*) FROM agencies WHERE created_at >= p_current_month AND created_at < p_current_month + INTERVAL '1 month')::DECIMAL /
        (SELECT COUNT(*) FROM agencies WHERE deleted_at IS NULL)
      ) * 100
      ELSE 0
    END as customer_growth_rate,

    -- Profitability metrics
    (SELECT
      CASE WHEN COALESCE(SUM(total_revenue), 0) > 0
      THEN ((COALESCE(SUM(total_revenue), 0) - COALESCE(SUM(total_costs), 0)) / COALESCE(SUM(total_revenue), 0)) * 100
      ELSE 0 END
    FROM usage_metrics_summary
    WHERE period_start >= p_current_month AND period_start < p_current_month + INTERVAL '1 month') as gross_margin_percent,

    v_mrr_current as total_revenue_this_month,

    (SELECT COALESCE(SUM(amount), 0) FROM operational_costs
     WHERE cost_date >= p_current_month AND cost_date < p_current_month + INTERVAL '1 month') as total_costs_this_month,

    v_mrr_current - (SELECT COALESCE(SUM(amount), 0) FROM operational_costs
                     WHERE cost_date >= p_current_month AND cost_date < p_current_month + INTERVAL '1 month') as net_profit_this_month,

    -- Unit economics
    (SELECT AVG(estimated_ltv) FROM agency_unit_economics WHERE estimated_ltv > 0) as avg_ltv,
    (SELECT AVG(cac) FROM agency_unit_economics WHERE cac > 0) as avg_cac,
    (SELECT
      CASE WHEN AVG(cac) > 0 THEN AVG(estimated_ltv) / AVG(cac) ELSE 0 END
    FROM agency_unit_economics WHERE cac > 0 AND estimated_ltv > 0) as ltv_cac_ratio,

    -- Retention metrics (simplified - can be enhanced with cohort analysis)
    100.0 - (
      (SELECT COUNT(*) FROM agencies WHERE deleted_at >= p_current_month AND deleted_at < p_current_month + INTERVAL '1 month')::DECIMAL /
      NULLIF((SELECT COUNT(*) FROM agencies WHERE created_at < p_current_month), 0) * 100
    ) as net_retention_rate,

    100.0 - (
      (SELECT COUNT(*) FROM agencies WHERE deleted_at >= p_current_month AND deleted_at < p_current_month + INTERVAL '1 month')::DECIMAL /
      NULLIF((SELECT COUNT(*) FROM agencies WHERE created_at < p_current_month), 0) * 100
    ) as gross_retention_rate,

    -- Burn rate
    (SELECT COALESCE(SUM(amount), 0) FROM operational_costs
     WHERE cost_date >= p_current_month AND cost_date < p_current_month + INTERVAL '1 month') - v_mrr_current as monthly_burn_rate,

    CASE
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM operational_costs WHERE cost_date >= p_current_month) - v_mrr_current > 0
      THEN v_total_cash / ((SELECT COALESCE(SUM(amount), 0) FROM operational_costs WHERE cost_date >= p_current_month) - v_mrr_current)
      ELSE 999 -- Profitable, infinite runway
    END as runway_months,

    -- Activity metrics
    (SELECT COUNT(*) FROM staff WHERE account_status = 'active' AND deleted_at IS NULL) as total_active_staff,

    (SELECT COUNT(*) FROM usage_metrics
     WHERE event_type = 'shift_filled'
       AND event_date >= p_current_month
       AND event_date < p_current_month + INTERVAL '1 month') as total_shifts_filled_this_month,

    (SELECT
      CASE WHEN COUNT(DISTINCT s.id) > 0
      THEN (COUNT(*) FILTER (WHERE sh.status IN ('accepted', 'confirmed', 'completed'))::DECIMAL / COUNT(DISTINCT s.id)) * 100
      ELSE 0 END
    FROM staff s
    LEFT JOIN shifts sh ON sh.assigned_staff_id = s.id AND sh.shift_date >= p_current_month
    WHERE s.account_status = 'active' AND s.deleted_at IS NULL) as platform_utilization_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to super admin only (add role check later)
GRANT EXECUTE ON FUNCTION get_investor_kpis TO authenticated;

COMMENT ON FUNCTION get_investor_kpis IS 'Executive dashboard: MRR, ARR, growth, retention, LTV:CAC, burn rate';
```

### 1.2 Create Historical KPI Tracking Table

```sql
-- Table to store monthly KPI snapshots (for trend charts)
CREATE TABLE IF NOT EXISTS investor_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_month DATE NOT NULL UNIQUE,

  -- Revenue metrics
  mrr DECIMAL NOT NULL,
  arr DECIMAL NOT NULL,
  mrr_growth_percent DECIMAL,

  -- Customer metrics
  total_customers INT,
  active_customers INT,
  new_customers INT,
  churned_customers INT,

  -- Profitability
  gross_margin_percent DECIMAL,
  net_profit DECIMAL,

  -- Unit economics
  avg_ltv DECIMAL,
  avg_cac DECIMAL,
  ltv_cac_ratio DECIMAL,

  -- Retention
  net_retention_rate DECIMAL,

  -- Burn rate
  monthly_burn_rate DECIMAL,
  runway_months DECIMAL,

  -- Snapshot metadata
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kpi_snapshots_month ON investor_kpi_snapshots(snapshot_month DESC);

-- RLS: Super admin only
ALTER TABLE investor_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access kpi snapshots" ON investor_kpi_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

COMMENT ON TABLE investor_kpi_snapshots IS 'Monthly KPI snapshots for trend analysis and investor reporting';
```

### 1.3 Create Cron Job to Snapshot KPIs Monthly

```sql
-- Function to snapshot KPIs (run monthly)
CREATE OR REPLACE FUNCTION snapshot_investor_kpis()
RETURNS void AS $$
DECLARE
  v_last_month DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  v_kpis RECORD;
BEGIN
  -- Get KPIs for last completed month
  SELECT * INTO v_kpis FROM get_investor_kpis(v_last_month, v_last_month - INTERVAL '1 month');

  -- Insert snapshot (or update if already exists)
  INSERT INTO investor_kpi_snapshots (
    snapshot_month,
    mrr,
    arr,
    mrr_growth_percent,
    total_customers,
    active_customers,
    new_customers,
    churned_customers,
    gross_margin_percent,
    net_profit,
    avg_ltv,
    avg_cac,
    ltv_cac_ratio,
    net_retention_rate,
    monthly_burn_rate,
    runway_months
  )
  VALUES (
    v_last_month,
    v_kpis.mrr,
    v_kpis.arr,
    v_kpis.mrr_growth_percent,
    v_kpis.total_customers,
    v_kpis.active_customers,
    v_kpis.new_customers_this_month,
    v_kpis.churned_customers_this_month,
    v_kpis.gross_margin_percent,
    v_kpis.net_profit_this_month,
    v_kpis.avg_ltv,
    v_kpis.avg_cac,
    v_kpis.ltv_cac_ratio,
    v_kpis.net_retention_rate,
    v_kpis.monthly_burn_rate,
    v_kpis.runway_months
  )
  ON CONFLICT (snapshot_month)
  DO UPDATE SET
    mrr = EXCLUDED.mrr,
    arr = EXCLUDED.arr,
    mrr_growth_percent = EXCLUDED.mrr_growth_percent,
    total_customers = EXCLUDED.total_customers,
    active_customers = EXCLUDED.active_customers,
    new_customers = EXCLUDED.new_customers,
    churned_customers = EXCLUDED.churned_customers,
    gross_margin_percent = EXCLUDED.gross_margin_percent,
    net_profit = EXCLUDED.net_profit,
    avg_ltv = EXCLUDED.avg_ltv,
    avg_cac = EXCLUDED.avg_cac,
    ltv_cac_ratio = EXCLUDED.ltv_cac_ratio,
    net_retention_rate = EXCLUDED.net_retention_rate,
    monthly_burn_rate = EXCLUDED.monthly_burn_rate,
    runway_months = EXCLUDED.runway_months,
    snapshot_taken_at = NOW();

  RAISE NOTICE 'KPI snapshot saved for %', v_last_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule monthly snapshot (run on 2nd of each month at 3 AM)
SELECT cron.schedule(
  'snapshot-investor-kpis-monthly',
  '0 3 2 * *', -- 2nd of every month at 3 AM
  $$SELECT snapshot_investor_kpis();$$
);

-- Also create initial snapshot for current month
-- SELECT snapshot_investor_kpis(); -- Run manually after migration
```

---

## Phase 2: Frontend Dashboard

### 2.1 Create InvestorKPIDashboard Component

**File:** `src/pages/InvestorKPIDashboard.jsx` (NEW)

```javascript
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Activity,
  AlertCircle,
  Download
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const useInvestorKPIs = () => {
  return useQuery({
    queryKey: ['investor-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_investor_kpis', {
        p_current_month: new Date().toISOString().split('T')[0],
        p_previous_month: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
      });

      if (error) throw error;
      return data?.[0] || {};
    },
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  });
};

const useKPIHistory = () => {
  return useQuery({
    queryKey: ['kpi-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investor_kpi_snapshots')
        .select('*')
        .order('snapshot_month', { ascending: true })
        .limit(12); // Last 12 months

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000
  });
};

const KPICard = ({ title, value, subtitle, icon: Icon, trend, status }) => {
  const statusColors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200',
    neutral: 'text-blue-600 bg-blue-50 border-blue-200'
  };

  return (
    <Card className={`border-l-4 ${statusColors[status] || statusColors.neutral}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${statusColors[status]?.split(' ')[0]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(trend).toFixed(1)}% vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InvestorKPIDashboard = () => {
  const { data: kpis, isLoading } = useInvestorKPIs();
  const { data: history } = useKPIHistory();
  const [selectedMetric, setSelectedMetric] = useState('mrr');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading investor KPIs...</p>
        </div>
      </div>
    );
  }

  const exportToPDF = () => {
    // TODO: Implement PDF export (use jsPDF or similar)
    alert('PDF export coming soon');
  };

  // Determine status colors based on thresholds
  const getMarginStatus = (margin) => {
    if (margin >= 40) return 'success';
    if (margin >= 20) return 'warning';
    return 'danger';
  };

  const getLTVCACStatus = (ratio) => {
    if (ratio >= 3) return 'success';
    if (ratio >= 1) return 'warning';
    return 'danger';
  };

  const getRunwayStatus = (months) => {
    if (months >= 18) return 'success';
    if (months >= 6) return 'warning';
    return 'danger';
  };

  // Prepare chart data
  const chartData = history?.map(snapshot => ({
    month: new Date(snapshot.snapshot_month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    MRR: Number(snapshot.mrr || 0),
    ARR: Number(snapshot.arr || 0),
    Customers: snapshot.active_customers || 0,
    Margin: Number(snapshot.gross_margin_percent || 0),
    'LTV:CAC': Number(snapshot.ltv_cac_ratio || 0)
  })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investor KPI Dashboard</h1>
          <p className="text-muted-foreground">Real-time platform metrics for investor reporting</p>
        </div>
        <Button onClick={exportToPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Recurring Revenue"
          value={`£${Number(kpis.mrr || 0).toLocaleString()}`}
          subtitle={`ARR: £${Number(kpis.arr || 0).toLocaleString()}`}
          icon={DollarSign}
          trend={kpis.mrr_growth_percent}
          status={kpis.mrr_growth_percent >= 10 ? 'success' : kpis.mrr_growth_percent >= 0 ? 'warning' : 'danger'}
        />

        <KPICard
          title="Active Customers"
          value={kpis.active_customers || 0}
          subtitle={`${kpis.new_customers_this_month || 0} new, ${kpis.churned_customers_this_month || 0} churned`}
          icon={Users}
          trend={kpis.customer_growth_rate}
          status={kpis.customer_growth_rate >= 10 ? 'success' : 'neutral'}
        />

        <KPICard
          title="Gross Margin"
          value={`${Number(kpis.gross_margin_percent || 0).toFixed(1)}%`}
          subtitle={`Profit: £${Number(kpis.net_profit_this_month || 0).toLocaleString()}`}
          icon={TrendingUp}
          status={getMarginStatus(kpis.gross_margin_percent)}
        />

        <KPICard
          title="LTV:CAC Ratio"
          value={`${Number(kpis.ltv_cac_ratio || 0).toFixed(1)}:1`}
          subtitle={`LTV: £${Number(kpis.avg_ltv || 0).toLocaleString()} | CAC: £${Number(kpis.avg_cac || 0).toLocaleString()}`}
          icon={Target}
          status={getLTVCACStatus(kpis.ltv_cac_ratio)}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Burn Rate & Runway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Burn:</span>
                <span className="font-semibold">£{Number(kpis.monthly_burn_rate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Runway:</span>
                <Badge variant={getRunwayStatus(kpis.runway_months)}>
                  {kpis.runway_months >= 999 ? 'Profitable' : `${Math.floor(kpis.runway_months || 0)} months`}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Retention Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Retention:</span>
                <span className="font-semibold">{Number(kpis.net_retention_rate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Retention:</span>
                <span className="font-semibold">{Number(kpis.gross_retention_rate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Staff:</span>
                <span className="font-semibold">{kpis.total_active_staff || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shifts This Month:</span>
                <span className="font-semibold">{kpis.total_shifts_filled_this_month || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utilization:</span>
                <span className="font-semibold">{Number(kpis.platform_utilization_percent || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="MRR" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Customers" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gross Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Margin" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LTV:CAC Ratio Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="LTV:CAC" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {(kpis.gross_margin_percent < 20 || kpis.ltv_cac_ratio < 1 || kpis.runway_months < 6) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-red-700">
              {kpis.gross_margin_percent < 20 && (
                <li>• Gross margin below 20% - Review pricing and cost structure</li>
              )}
              {kpis.ltv_cac_ratio < 1 && (
                <li>• LTV:CAC ratio below 1:1 - Customer acquisition not profitable</li>
              )}
              {kpis.runway_months < 6 && kpis.runway_months < 999 && (
                <li>• Runway less than 6 months - Immediate fundraising or cost reduction needed</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvestorKPIDashboard;
```

### 2.2 Add Route to Super Admin Sidebar

**File:** [src/components/SuperAdminLayout.jsx](src/components/SuperAdminLayout.jsx) or equivalent

```javascript
// Add to super admin navigation
import { BarChart3 } from 'lucide-react';

const superAdminRoutes = [
  // ... existing routes
  {
    path: '/super-admin/investor-kpis',
    label: 'Investor KPIs',
    icon: BarChart3,
    component: InvestorKPIDashboard
  }
];
```

---

## Phase 3: Export & Reporting

### 3.1 Create PDF Export Function (Future Enhancement)

```javascript
// File: src/utils/exportKPIs.js (NEW)
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportInvestorKPIsToPDF = async (kpis, history) => {
  const doc = new jsPDF();

  // Title page
  doc.setFontSize(22);
  doc.text('ACG StaffLink - Investor KPI Report', 20, 20);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);

  // KPI Summary Table
  doc.autoTable({
    startY: 40,
    head: [['Metric', 'Value', 'Status']],
    body: [
      ['Monthly Recurring Revenue', `£${Number(kpis.mrr).toLocaleString()}`, kpis.mrr_growth_percent >= 0 ? '✓ Growing' : '✗ Declining'],
      ['Annual Recurring Revenue', `£${Number(kpis.arr).toLocaleString()}`, ''],
      ['Active Customers', kpis.active_customers, ''],
      ['Gross Margin', `${Number(kpis.gross_margin_percent).toFixed(1)}%`, kpis.gross_margin_percent >= 30 ? '✓ Healthy' : '⚠ Low'],
      ['LTV:CAC Ratio', `${Number(kpis.ltv_cac_ratio).toFixed(1)}:1`, kpis.ltv_cac_ratio >= 3 ? '✓ Excellent' : '⚠ Needs Improvement'],
      ['Net Retention Rate', `${Number(kpis.net_retention_rate).toFixed(1)}%`, ''],
      ['Monthly Burn Rate', `£${Number(kpis.monthly_burn_rate).toLocaleString()}`, ''],
      ['Runway', kpis.runway_months >= 999 ? 'Profitable' : `${Math.floor(kpis.runway_months)} months`, kpis.runway_months >= 12 ? '✓ Good' : '⚠ Low']
    ]
  });

  // Save PDF
  doc.save(`investor-kpis-${new Date().toISOString().split('T')[0]}.pdf`);
};
```

---

## Phase 4: Testing & Validation

### 4.1 Test KPI Calculations

**File:** `scripts/test-investor-kpis.sql`

```sql
-- Test 1: Verify KPI function returns data
SELECT * FROM get_investor_kpis(
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
);

-- Test 2: Verify snapshot creation
SELECT snapshot_investor_kpis();
SELECT * FROM investor_kpi_snapshots ORDER BY snapshot_month DESC LIMIT 3;

-- Test 3: Verify cron job scheduled
SELECT * FROM cron.job WHERE jobname = 'snapshot-investor-kpis-monthly';

-- Test 4: Validate MRR calculation
SELECT
  DATE_TRUNC('month', event_date) as month,
  SUM(revenue_amount) as calculated_mrr
FROM usage_metrics
WHERE event_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month DESC;

-- Test 5: Validate LTV:CAC ratios
SELECT
  agency_name,
  cac,
  estimated_ltv,
  CASE WHEN cac > 0 THEN estimated_ltv / cac ELSE 0 END as ltv_cac_ratio
FROM agency_unit_economics
WHERE cac > 0
ORDER BY ltv_cac_ratio DESC
LIMIT 10;
```

### 4.2 Production Validation Checklist

- [ ] `get_investor_kpis` function returns all KPIs without errors
- [ ] `investor_kpi_snapshots` table created successfully
- [ ] Monthly snapshot cron job scheduled
- [ ] Frontend dashboard displays all KPIs correctly
- [ ] Charts render with historical data (if available)
- [ ] Health alerts trigger correctly (test with low margin/runway)
- [ ] Super admin access only (agency owners cannot access)
- [ ] Performance: Dashboard loads < 3 seconds
- [ ] PDF export works (if implemented)

---

## Success Metrics

### Immediate (Week 1)
- ✅ All 6 core KPIs calculate correctly
- ✅ Dashboard loads without errors
- ✅ Monthly snapshot cron job runs successfully
- ✅ Historical trend charts display (if data exists)

### Short-term (Month 1)
- 📊 Use dashboard in investor pitch (capture feedback)
- 📊 Track MRR growth week-over-week
- 📊 Identify 3 key metrics to improve (based on investor feedback)
- 📊 Export first investor report PDF

### Long-term (Quarter 1)
- 💰 MRR growth >20% month-over-month
- 💰 Gross margin >30%
- 💰 LTV:CAC ratio >3:1
- 💰 Net retention >100% (expansion revenue)
- 💰 Successfully close seed round using dashboard data

---

## Automation Summary

| **Task** | **Method** | **Manual Work** |
|----------|-----------|-----------------|
| KPI calculation | RPC function (real-time) | ❌ ZERO |
| Monthly snapshots | Cron job (auto) | ❌ ZERO |
| Dashboard refresh | React Query (auto) | ❌ ZERO |
| Charts generation | Recharts (auto) | ❌ ZERO |
| Health alerts | Frontend logic (auto) | ❌ ZERO |
| PDF export | Button click | ⚠️ 1 CLICK |

**Total manual work:** 🎯 **1 click for PDF export** (everything else automated)

---

## Dependencies

- ✅ MODULE 29 completed (`usage_metrics` table)
- ✅ MODULE 30 completed (`agency_unit_economics` view)
- ✅ Existing `operational_costs` table
- ✅ Recharts library (already in use)
- ⚠️ jsPDF library (install for PDF export: `npm install jspdf jspdf-autotable`)

---

## Risks & Mitigations

| **Risk** | **Mitigation** |
|----------|----------------|
| Inaccurate revenue data | Verify MODULE 29 triggers are working correctly |
| Missing historical data for charts | Backfill snapshots manually for past 12 months |
| Runway calculation assumes fixed burn | Update monthly based on actual costs |
| LTV calculation too optimistic | Refine based on actual churn data |
| Investor questions KPI accuracy | Add "Data Sources" section to dashboard |

---

## Future Enhancements (Post-MVP)

1. **Cohort Analysis** → Track KPIs by agency signup month
2. **Forecasting** → ML-based MRR prediction (6-month forecast)
3. **Benchmarking** → Compare to industry standards (SaaS metrics)
4. **Real-time Alerts** → Email/Slack when KPI crosses threshold
5. **Investor Portal** → Read-only dashboard for board members
6. **Automated Reporting** → Weekly email digest to stakeholders

---

## Agent Handoff Notes

- Create [src/pages/InvestorKPIDashboard.jsx](src/pages/InvestorKPIDashboard.jsx) with full component code
- Add route to super admin navigation (restrict to super admin role)
- Run migration to create `investor_kpi_snapshots` table and cron job
- Test with real Dominion Healthcare data to verify accuracy
- Consider backfilling historical snapshots if needed for trend charts
- Install Recharts if not already present: `npm install recharts`
- PDF export is optional for MVP (can defer to Phase 2)

---

**Module Status:** 📝 Ready for Agent Execution
**Automation Level:** 🤖 99% Automated (Only PDF export manual)
**Estimated Time:** 6-8 hours (DB + Frontend + Charts + Testing)

---

## Investor Pitch Talking Points

Use this dashboard to communicate:

1. **"We're growing 20% MoM"** → Point to MRR growth trend
2. **"Our unit economics are healthy"** → Show LTV:CAC ratio >3:1
3. **"We're capital efficient"** → Point to gross margin >30%
4. **"Customers love us"** → Show net retention >100% (if expansion revenue exists)
5. **"We have 18 months runway"** → De-risk investment
6. **"Proven traction"** → Show customer growth and platform activity

**Key Investor Questions This Dashboard Answers:**
- ✅ How much recurring revenue do you have? (MRR/ARR)
- ✅ Are you growing? (MRR growth %)
- ✅ Are you profitable? (Gross margin %)
- ✅ Do customers stay? (Net retention rate)
- ✅ Is your CAC sustainable? (LTV:CAC ratio)
- ✅ How long can you operate? (Runway)

