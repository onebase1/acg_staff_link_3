# MODULE 7: Implementation Guide

**For Agent Execution - Follow Step by Step**

---

## PHASE 1: Database Schema (1 hour)

### Step 1.1: Create Migration File

**File:** `supabase/migrations/20251217_edge_function_health.sql`

```sql
-- ============================================================================
-- EDGE FUNCTION HEALTH MONITORING
-- Created: 2025-12-17
-- Purpose: Track all Edge Function executions and health
-- ============================================================================

-- Logs table for every execution
CREATE TABLE IF NOT EXISTS edge_function_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('running', 'success', 'error')),
    error_message TEXT,
    execution_ms INTEGER,
    payload_size_bytes INTEGER,
    agency_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_edge_logs_function ON edge_function_logs(function_name);
CREATE INDEX idx_edge_logs_status ON edge_function_logs(status);
CREATE INDEX idx_edge_logs_started ON edge_function_logs(started_at DESC);

-- Health summary view (materialized for performance)
CREATE MATERIALIZED VIEW edge_function_health AS
SELECT 
    function_name,
    COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as invocations_24h,
    COUNT(*) FILTER (WHERE status = 'success' AND started_at > NOW() - INTERVAL '24 hours') as successes_24h,
    COUNT(*) FILTER (WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours') as failures_24h,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'success' AND started_at > NOW() - INTERVAL '24 hours') / 
        NULLIF(COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours'), 0),
        1
    ) as success_rate_24h,
    AVG(execution_ms) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') as avg_execution_ms,
    MAX(completed_at) FILTER (WHERE status = 'success') as last_success,
    MAX(completed_at) FILTER (WHERE status = 'error') as last_failure,
    CASE
        WHEN COUNT(*) FILTER (WHERE status = 'error' AND started_at > NOW() - INTERVAL '1 hour') > 3 THEN 'red'
        WHEN COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') = 0 THEN 'yellow'
        WHEN COUNT(*) FILTER (WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours') > 0 THEN 'yellow'
        ELSE 'green'
    END as health_status
FROM edge_function_logs
GROUP BY function_name;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_edge_function_health()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW edge_function_health;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 5 minutes
SELECT cron.schedule(
    'refresh-edge-function-health',
    '*/5 * * * *',
    'SELECT refresh_edge_function_health();'
);

-- Grant access
GRANT SELECT ON edge_function_logs TO authenticated;
GRANT SELECT ON edge_function_health TO authenticated;
```

### Step 1.2: Apply Migration
```bash
supabase db push
```

---

## PHASE 2: Logging Utility (2 hours)

### Step 2.1: Create Shared Logger

**File:** `supabase/functions/_shared/logger.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function logFunctionStart(functionName: string, metadata?: object) {
  const { data } = await supabase
    .from('edge_function_logs')
    .insert({
      function_name: functionName,
      status: 'running',
      metadata: metadata || {}
    })
    .select('id')
    .single();
  return data?.id;
}

export async function logFunctionEnd(logId: string, success: boolean, error?: string) {
  const startLog = await supabase
    .from('edge_function_logs')
    .select('started_at')
    .eq('id', logId)
    .single();
    
  const executionMs = startLog.data 
    ? Date.now() - new Date(startLog.data.started_at).getTime()
    : null;

  await supabase
    .from('edge_function_logs')
    .update({
      completed_at: new Date().toISOString(),
      status: success ? 'success' : 'error',
      error_message: error,
      execution_ms: executionMs
    })
    .eq('id', logId);
}

export function withLogging(functionName: string, handler: Function) {
  return async (req: Request) => {
    const logId = await logFunctionStart(functionName);
    try {
      const result = await handler(req);
      await logFunctionEnd(logId!, true);
      return result;
    } catch (error) {
      await logFunctionEnd(logId!, false, error.message);
      throw error;
    }
  };
}
```

### Step 2.2: Update Critical Functions

Add to top 10 critical functions. Example pattern:

```typescript
import { withLogging } from '../_shared/logger.ts';

const handler = async (req: Request) => {
  // existing function code
};

Deno.serve(withLogging('function-name', handler));
```

---

## PHASE 3: Health Dashboard UI (3-4 hours)

### Step 3.1: Create Page Component

**File:** `src/pages/EdgeFunctionHealth.jsx`

See FILES_AFFECTED.md for full component template with:
- Fetch from edge_function_health view
- Color-coded status badges
- Sortable table
- Click to expand execution history
- Manual refresh button

---

## ✅ COMPLETION CHECKLIST

- [ ] Migration applied successfully
- [ ] Logger utility created and working
- [ ] 10 functions updated with logging
- [ ] Dashboard page created
- [ ] Route added to App.jsx
- [ ] All functions visible in dashboard
- [ ] Status colors correct
- [ ] Execution history viewable

