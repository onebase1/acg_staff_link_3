# Enhanced Notification Monitoring - Implementation Plan

**Date**: 2025-12-31
**Purpose**: Upgrade NotificationMonitor to provide comprehensive visibility across all channels
**Priority**: HIGH (Required before n8n migration)

---

## Executive Summary

This plan details the technical implementation for enhancing the NotificationMonitor UI to provide:
- ✅ Multi-channel support (Email + SMS + WhatsApp)
- ✅ Historical log view (not just active queue)
- ✅ Analytics dashboard (trends, success rates, errors)
- ✅ GDPR compliance monitoring (preference enforcement)
- ✅ n8n migration support (source tracking)

---

## 1. ENHANCED NOTIFICATIONMONITOR.JSX

### Current State

**File**: `src/pages/NotificationMonitor.jsx`
**Lines**: ~400-500 (estimate)
**Current Features**:
- Email queue view only (`notification_queue` table)
- Real-time refresh (30 sec)
- Status filtering (All, Pending, Sent, Failed)
- Search by email/type
- Force send capability

### Proposed Enhancements

#### **Phase 1: Multi-Tab Interface**

**Tab Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Notification Monitor                            [Export]    │
├─────────────────────────────────────────────────────────────┤
│  [📧 Email Queue] [📧 Email History] [📱 SMS] [💬 WhatsApp] │
│  [📊 Analytics] [⚙️ Settings]                               │
├─────────────────────────────────────────────────────────────┤
│  [Active tab content]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Tab 1: Email Queue** (Current functionality - keep as-is)
- Shows `notification_queue` table
- Real-time pending/sent/failed status
- Force send capability
- Countdown timers

**Tab 2: Email History** (NEW)
- Shows `notification_log` WHERE channel = 'email'
- Date range picker (default: last 7 days)
- All sent emails (not just queue)
- Message IDs with Resend dashboard links
- Preference check status (opted_in vs opted_out vs not_checked)

**Tab 3: SMS** (NEW)
- Shows `notification_log` WHERE channel = 'sms'
- All SMS sends
- Twilio message IDs
- Delivery status
- Character count (160 char limit indicator)

**Tab 4: WhatsApp** (NEW)
- Shows `notification_log` WHERE channel = 'whatsapp'
- All WhatsApp sends
- Twilio WhatsApp message IDs
- Interactive message type (text, buttons, media)
- Conversation threads (group by recipient)

**Tab 5: Analytics Dashboard** (NEW)
- Channel breakdown (pie chart)
- Success rates over time (line chart)
- Volume trends (bar chart)
- Top notification types
- Error frequency

**Tab 6: Settings** (NEW)
- Auto-refresh interval
- Default date range
- Export format preferences
- Alert thresholds

---

### Component Architecture

```javascript
// Enhanced NotificationMonitor.jsx structure

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { EmailQueueTab } from './tabs/EmailQueueTab'
import { EmailHistoryTab } from './tabs/EmailHistoryTab'
import { SMSTab } from './tabs/SMSTab'
import { WhatsAppTab } from './tabs/WhatsAppTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { SettingsTab } from './tabs/SettingsTab'

export default function NotificationMonitor() {
  const [activeTab, setActiveTab] = useState('email-queue')
  const [dateRange, setDateRange] = useState({ from: 7daysAgo, to: now })
  const [filters, setFilters] = useState({
    channel: 'all',
    status: 'all',
    recipientType: 'all',
    source: 'all' // supabase_function | n8n_workflow | all
  })

  return (
    <div className="p-6">
      <Header title="Notification Monitor" />

      <FilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="email-queue">📧 Email Queue</TabsTrigger>
          <TabsTrigger value="email-history">📧 Email History</TabsTrigger>
          <TabsTrigger value="sms">📱 SMS</TabsTrigger>
          <TabsTrigger value="whatsapp">💬 WhatsApp</TabsTrigger>
          <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="email-queue">
          <EmailQueueTab filters={filters} />
        </TabsContent>

        <TabsContent value="email-history">
          <EmailHistoryTab dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="sms">
          <SMSTab dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## 2. NEW COMPONENTS TO CREATE

### 2.1 FilterBar Component

**File**: `src/components/notifications/FilterBar.jsx`

**Features**:
- Date range picker (last 7 days, 30 days, custom)
- Channel filter (All, Email, SMS, WhatsApp)
- Status filter (All, Sent, Failed, Pending, Skipped)
- Recipient type (All, Client, Staff, Admin)
- Source filter (All, Supabase, n8n) - for migration monitoring
- Search by email/phone/message ID
- Export button (CSV, JSON)

**Code Sketch**:
```javascript
export function FilterBar({ dateRange, onDateRangeChange, filters, onFiltersChange }) {
  return (
    <div className="flex gap-4 mb-6">
      <DateRangePicker
        value={dateRange}
        onChange={onDateRangeChange}
        presets={[
          { label: 'Last 7 days', value: 7 },
          { label: 'Last 30 days', value: 30 },
          { label: 'Last 90 days', value: 90 }
        ]}
      />

      <Select value={filters.channel} onChange={v => onFiltersChange({...filters, channel: v})}>
        <option value="all">All Channels</option>
        <option value="email">📧 Email</option>
        <option value="sms">📱 SMS</option>
        <option value="whatsapp">💬 WhatsApp</option>
      </Select>

      <Select value={filters.status}>
        <option value="all">All Statuses</option>
        <option value="sent">✅ Sent</option>
        <option value="failed">❌ Failed</option>
        <option value="pending">⏳ Pending</option>
        <option value="skipped">🚫 Skipped (Opted Out)</option>
      </Select>

      <Select value={filters.source}>
        <option value="all">All Sources</option>
        <option value="supabase_function">Supabase Functions</option>
        <option value="n8n_workflow">n8n Workflows</option>
      </Select>

      <SearchInput placeholder="Search email, phone, message ID..." />

      <ExportButton onClick={handleExport} />
    </div>
  )
}
```

---

### 2.2 EmailHistoryTab Component

**File**: `src/components/notifications/tabs/EmailHistoryTab.jsx`

**Database Query**:
```javascript
const { data, error } = await supabase
  .from('notification_log')
  .select('*')
  .eq('channel', 'email') // Filter by channel
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)
  .eq('status', filters.status === 'all' ? undefined : filters.status)
  .eq('source', filters.source === 'all' ? undefined : filters.source)
  .order('created_at', { ascending: false })
  .limit(100)
```

**Table Columns**:
- Timestamp (created_at)
- Recipient (recipient_email)
- Type (notification_type)
- Subject (extract from metadata)
- Status (delivery_status with icon)
- Preference Check (✅ Checked, ⚠️ Not Checked, 🚫 Opted Out)
- Source (Supabase vs n8n badge)
- Message ID (link to Resend)
- Error (if failed)
- Actions (View Details, Resend)

---

### 2.3 SMSTab Component

**File**: `src/components/notifications/tabs/SMSTab.jsx`

**Database Query**:
```javascript
const { data, error } = await supabase
  .from('notification_log')
  .select('*')
  .eq('channel', 'sms')
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)
  .order('created_at', { ascending: false })
  .limit(100)
```

**Table Columns**:
- Timestamp
- Recipient Phone
- Message Preview (first 50 chars)
- Character Count (highlight if >160)
- Status (Sent, Failed, Delivered, Queued)
- Twilio Message ID (link to Twilio console)
- Cost (if available from Twilio)
- Error (if failed)

**Special Features**:
- Character count indicator (SMS is 160 char limit)
- Link to Twilio console for delivery status
- Delivery status tracking (sent → delivered → read)

---

### 2.4 WhatsAppTab Component

**File**: `src/components/notifications/tabs/WhatsAppTab.jsx`

**Database Query**:
```javascript
const { data, error } = await supabase
  .from('notification_log')
  .select('*')
  .eq('channel', 'whatsapp')
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)
  .order('created_at', { ascending: false })
  .limit(100)
```

**Table Columns**:
- Timestamp
- Recipient Phone (WhatsApp number)
- Message Type (Text, Interactive, Media, Template)
- Preview (first 50 chars or media description)
- Status (Sent, Delivered, Read, Failed)
- Twilio Message ID
- Conversation Thread (group by recipient + date)
- Actions (View Thread, Reply)

**Special Features**:
- Conversation threading (group messages by recipient)
- Media preview (images, PDFs sent via WhatsApp)
- Interactive button tracking (which buttons clicked)
- AI conversation indicator (from whatsapp-master-router)

---

### 2.5 AnalyticsTab Component

**File**: `src/components/notifications/tabs/AnalyticsTab.jsx`

**Dashboard Layout**:

```
┌────────────────────┬────────────────────┬────────────────────┐
│  Total Sent        │  Success Rate      │  Failed            │
│  1,234             │  98.5%             │  18                │
└────────────────────┴────────────────────┴────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Channel Breakdown (Pie Chart)                              │
│  📧 Email: 45%  📱 SMS: 30%  💬 WhatsApp: 25%              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Volume Over Time (Line Chart)                              │
│  Daily send counts for last 30 days                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Success Rate Trend (Line Chart)                            │
│  Success % over time per channel                            │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┬─────────────────────────────────────┐
│  Top Notification     │  Top Errors                         │
│  Types                │                                     │
│  1. Shift reminders   │  1. Invalid phone: 12               │
│  2. Daily digest      │  2. Rate limit: 5                   │
│  3. Batch confirms    │  3. Network: 3                      │
└───────────────────────┴─────────────────────────────────────┘
```

**Database Queries**:

```javascript
// Summary Stats
const { data: stats } = await supabase.rpc('get_notification_stats', {
  start_date: dateRange.from,
  end_date: dateRange.to
})

// Channel Breakdown
const { data: breakdown } = await supabase
  .from('notification_log')
  .select('channel, status')
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)

// Volume Over Time
const { data: volume } = await supabase.rpc('get_daily_volume', {
  start_date: dateRange.from,
  end_date: dateRange.to
})

// Top Notification Types
const { data: topTypes } = await supabase
  .from('notification_log')
  .select('notification_type, count:id.count()')
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)
  .group('notification_type')
  .order('count', { ascending: false })
  .limit(10)

// Top Errors
const { data: topErrors } = await supabase
  .from('notification_log')
  .select('error_message, count:id.count()')
  .eq('delivery_status', 'failed')
  .gte('created_at', dateRange.from)
  .lte('created_at', dateRange.to)
  .not('error_message', 'is', null)
  .group('error_message')
  .order('count', { ascending: false })
  .limit(10)
```

**Charts**:
- Use Recharts or Chart.js
- Responsive design
- Interactive tooltips
- Export to PNG

---

## 3. DATABASE RPC FUNCTIONS TO CREATE

### 3.1 get_notification_stats()

**File**: Create migration `supabase/migrations/YYYYMMDD_notification_monitoring_rpcs.sql`

```sql
CREATE OR REPLACE FUNCTION get_notification_stats(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  p_channel TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_sent BIGINT,
  total_failed BIGINT,
  total_skipped BIGINT,
  success_rate NUMERIC,
  email_count BIGINT,
  sms_count BIGINT,
  whatsapp_count BIGINT,
  supabase_count BIGINT,
  n8n_count BIGINT,
  preference_checked_count BIGINT,
  preference_not_checked_count BIGINT,
  opted_out_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE delivery_status = 'sent') AS total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') AS total_failed,
    COUNT(*) FILTER (WHERE delivery_status = 'not_sent' AND skip_reason IS NOT NULL) AS total_skipped,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE delivery_status = 'sent') / NULLIF(COUNT(*), 0),
      2
    ) AS success_rate,
    COUNT(*) FILTER (WHERE channel = 'email') AS email_count,
    COUNT(*) FILTER (WHERE channel = 'sms') AS sms_count,
    COUNT(*) FILTER (WHERE channel = 'whatsapp') AS whatsapp_count,
    COUNT(*) FILTER (WHERE source = 'supabase_function') AS supabase_count,
    COUNT(*) FILTER (WHERE source = 'n8n_workflow') AS n8n_count,
    COUNT(*) FILTER (WHERE preference_checked = true) AS preference_checked_count,
    COUNT(*) FILTER (WHERE preference_checked = false OR preference_checked IS NULL) AS preference_not_checked_count,
    COUNT(*) FILTER (WHERE preference_status = 'opted_out') AS opted_out_count
  FROM notification_log
  WHERE created_at >= start_date
    AND created_at <= end_date
    AND (p_channel IS NULL OR channel = p_channel);
END;
$$;
```

---

### 3.2 get_daily_volume()

```sql
CREATE OR REPLACE FUNCTION get_daily_volume(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  channel TEXT,
  total_count BIGINT,
  sent_count BIGINT,
  failed_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) AS date,
    nl.channel,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE delivery_status = 'sent') AS sent_count,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') AS failed_count
  FROM notification_log nl
  WHERE created_at >= start_date
    AND created_at <= end_date
  GROUP BY DATE(created_at), nl.channel
  ORDER BY date DESC, nl.channel;
END;
$$;
```

---

### 3.3 get_notification_trends()

```sql
CREATE OR REPLACE FUNCTION get_notification_trends(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_sent BIGINT,
  success_rate NUMERIC,
  avg_send_time_seconds NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) AS date,
    COUNT(*) FILTER (WHERE delivery_status = 'sent') AS total_sent,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE delivery_status = 'sent') / NULLIF(COUNT(*), 0),
      2
    ) AS success_rate,
    ROUND(
      AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FILTER (WHERE sent_at IS NOT NULL),
      2
    ) AS avg_send_time_seconds
  FROM notification_log
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$;
```

---

## 4. EXPORT FUNCTIONALITY

### CSV Export Feature

**Button**: Top right of each tab
**Formats**: CSV, JSON, Excel
**Filename**: `notifications_export_{channel}_{date}.csv`

**Implementation**:
```javascript
async function exportToCSV(channel, dateRange, filters) {
  // Query data
  const { data } = await supabase
    .from('notification_log')
    .select('*')
    .eq('channel', channel)
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to)
    // Apply filters

  // Convert to CSV
  const csv = convertToCSV(data)

  // Download
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `notifications_export_${channel}_${new Date().toISOString()}.csv`
  link.click()
}

function convertToCSV(data) {
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row =>
    Object.values(row).map(val => `"${val}"`).join(',')
  )
  return [headers, ...rows].join('\n')
}
```

---

## 5. REAL-TIME UPDATES

### WebSocket / Polling Strategy

**Current**: 30-second polling
**Enhanced**: Supabase real-time subscriptions

```javascript
useEffect(() => {
  const subscription = supabase
    .channel('notification_log_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_log'
      },
      (payload) => {
        // Add new notification to UI
        setNotifications(prev => [payload.new, ...prev])

        // Update stats
        updateStats()

        // Show toast notification
        toast.success(`New ${payload.new.channel} notification sent`)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [])
```

---

## 6. PREFERENCE ENFORCEMENT MONITORING

### New UI Section in Analytics Tab

**GDPR Compliance Dashboard**:

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 GDPR Compliance Status                                  │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ Preference Enforcement: NOT IMPLEMENTED                 │
│                                                              │
│  Notifications Checked for Preferences:  0 / 1,234 (0%)    │
│  Skipped Due to Opt-Out:                0                   │
│  Sent Despite Opt-Out:                  ??? (UNKNOWN)       │
│                                                              │
│  ❌ CRITICAL: Users cannot opt out - GDPR violation         │
│                                                              │
│  [View Remediation Plan]  [Track Implementation]            │
└─────────────────────────────────────────────────────────────┘
```

**After Preference Enforcement Implemented**:

```
┌─────────────────────────────────────────────────────────────┐
│  🔒 GDPR Compliance Status                                  │
├─────────────────────────────────────────────────────────────┤
│  ✅ Preference Enforcement: ACTIVE                          │
│                                                              │
│  Notifications Checked for Preferences:  1,234 / 1,234 (100%)│
│  Allowed (Opted In):                    1,180 (95.6%)       │
│  Skipped (Opted Out):                   54 (4.4%)           │
│                                                              │
│  ✅ All sends respect user preferences                      │
│                                                              │
│  [View Opt-Out Users]  [Export Compliance Report]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. N8N MIGRATION MONITORING

### Source Comparison View

**New Section in Analytics Tab**:

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 n8n Migration Status                                    │
├─────────────────────────────────────────────────────────────┤
│  Parallel Running: ACTIVE (Since 2025-01-15)                │
│                                                              │
│  │ Source          │ Sent  │ Failed │ Success Rate │       │
│  │ Supabase        │ 650   │ 8      │ 98.8%        │       │
│  │ n8n             │ 648   │ 5      │ 99.2%        │       │
│  │ Match Rate: 99.7% ✅                                     │
│                                                              │
│  Duplicates Detected: 2 (0.3%)  [View Details]              │
│  Missing from n8n: 2            [View Details]              │
│                                                              │
│  Status: ✅ Ready for cutover                               │
│                                                              │
│  [View Detailed Comparison]  [Export Migration Report]      │
└─────────────────────────────────────────────────────────────┘
```

**Comparison Query**:
```sql
-- Compare Supabase vs n8n sends
SELECT
  notification_type,
  source,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE delivery_status = 'sent') as successful
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND source IN ('supabase_function', 'n8n_workflow')
GROUP BY notification_type, source
ORDER BY notification_type, source;
```

---

## 8. IMPLEMENTATION TIMELINE

### Week 1: Core Infrastructure

**Day 1-2**: Database Functions
- [ ] Create `get_notification_stats()` RPC
- [ ] Create `get_daily_volume()` RPC
- [ ] Create `get_notification_trends()` RPC
- [ ] Test all RPC functions
- [ ] Grant permissions

**Day 3-4**: Component Structure
- [ ] Refactor NotificationMonitor to tabs
- [ ] Create FilterBar component
- [ ] Set up date range picker
- [ ] Implement tab routing

**Day 5**: Email History Tab
- [ ] Create EmailHistoryTab component
- [ ] Query notification_log for emails
- [ ] Display in table format
- [ ] Add pagination

---

### Week 2: Multi-Channel Support

**Day 1**: SMS Tab
- [ ] Create SMSTab component
- [ ] Query notification_log for SMS
- [ ] Display SMS-specific fields
- [ ] Link to Twilio console

**Day 2**: WhatsApp Tab
- [ ] Create WhatsAppTab component
- [ ] Query notification_log for WhatsApp
- [ ] Add conversation threading
- [ ] Display media previews

**Day 3-4**: Analytics Dashboard
- [ ] Create AnalyticsTab component
- [ ] Implement summary stats
- [ ] Add channel breakdown chart
- [ ] Add volume trend chart
- [ ] Add success rate chart

**Day 5**: Polish & Testing
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

---

### Week 3: Advanced Features

**Day 1**: Export Functionality
- [ ] CSV export
- [ ] JSON export
- [ ] Excel export (optional)
- [ ] Format selection UI

**Day 2**: Real-Time Updates
- [ ] Supabase real-time subscription
- [ ] Toast notifications for new sends
- [ ] Auto-update stats
- [ ] Manual refresh button

**Day 3**: GDPR Compliance Monitoring
- [ ] Preference enforcement dashboard
- [ ] Opt-out tracking
- [ ] Compliance report export

**Day 4**: n8n Migration Support
- [ ] Source comparison view
- [ ] Duplicate detection
- [ ] Match rate calculation
- [ ] Migration readiness indicator

**Day 5**: Testing & Documentation
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Write user documentation
- [ ] Create training materials

---

## 9. TECHNICAL SPECIFICATIONS

### Performance Requirements

- **Initial Load**: < 2 seconds
- **Query Response**: < 1 second
- **Pagination**: 100 rows per page
- **Real-Time Latency**: < 500ms
- **Export Speed**: 10,000 rows/second

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## 10. TESTING PLAN

### Unit Tests

```javascript
describe('NotificationMonitor', () => {
  test('renders all tabs', () => {
    render(<NotificationMonitor />)
    expect(screen.getByText('Email Queue')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  })

  test('filters by date range', async () => {
    render(<NotificationMonitor />)
    // Test date range filtering
  })

  test('exports to CSV', async () => {
    render(<NotificationMonitor />)
    // Test CSV export
  })
})
```

### Integration Tests

- Test database queries
- Test real-time subscriptions
- Test export functionality
- Test preference checking display

### E2E Tests

- Full user journey
- Tab navigation
- Filtering and search
- Export workflow

---

## 11. ROLLOUT PLAN

### Phase 1: Internal Testing (Week 1)
- Deploy to staging
- Internal QA testing
- Bug fixes

### Phase 2: Beta Release (Week 2)
- Deploy to production (feature flag)
- Enable for super admins only
- Collect feedback

### Phase 3: Full Release (Week 3)
- Enable for all authorized users
- Monitor performance
- Provide training

---

## 12. SUCCESS CRITERIA

### Functional Requirements

- [ ] All channels visible (Email, SMS, WhatsApp)
- [ ] Historical data accessible (30+ days)
- [ ] Analytics dashboard working
- [ ] Export functionality working
- [ ] Real-time updates working
- [ ] Mobile responsive

### Performance Requirements

- [ ] Load time < 2 seconds
- [ ] Query response < 1 second
- [ ] No browser crashes
- [ ] Handles 10,000+ notifications

### User Acceptance

- [ ] Super admins can monitor all channels
- [ ] Compliance team can export reports
- [ ] Developers can debug issues
- [ ] n8n migration team can compare sources

---

## 13. MAINTENANCE

### Regular Tasks

- **Daily**: Monitor query performance
- **Weekly**: Review error patterns
- **Monthly**: Optimize database indexes
- **Quarterly**: Update dependencies

### Monitoring

- Set up alerts for slow queries
- Track user engagement metrics
- Monitor export usage
- Track feature adoption

---

**Implementation Owner**: [ASSIGN]
**Start Date**: [SET]
**Target Completion**: 3 weeks
**Budget**: [SET]

---

**End of Plan**

This enhanced monitoring system will provide complete visibility into all notification channels and enable safe migration to n8n while maintaining GDPR compliance.
