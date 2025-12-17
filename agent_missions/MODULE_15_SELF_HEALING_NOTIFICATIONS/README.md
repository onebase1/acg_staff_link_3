# MODULE 15: Self-Healing Notification System

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 5-6 hours
**Risk Level:** Medium
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** Notifications fail silently with no fallback:
- Email bounces → No alert
- SMS fails → Notification lost
- WhatsApp undelivered → No retry
- No visibility into delivery rates

**Solution:**
1. Cascading fallback chain
2. Automatic retry with exponential backoff
3. Delivery tracking and alerting
4. Self-healing: detect failures and switch channels

**End State:** 99.9% notification delivery with automatic failover.

---

## 📊 FALLBACK CHAIN

```
Primary Channel Failed?
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Email (Primary) │────►│ SMS (Fallback)  │────►│ WhatsApp        │
│ via Resend      │ fail│ via Twilio      │ fail│ via n8n         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼ fail
                                                ┌─────────────────┐
                                                │ In-App Alert    │
                                                │ (Last Resort)   │
                                                └─────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Notification Queue Table (1 hour)
- [ ] Create `notification_queue` table
- [ ] Track: recipient, channel, status, retries, fallback_used
- [ ] Create delivery tracking

### Phase 2: Smart Sender (2 hours)
- [ ] Create `smart-notification-sender` Edge Function
- [ ] Implement retry logic (3 attempts, exponential backoff)
- [ ] Implement fallback to next channel
- [ ] Log all attempts

### Phase 3: Self-Healing Logic (1-2 hours)
- [ ] Detect channel failure patterns
- [ ] Auto-switch primary channel if >5 failures in 1 hour
- [ ] Alert admin of channel issues
- [ ] Auto-recover when channel is healthy

### Phase 4: Delivery Dashboard (1-2 hours)
- [ ] Create `src/pages/NotificationHealth.jsx`
- [ ] Show delivery rates by channel
- [ ] Show failure reasons
- [ ] Show fallback usage
- [ ] Alert configuration

---

## 🔧 DATABASE SCHEMA

```sql
CREATE TABLE notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID,
    recipient_type TEXT, -- 'staff', 'client', 'admin'
    notification_type TEXT, -- 'shift_reminder', 'invoice', etc.
    primary_channel TEXT, -- 'email', 'sms', 'whatsapp'
    channels_attempted TEXT[], -- ['email', 'sms']
    current_status TEXT, -- 'pending', 'sent', 'failed', 'delivered'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    fallback_used BOOLEAN DEFAULT FALSE,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

CREATE TABLE channel_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT UNIQUE,
    status TEXT, -- 'healthy', 'degraded', 'down'
    failure_count_1h INTEGER DEFAULT 0,
    last_failure TIMESTAMPTZ,
    last_success TIMESTAMPTZ,
    auto_disabled BOOLEAN DEFAULT FALSE
);
```

---

## 📋 RETRY LOGIC

```
Attempt 1: Immediate
Attempt 2: Wait 1 minute
Attempt 3: Wait 5 minutes
Fallback: Try next channel

If all channels fail:
- Create in-app alert
- Notify admin
- Queue for manual review
```

---

## ✅ SUCCESS CRITERIA

- [ ] Notification queue table created
- [ ] Smart sender with retries working
- [ ] Fallback chain working (email → SMS → WhatsApp)
- [ ] Channel health tracking
- [ ] Self-healing triggers correctly
- [ ] Dashboard shows delivery metrics
- [ ] 99%+ delivery rate achieved

---

## 📞 AGENT HANDOFF

**To Start:** Review existing send-* Edge Functions
**When Done:** Test failure scenarios
**Next Module:** MODULE_16 (Multi-Tenant Agency Health)

