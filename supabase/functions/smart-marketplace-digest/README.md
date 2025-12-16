# 🎯 Smart Marketplace Digest

**Solves the SMS ambiguity problem** by sending ONE consolidated notification per staff member showing ONLY shifts they're eligible for.

## Problem Solved

**Before:** When admin sends multiple urgent shifts:
- 5 urgent shifts → 5 separate SMS per staff member
- Staff replies "YES" → Which shift are they accepting? ❌
- Confusion and double-bookings

**After:** Smart marketplace digest:
- 5 urgent shifts → 1 consolidated digest per staff
- Shows only eligible shifts (role matched, availability matched, no conflicts)
- Staff directed to portal to claim specific shifts ✅
- Clear, actionable, no ambiguity

## Features

### ✅ Intelligent Eligibility Filtering
Reuses exact marketplace logic from [ShiftMarketplace.jsx](../../src/pages/ShiftMarketplace.jsx:155-208):
- **Role matching**: Staff only see shifts for their role
- **Double-booking prevention**: Filters out dates they're already working
- **Availability checking**: Respects day-of-week + shift type (day/night)
- **Overnight shift handling**: Correctly calculates end times
- **Marketplace visibility**: Honors `marketplace_visible` flag

### 📡 Multi-Channel Parallel Notifications
Sends notifications across multiple channels simultaneously:
- **SMS** (Twilio): Short, link-based message
- **WhatsApp** (Twilio/n8n): Rich formatted with shift details
- **Email** (Resend): Beautiful HTML with shift cards

Each channel can be toggled on/off in agency settings:
```json
{
  "urgent_shift_notifications": {
    "sms_enabled": true,
    "whatsapp_enabled": true,
    "email_enabled": true
  }
}
```

### 🎛️ Toggleable in Agency Settings
Feature can be enabled/disabled per agency:
```json
{
  "automation_settings": {
    "use_smart_marketplace_digest": true  // Default: false
  }
}
```

### 🔄 Coexists with Current System
- Does NOT replace existing individual notifications
- Existing SMS/WhatsApp/Email for single shifts still work
- Great for MVP demos while smart digest is in testing
- Toggle between strategies based on agency preference

## How It Works

```mermaid
graph TD
    A[Admin Posts Urgent Shifts] --> B[Call smart-marketplace-digest]
    B --> C{Feature Enabled?}
    C -->|No| D[Return Skipped]
    C -->|Yes| E[Fetch All Active Staff]
    E --> F[For Each Staff Member]
    F --> G[Get Assigned Dates]
    G --> H[Filter Eligible Shifts]
    H --> I{Any Eligible?}
    I -->|No| J[Skip This Staff]
    I -->|Yes| K[Send Parallel Notifications]
    K --> L[SMS]
    K --> M[WhatsApp]
    K --> N[Email]
    L --> O[Staff Notified]
    M --> O
    N --> O
    J --> F
    O --> P[Return Results]
```

## API Reference

### Request

**Endpoint:** `POST /functions/v1/smart-marketplace-digest`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "shift_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "agency_id": "uuid"
}
```

### Response

**Success (Feature Enabled):**
```json
{
  "success": true,
  "results": {
    "totalStaff": 25,
    "staffNotified": 12,
    "staffSkipped": 13,
    "totalNotificationsSent": 36,
    "channelBreakdown": {
      "sms": 12,
      "whatsapp": 12,
      "email": 12
    },
    "errors": []
  }
}
```

**Success (Feature Disabled):**
```json
{
  "success": true,
  "skipped": true,
  "reason": "Feature disabled in settings. Enable in Agency Settings → Automation → Smart Marketplace Digest"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Deployment

### 1. Deploy Function
```bash
cd C:\Users\gbase\superbasecli
supabase functions deploy smart-marketplace-digest --project-ref rzzxxkppkiasuouuglaf
```

### 2. Set Environment Variables
Ensure these are set in your Supabase project:
```bash
# Twilio (for SMS & WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Resend (for Email)
RESEND_API_KEY=re_xxxx
RESEND_FROM_DOMAIN=agilecaremanagement.co.uk

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
```

### 3. Enable in Agency Settings
Update the agencies table:
```sql
UPDATE agencies
SET settings = jsonb_set(
  settings,
  '{automation_settings,use_smart_marketplace_digest}',
  'true'
)
WHERE id = 'your-agency-id';
```

### 4. Configure Notification Channels
```sql
UPDATE agencies
SET settings = jsonb_set(
  settings,
  '{urgent_shift_notifications}',
  '{
    "sms_enabled": true,
    "whatsapp_enabled": true,
    "email_enabled": true,
    "allow_manual_override": true
  }'::jsonb
)
WHERE id = 'your-agency-id';
```

## Integration Examples

### From Urgent Shift Broadcast
```javascript
// After posting urgent shifts to shifts table
const shiftIds = insertedShifts.map(s => s.id);

const { data, error } = await supabase.functions.invoke('smart-marketplace-digest', {
  body: {
    shift_ids: shiftIds,
    agency_id: currentUser.agency_id
  }
});

if (data.success && !data.skipped) {
  console.log(`✅ Notified ${data.results.staffNotified} staff members`);
  console.log(`📊 Sent ${data.results.totalNotificationsSent} notifications`);
}
```

### From Marketplace Posting
```javascript
// When admin marks shifts as marketplace_visible
const { data, error } = await supabase.functions.invoke('smart-marketplace-digest', {
  body: {
    shift_ids: [shift.id],
    agency_id: shift.agency_id
  }
});
```

### From Batch Shift Creation
```javascript
// In BulkShiftCreation.jsx after creating shifts
if (formData.urgency === 'urgent' && agency.settings?.automation_settings?.use_smart_marketplace_digest) {
  const shiftIds = createdShifts.map(s => s.id);

  await supabase.functions.invoke('smart-marketplace-digest', {
    body: { shift_ids: shiftIds, agency_id: formData.agency_id }
  });
}
```

## Message Templates

### SMS (160 characters max)
```
🏥 [Agency Name]

3 NEW SHIFTS AVAILABLE

These shifts match your:
✓ Role (REGISTERED_NURSE)
✓ Availability
✓ Schedule (no double-bookings)

View & claim shifts now:
👉 https://acgstafflink.com/portal

First come, first served!
```

### WhatsApp (Rich formatted)
```
🏥 *Agency Name*

*3 NEW SHIFTS MATCHED FOR YOU*

These shifts match your profile:
✅ Role: REGISTERED_NURSE
✅ Your availability
✅ No schedule conflicts

1. *Mon 16 Dec* 08:00-20:00
   REGISTERED_NURSE • £25/hr (£275 total)
2. *Tue 17 Dec* 08:00-20:00
   REGISTERED_NURSE • £25/hr (£275 total)
3. *Wed 18 Dec* 08:00-20:00
   REGISTERED_NURSE • £25/hr (£275 total)

*Claim your shifts:*
🔗 https://acgstafflink.com/portal

⚡ First come, first served!
```

### Email (Beautiful HTML)
Full HTML email with:
- Gradient header
- Professional shift cards with all details
- Client name, location, pay rate, earnings
- Urgency badges (URGENT/CRITICAL)
- Call-to-action button
- Agency branding

## Testing

### Test with Single Shift
```bash
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/smart-marketplace-digest \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shift_ids": ["shift-uuid-1"],
    "agency_id": "agency-uuid"
  }'
```

### Test with Multiple Shifts
```bash
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/smart-marketplace-digest \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shift_ids": ["shift-uuid-1", "shift-uuid-2", "shift-uuid-3"],
    "agency_id": "agency-uuid"
  }'
```

## Monitoring

### Check Logs
```bash
supabase functions logs smart-marketplace-digest --project-ref rzzxxkppkiasuouuglaf
```

### Key Metrics
- **Staff notified**: Number of staff who received notifications
- **Staff skipped**: Number of staff with no eligible shifts
- **Channel breakdown**: SMS vs WhatsApp vs Email counts
- **Errors**: Any failed notifications

## Troubleshooting

### Function Returns Skipped
**Cause:** Feature not enabled in agency settings
**Fix:**
```sql
UPDATE agencies SET settings = jsonb_set(settings, '{automation_settings,use_smart_marketplace_digest}', 'true') WHERE id = 'agency-id';
```

### No Staff Notified
**Possible causes:**
1. No staff match the shift roles
2. All staff are already working on those dates
3. Shifts don't match staff availability
4. All staff have `opt_out_shift_reminders = true`

**Debug:** Check function logs for eligibility filtering details

### Notifications Not Sending
**Possible causes:**
1. Missing environment variables (TWILIO_*, RESEND_*)
2. Channels disabled in agency settings
3. Staff missing phone/email

**Debug:** Check logs for specific channel errors

## Future Enhancements

- [ ] Add n8n integration for WhatsApp Business Cloud API (free)
- [ ] Support for push notifications (PWA)
- [ ] Add rate limiting for large batches
- [ ] Support for shift preference ranking
- [ ] Analytics dashboard for notification effectiveness
- [ ] A/B testing between smart digest vs individual notifications

## Related Files

- **Eligibility Logic**: [ShiftMarketplace.jsx](../../src/pages/ShiftMarketplace.jsx:155-208)
- **Agency Settings UI**: [AgencySettings.jsx](../../src/pages/AgencySettings.jsx:788-833)
- **Batch Tracking**: [shiftGenerator.js](../../src/utils/bulkShifts/shiftGenerator.js:20-103)
- **Individual Notifications**: [enhanced-whatsapp-offers](../enhanced-whatsapp-offers/index.ts)
- **Email Service**: [send-email](../send-email/index.ts)
- **SMS Service**: [send-sms](../send-sms/index.ts)
- **WhatsApp Service**: [send-whatsapp](../send-whatsapp/index.ts)

## Support

For issues or questions:
1. Check function logs: `supabase functions logs smart-marketplace-digest`
2. Verify agency settings in database
3. Test with single shift first before batch
4. Review this documentation

---

**Built with:**
- Deno 🦕
- Supabase Edge Functions ⚡
- TypeScript 💙
- Multi-channel notifications 📡
