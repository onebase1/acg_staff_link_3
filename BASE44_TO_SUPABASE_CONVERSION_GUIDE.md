# Base44 to Supabase Conversion Guide

## Overview
We have **44 legacy functions** with proven business logic running on Base44. Instead of recreating from scratch, we'll **systematically convert** the infrastructure layer while preserving all business logic.

---

## 🎯 Conversion Patterns

### 1. **Imports**

**Base44:**
```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
```

**Supabase:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

---

### 2. **Client Initialization**

**Base44:**
```typescript
const base44 = createClientFromRequest(req);
```

**Supabase:**
```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);
```

---

### 3. **Authentication**

**Base44:**
```typescript
const user = await base44.auth.me();
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Supabase:**
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

---

### 4. **Database Operations**

#### List All Records
**Base44:**
```typescript
const agencies = await base44.asServiceRole.entities.Agency.list();
```

**Supabase:**
```typescript
const { data: agencies, error } = await supabase
  .from("agencies")
  .select("*");
```

#### Filter Records
**Base44:**
```typescript
const shifts = await base44.asServiceRole.entities.Shift.filter({
  status: 'completed',
  date: { $gte: '2025-01-01' }
});
```

**Supabase:**
```typescript
const { data: shifts, error } = await supabase
  .from("shifts")
  .select("*")
  .eq("status", "completed")
  .gte("date", "2025-01-01");
```

#### Create Record
**Base44:**
```typescript
const invoice = await base44.asServiceRole.entities.Invoice.create({
  invoice_number: 'INV-001',
  total: 1200.00
});
```

**Supabase:**
```typescript
const { data: invoice, error } = await supabase
  .from("invoices")
  .insert({
    invoice_number: 'INV-001',
    total: 1200.00
  })
  .select()
  .single();
```

#### Update Record
**Base44:**
```typescript
await base44.asServiceRole.entities.Timesheet.update(timesheet_id, {
  status: 'approved'
});
```

**Supabase:**
```typescript
const { error } = await supabase
  .from("timesheets")
  .update({ status: 'approved' })
  .eq("id", timesheet_id);
```

---

### 5. **Function Invocations**

**Base44:**
```typescript
await base44.asServiceRole.functions.invoke('sendEmail', {
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Hello</p>'
});
```

**Supabase:**
```typescript
await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Hello</p>'
  }
});
```

---

### 6. **Response Format**

**Base44:**
```typescript
return Response.json({ success: true, data: invoice });
```

**Supabase:**
```typescript
return new Response(
  JSON.stringify({ success: true, data: invoice }),
  { headers: { "Content-Type": "application/json" } }
);
```

---

### 7. **Query Operators Mapping**

| Base44 Filter | Supabase Method |
|--------------|----------------|
| `{ status: 'completed' }` | `.eq("status", "completed")` |
| `{ status: { $in: ['a', 'b'] } }` | `.in("status", ['a', 'b'])` |
| `{ date: { $gte: '2025-01-01' } }` | `.gte("date", "2025-01-01")` |
| `{ date: { $lte: '2025-12-31' } }` | `.lte("date", "2025-12-31")` |
| `{ total: { $gt: 100 } }` | `.gt("total", 100)` |
| `{ total: { $lt: 1000 } }` | `.lt("total", 1000)` |

---

## 🔧 Step-by-Step Conversion Process

### For Each Legacy Function:

1. **Copy original file** from `legacyFunctions/` to `supabase/functions/[function-name]/index.ts`
2. **Replace imports** (Base44 → Supabase + serve)
3. **Wrap in `serve()` handler** if not already wrapped
4. **Replace client initialization** (base44 → supabase)
5. **Update auth check** (base44.auth.me() → supabase.auth.getUser())
6. **Convert all database calls**:
   - `.list()` → `.select("*")`
   - `.filter({...})` → `.select("*").eq().gte()...`
   - `.create({...})` → `.insert({...}).select().single()`
   - `.update(id, {...})` → `.update({...}).eq("id", id)`
7. **Convert function calls** (.invoke → .functions.invoke with body wrapper)
8. **Update response format** (Response.json → new Response with JSON.stringify)
9. **Test the conversion** (keep original logic 100% intact)

---

## 📋 Legacy Functions Inventory

### Communication Functions (6)
- ✅ `sendEmail.ts` - Email via Resend
- `sendSMS.ts` - SMS via Twilio
- `sendWhatsApp.ts` - WhatsApp via Twilio
- `whatsappMasterRouter.ts` - Incoming WhatsApp handler
- `incomingSMSHandler.ts` - Incoming SMS handler
- `emailAutomationEngine.ts` - Daily/weekly digests

### Invoice & Payment Functions (3)
- ✅ `autoInvoiceGenerator.ts` - Generate invoices (COMPLEX - 438 lines)
- `sendInvoice.ts` - Send invoice emails
- `paymentReminderEngine.ts` - Chase overdue payments

### Timesheet Functions (7)
- ✅ `intelligentTimesheetValidator.ts` - AI validation (252 lines)
- `autoTimesheetCreator.ts` - Auto-create from shift
- `extractTimesheetData.ts` - AI extraction from images
- `scheduledTimesheetProcessor.ts` - Batch processing
- `postShiftTimesheetReminder.ts` - Reminders
- `whatsappTimesheetHandler.ts` - WhatsApp submission
- `autoTimesheetApprovalEngine.ts` - Auto-approval

### Shift Management Functions (9)
- `shiftStatusAutomation.ts` - Status transitions
- `urgentShiftEscalation.ts` - Urgent unfilled shifts
- `shiftReminderEngine.ts` - Pre-shift reminders
- `aiShiftMatcher.ts` - AI staff matching
- `validateShiftEligibility.ts` - Staff eligibility check
- `shiftVerificationChain.ts` - Multi-step verification
- `dailyShiftClosureEngine.ts` - EOD closure
- `noShowDetectionEngine.ts` - No-show detection
- `careHomeInboundEmail.ts` - Email shift requests

### Compliance & Validation Functions (5)
- `geofenceValidator.ts` - GPS validation
- `complianceMonitor.ts` - Document expiry
- `financialDataValidator.ts` - Rate validation
- `validateBulkImport.ts` - CSV import validation
- `extractDocumentDates.ts` - AI date extraction

### Automation Engines (7)
- `smartEscalationEngine.ts` - Smart escalations
- `autoApprovalEngine.ts` - Auto-approval logic
- `clientCommunicationAutomation.ts` - Client comms
- `staffDailyDigestEngine.ts` - Staff digests
- `notificationDigestEngine.ts` - Batch notifications
- `criticalChangeNotifier.ts` - Critical alerts
- `enhancedWhatsAppOffers.ts` - WhatsApp shift offers

### Onboarding Functions (4)
- `welcomeAgency.ts` - Welcome emails
- `newUserSignupHandler.ts` - New user flow
- `incompleteProfileReminder.ts` - Profile completion

### Other Functions (3)
- `generateShiftDescription.ts` - AI descriptions
- `pingTest1.ts` - Health check
- `pingTest2.ts` - Health check

---

## ⚡ Priority Tiers

### TIER 1 - Critical Revenue Functions (Convert First)
1. `autoInvoiceGenerator.ts` ✅ (438 lines - DONE)
2. `sendInvoice.ts`
3. `intelligentTimesheetValidator.ts` ✅ (252 lines - DONE)
4. `autoTimesheetCreator.ts`
5. `sendEmail.ts` ✅ (85 lines - DONE)

### TIER 2 - Core Operations (Convert Second)
6. `geofenceValidator.ts`
7. `shiftVerificationChain.ts`
8. `scheduledTimesheetProcessor.ts`
9. `postShiftTimesheetReminder.ts`
10. `notificationDigestEngine.ts`

### TIER 3 - Automation & Enhancements (Convert Third)
11-44. All remaining functions

---

## 🚀 Execution Plan

**Strategy:** Parallel AI agent conversion
- Launch 3 agents simultaneously
- Each agent converts 14-15 functions
- Systematic pattern replacement
- Preserve all business logic
- Total time: ~2 hours

**Quality Assurance:**
- ✅ All imports converted
- ✅ All database calls converted
- ✅ All auth calls converted
- ✅ All function invocations converted
- ✅ Response format standardized
- ✅ Error handling preserved
- ✅ Business logic unchanged

---

## 📁 File Structure

```
supabase/functions/
├── send-email/
│   └── index.ts (converted from sendEmail.ts)
├── send-sms/
│   └── index.ts (converted from sendSMS.ts)
├── auto-invoice-generator/
│   └── index.ts (converted from autoInvoiceGenerator.ts)
└── ... (44 total functions)
```

Function names: Use kebab-case for Supabase (e.g., `auto-invoice-generator` not `autoInvoiceGenerator`)

---

## ✅ Success Criteria

- [ ] All 44 functions converted
- [ ] All functions deployed to Supabase
- [ ] All environment variables set
- [ ] End-to-end test passes
- [ ] No Base44 SDK references remain
- [ ] All frontend calls updated to new function names
