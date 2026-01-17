# MODULE 43: REALTIME AGENCY ALERTS

**Status:** ✅ COMPLETE - Ready for Integration
**Priority:** UX Enhancement
**Estimated Time:** 4-6 hours
**Risk Level:** Low
**Dependencies:** MODULE_41, MODULE_42 (notification infrastructure)

---

## MISSION OBJECTIVE

Send immediate email + WhatsApp alerts to agency owners when critical events occur (shift cancellations, staff changes, urgent fill requests, compliance issues).

**Triggers:**
- Staff member calls in sick (replacement needed)
- Shift cancelled within 24 hours
- Staff changed for upcoming shift
- Critical compliance document expired
- Urgent shift needs filling (< 24h notice)

---

## ARCHITECTURE

```
Database Trigger / Application Logic
              ↓
  agency-critical-alert Edge Function
         ↓              ↓
      Email          WhatsApp
         ↓              ↓
    Notification Log (Audit)
```

---

## DELIVERABLES

### 1. Edge Function ✅
- **File:** `supabase/functions/agency-critical-alert/index.ts`
- **Trigger:** Called by app/database when critical event occurs
- **Features:**
  - Alert type detection (staff_change, shift_cancelled, urgent_fill, compliance_critical)
  - Contextual message building
  - Urgency levels (critical, high, medium)
  - Color-coded emails (red, yellow, blue)
  - WhatsApp rate limit checking

### 2. Alert Types

**Staff Change Alert:**
```
🚨 Shift Update - Staff Change

Staff change: Emma Wilson → Rachel Taylor
Shift: Tomorrow 16 Jan, 08:00-20:00 HCA
Reason: Emma called in sick
Status: ✅ Replacement confirmed

Details:
• Rachel Taylor verified
• Client notified
• All compliance checks passed

📱 View shift: [link]
```

**Shift Cancelled Alert:**
```
❌ Shift Cancelled

Cancelled shift: 16 Jan 08:00-20:00
Staff: Sarah Jones
Role: HCA
Reason: Client request
Status: ❌ Shift cancelled
```

**Urgent Fill Alert:**
```
🚨 Urgent Shift Needs Filling

Shift: Tomorrow 16 Jan, 08:00-20:00
Role: HCA
Starts in: 18 hours
Reason: Unfilled shift
Status: 🚨 Immediate action required
```

### 3. Payload Structure

```typescript
POST /functions/v1/agency-critical-alert
{
  "agency_id": "uuid",
  "alert_type": "staff_change" | "shift_cancelled" | "urgent_fill" | "compliance_critical",
  "shift_id": "uuid",
  "client_id": "uuid",
  "old_staff_id": "uuid",
  "new_staff_id": "uuid",
  "reason": "Emma called in sick",
  "metadata": {
    "hoursUntilStart": 18,
    "replacementConfirmed": true
  }
}
```

### 4. Email Design ✅
- Color-coded header (red = critical, yellow = high, blue = medium)
- Details section with bullet points
- Status badge (✅ Confirmed, ⚠️ Needs Fill, ❌ Cancelled)
- CTA button ("View Shift Details")
- Urgent, professional tone

---

## INTEGRATION POINTS

### Database Triggers (Future)
```sql
-- Example: Trigger on shift staff change
CREATE TRIGGER notify_agency_on_staff_change
AFTER UPDATE ON shifts
FOR EACH ROW
WHEN (OLD.assigned_staff_id IS DISTINCT FROM NEW.assigned_staff_id)
EXECUTE FUNCTION send_agency_critical_alert();
```

### Application Calls
```typescript
// When staff changes shift
await supabase.functions.invoke('agency-critical-alert', {
  body: {
    agency_id: shift.agency_id,
    alert_type: 'staff_change',
    shift_id: shift.id,
    old_staff_id: previousStaffId,
    new_staff_id: newStaffId,
    reason: 'Staff requested change'
  }
});
```

---

## TESTING

```bash
# Test staff change alert
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/agency-critical-alert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{
    "agency_id": "dominion-uuid",
    "alert_type": "staff_change",
    "shift_id": "shift-uuid",
    "old_staff_id": "emma-uuid",
    "new_staff_id": "rachel-uuid",
    "reason": "Emma called in sick"
  }'
```

**Expected Result:**
- ✅ Email sent with red header (critical alert)
- ✅ WhatsApp sent with staff change details
- ✅ notification_log entries created
- ✅ Deep link to shift works

---

## SUCCESS CRITERIA
- [ ] Alert sent within 60 seconds of trigger
- [ ] Email color-coded by urgency
- [ ] WhatsApp message under 1024 chars
- [ ] Rate limits respected (critical alerts bypass daily limit)
- [ ] Deep links work correctly
- [ ] All alerts logged to notification_log
- [ ] No false positives (only send for genuine critical events)

---

## DEPLOYMENT

```bash
./supabase.exe functions deploy agency-critical-alert --project-ref rzzxxkppkiasuouuglaf
```

---

**Next Steps:** Integrate into application workflow (shift editing, cancellations, staff management)
**Status:** ✅ Complete, Ready for Integration
