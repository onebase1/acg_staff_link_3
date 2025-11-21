# 📢 Multi-Channel Urgent Shift Broadcast System

## Overview

The ACG StaffLink platform now supports **multi-channel urgent shift broadcasts** via:
- 📱 **SMS** (Twilio) - Instant delivery, ~£0.20 per message
- 📧 **Email** (Resend) - Free, detailed info + portal link, 1-5 min delay
- 💬 **WhatsApp** (Meta/n8n) - Free, instant, rich formatting

## Architecture

### 1. Agency-Level Settings

Agencies can configure which channels are enabled via **Agency Settings** page:

```javascript
// Stored in agencies.settings JSONB column
{
  "urgent_shift_notifications": {
    "sms_enabled": true,           // Default: true
    "email_enabled": false,         // Default: false
    "whatsapp_enabled": false,      // Default: false
    "allow_manual_override": true   // Default: true
  }
}
```

### 2. Broadcast Flow

```
User clicks "Broadcast Urgent Shift"
  ↓
initiateUrgentBroadcast(shift)
  ↓
Check agency settings for enabled channels
  ↓
If allow_manual_override = true AND multiple channels enabled:
  ├─ Show ChannelSelectorModal
  └─ User selects channels
  ↓
executeBroadcast(shift, selectedChannels)
  ↓
For each eligible staff member:
  ├─ Send via SMS (if selected & staff.phone exists)
  ├─ Send via Email (if selected & staff.email exists)
  └─ Send via WhatsApp (if selected & staff.phone & staff.whatsapp_opt_in)
  ↓
Update shift.broadcast_sent_at timestamp
  ↓
Show success toast with channel breakdown
```

### 3. Race Condition Prevention

**All channels funnel to the same database logic:**

```sql
UPDATE shifts
SET 
  status = 'confirmed',
  assigned_staff_id = :staff_id
WHERE 
  id = :shift_id
  AND assigned_staff_id IS NULL  -- ✅ Atomic check
```

**Triple Protection:**
1. **Database-level atomicity** - `WHERE assigned_staff_id IS NULL`
2. **Marketplace pre-check** - Real-time refetch before acceptance
3. **Database trigger** - Prevents overlapping shifts

**Result:** Impossible for two staff to be assigned the same shift, regardless of channel.

## Components

### 1. NotificationService.jsx

**New Functions:**
- `notifyUrgentShift()` - SMS only (Twilio)
- `notifyUrgentShiftEmail()` - Email with portal link (Resend)
- `notifyUrgentShiftWhatsApp()` - WhatsApp via Twilio (can be replaced with n8n)

### 2. ChannelSelectorModal.jsx

**Props:**
- `isOpen` - Modal visibility
- `onClose` - Close handler
- `enabledChannels` - Array of enabled channels from agency settings
- `defaultChannels` - Default selected channels
- `staffCount` - Number of eligible staff
- `onConfirm(selectedChannels)` - Callback with selected channels

### 3. AgencySettings.jsx

**New Section:** "Urgent Shift Broadcast Channels"
- Toggle for SMS (Twilio)
- Toggle for Email (Resend)
- Toggle for WhatsApp (Meta)
- Toggle for Manual Override

### 4. Shifts.jsx

**New Functions:**
- `initiateUrgentBroadcast(shift)` - Entry point, checks settings
- `executeBroadcast(shift, selectedChannels)` - Sends via selected channels

**New State:**
- `showChannelSelector` - Modal visibility
- `pendingBroadcastShift` - Shift awaiting channel selection

## Email Template

**Portal URL Format:**
```
https://agilecaremanagement.co.uk/staff-portal?highlight={shift.id}
```

**Email Structure:**
1. Header with urgent branding (red gradient)
2. Shift details card (client, role, date, time, pay rate, location)
3. Warning alert ("Act Fast! First-come, first-served")
4. CTA button ("View & Accept Shift")
5. Important note about quick filling

## Testing Checklist

- [ ] Enable all 3 channels in Agency Settings
- [ ] Create urgent shift
- [ ] Click "Broadcast Urgent Shift"
- [ ] Verify ChannelSelectorModal appears
- [ ] Select all 3 channels
- [ ] Verify SMS sent (check Twilio logs)
- [ ] Verify Email sent (check inbox)
- [ ] Verify WhatsApp sent (check phone)
- [ ] Accept shift via portal
- [ ] Verify other staff get "already gone" message
- [ ] Disable Email channel in settings
- [ ] Verify Email no longer appears in modal
- [ ] Test with manual override disabled
- [ ] Verify broadcast goes to all enabled channels without modal

## Production Recommendations

**For Testing:**
- Enable all 3 channels
- Keep manual override enabled
- Test each channel independently

**For Production:**
- Choose 1-2 primary channels (e.g., SMS + Email)
- Disable unused channels to avoid notification fatigue
- Keep manual override enabled for flexibility

## Cost Analysis

**Per 100 Staff Broadcast:**
- SMS: ~£20 (£0.20 × 100)
- Email: £0 (free)
- WhatsApp: £0 (free via Meta Business)

**Recommendation:** Use Email as primary (free), SMS as backup for critical shifts.

