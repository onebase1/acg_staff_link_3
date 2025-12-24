# Phase 2: Magic Links & Downloads - Implementation Plan

**Status:** 📋 PLANNED (Awaiting Credits)
**Estimated Time:** 4-6 hours
**Dependencies:** Phase 1A & 1B complete

---

## 🎯 Objective

Enable clients to download shift schedules (PDF, CSV, Calendar) via secure magic links that:
- Expire in 30 days
- Require no login
- Are cryptographically signed
- Can be tracked for analytics

---

## 📦 Deliverables

### 1. New Edge Function: `download-shift-schedule`
**Path:** `supabase/functions/download-shift-schedule/index.ts`

```typescript
// Responsibilities:
// 1. Validate magic token (signature, expiry, recipient)
// 2. Fetch shift data for the batch/week
// 3. Generate requested format (PDF/CSV/ICS)
// 4. Return downloadable file
```

### 2. Magic Token Generation Utility
**Path:** `supabase/functions/_shared/magic-tokens.ts`

```typescript
interface MagicToken {
  queue_id: string;       // Links to notification_queue batch
  client_email: string;   // Recipient validation
  format: 'pdf' | 'csv' | 'ics';
  expires_at: number;     // Unix timestamp (30 days from creation)
  signature: string;      // HMAC-SHA256 signature
}

// Functions needed:
generateMagicToken(queueId, email, format): string
validateMagicToken(token): { valid: boolean, payload?: MagicToken }
```

### 3. PDF Generation
**Library:** `@react-pdf/renderer` or `pdfkit`

**Content:**
- Agency header/branding
- Date range
- Table of shifts (Date | Role | Staff | Hours)
- Totals summary
- Footer with generation timestamp

### 4. CSV Export
**Format:**
```csv
Date,Role,Shift Type,Staff Name,Staff Phone,Start Time,End Time,Hours
2025-12-15,Healthcare Assistant,Day,Sarah Jones,07123456789,08:00,20:00,12
...
```

### 5. Calendar Export (.ics)
**Library:** `ical-generator`

**Features:**
- One event per shift
- Staff name in event title
- Location included
- Reminder 1 hour before

---

## 🔧 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/download-shift-schedule/index.ts` | CREATE | Main download endpoint |
| `supabase/functions/_shared/magic-tokens.ts` | CREATE | Token generation/validation |
| `supabase/functions/_shared/pdf-generator.ts` | CREATE | PDF generation logic |
| `supabase/functions/notification-digest-engine/index.ts` | MODIFY | Add magic link URLs to emails |

---

## 🔐 Security Model

```
1. Token Structure:
   base64(JSON({queue_id, email, format, expires})) + "." + signature

2. Signature:
   HMAC-SHA256(payload, MAGIC_LINK_SECRET)

3. Validation:
   - Decode payload
   - Verify signature matches
   - Check expiry > now
   - Confirm email matches request (optional)

4. Environment Variables:
   - MAGIC_LINK_SECRET (32+ char random string)
```

---

## 📊 Database Changes

**Optional: Track downloads**
```sql
CREATE TABLE magic_link_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES notification_queue(id),
  format TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);
```

---

## 🧪 Test Scenarios

1. **Valid token** → Returns correct file format
2. **Expired token** → Returns 401 "Link expired"
3. **Invalid signature** → Returns 401 "Invalid token"
4. **Wrong email** → Returns 403 "Unauthorized"
5. **PDF with 100+ shifts** → Generates successfully
6. **CSV special characters** → Properly escaped
7. **Calendar import** → Works in Outlook/Google

---

## 📞 Trigger: When User Has Credits

Prompt: "Implement Phase 2 magic links for MODULE_34"

I will:
1. Create `download-shift-schedule` Edge Function
2. Create `magic-tokens.ts` shared utility
3. Add PDF generation (using pdfkit or react-pdf)
4. Add CSV export logic
5. Add .ics calendar generation
6. Update batch confirmation email with real download URLs
7. Update weekly summary email with real download URLs
8. Deploy and test all formats

