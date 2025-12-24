# Template Variables Reference

## Required Variables for Client Emails

All client email templates use these variables for white-labeling support:

### Client Information
- `{{client_name}}` - Client facility name (e.g., "Richmond Court Team")

### Agency Branding (White-label Support)
- `{{agency_name}}` - Agency name (e.g., "Dominion Healthcare", not "Agile Care Group")
- `{{agency_email}}` - Agency support email (e.g., "support@dominionhealth.com")

### Shift Data (Dynamic)
- `{{shift_count}}` - Total number of shifts
- `{{week_start}}` - Week start date
- `{{week_end}}` - Week end date
- `{{total_hours}}` - Total hours (worked or scheduled)

### Download Links (Magic Links)
- `{{pdf_download_link}}` - Signed URL for PDF download (30-day expiry)
- `{{csv_download_link}}` - Signed URL for CSV download (30-day expiry)
- `{{calendar_link}}` - .ics calendar file link

## Implementation Notes

### In notification-digest-engine
```typescript
const emailHtml = generateBatchEmailHtml({
  client_name: client.name,
  agency_name: agency.name,
  agency_email: agency.branding?.support_email || Deno.env.get("SAAS_SUPPORT_EMAIL"),
  shift_count: queue.pending_items.length,
  pdf_download_link: await generateMagicLink(queue.id, 'pdf'),
  csv_download_link: await generateMagicLink(queue.id, 'csv'),
  calendar_link: await generateMagicLink(queue.id, 'ics'),
  // ... shift data
});
```

### In weekly-client-summary (new function)
```typescript
const emailHtml = generateWeeklySummaryHtml({
  client_name: client.name,
  agency_name: agency.name,
  agency_email: agency.branding?.support_email || Deno.env.get("SAAS_SUPPORT_EMAIL"),
  last_week_hours: 384,
  this_week_hours: 360,
  shifts_worked: shiftsWorked,
  shifts_scheduled: shiftsScheduled,
  pdf_download_link: await generateMagicLink(summaryId, 'pdf'),
  csv_download_link: await generateMagicLink(summaryId, 'csv'),
});
```

## Template Files

1. `batch_confirmation_full.html` - Batch shift confirmations
   - ✅ White-labeling variables added
   - ✅ Download buttons with magic links
   - ✅ Supports 3-week bookings

2. `weekly_summary_invoice_style.html` - Weekly cron summaries
   - ✅ Invoice-style table format
   - ✅ Grouped by role (no staff names)
   - ✅ Shows worked vs to-be-worked hours
   - ✅ No financial data (rates/amounts)
   - ✅ White-labeling variables added

## White-labeling Strategy

### Database Schema (Already Exists)
```sql
-- agencies table has branding column
SELECT branding FROM agencies WHERE id = ?;

-- Expected structure:
{
  "support_email": "support@agency.com",
  "support_phone": "+44...",
  "logo_url": "...",
  "primary_color": "#667eea"
}
```

### Fallback Chain
1. Check `agency.branding.support_email`
2. Fallback to `SAAS_SUPPORT_EMAIL` env var
3. Fallback to `noreply@agilecaremanagement.co.uk`

This ensures emails work even if agency hasn't set custom branding yet.
