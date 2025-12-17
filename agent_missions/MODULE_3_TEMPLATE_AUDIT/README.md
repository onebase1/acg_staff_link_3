# MODULE 3: Template Audit - Eliminate Hard-Coded Values

**Status:** 🟡 IN PROGRESS
**Priority:** HIGH
**Estimated Duration:** 2-3 hours
**Agent:** TBD
**Started:** 2025-12-16

---

## 🎯 Mission Objective

Audit entire codebase for hard-coded values and replace with dynamic variables pulled from database or environment.

**Critical Context:**
- ✅ **Multi-tenant SaaS** - Each agency has own branding
- ✅ **SaaS name will change** - Must be pulled from database, NOT hard-coded
- ✅ **White-label ready** - Support custom domains in future

---

## 📋 Scope

### Search Targets:
1. **Edge Functions** (44 functions in `supabase/functions/`)
2. **React Components** (`src/components/`, `src/pages/`)
3. **Email Templates** (HTML in edge functions)
4. **SMS Templates** (in send-sms, smart-marketplace-digest, etc.)
5. **WhatsApp Templates** (in send-whatsapp, whatsapp-master-router, etc.)
6. **Database Migrations** (SQL files)
7. **Environment Files** (.env.example, documentation)

### Hard-Coded Values to Find:

#### 🔴 CRITICAL (Must Fix):
- Email addresses (e.g., `noreply@agilecaremanagement.co.uk`, `support@...`)
- Phone numbers (e.g., `+44...`, hardcoded Twilio numbers)
- Domain names (e.g., `agilecaremanagement.co.uk`, `acgstafflink.com`)
- Agency names (e.g., `Dominion Healthcare`, `Guest Glow Healthcare`)
- Contact information

#### 🟡 IMPORTANT (Should Fix):
- SaaS product name (e.g., `ACG StaffLink`, `Agile Care Management`)
- Company name in legal text
- Support contact details
- Portal URLs (already fixed in smart-marketplace-digest, but check others)

#### 🟢 NICE-TO-HAVE (Consider):
- Feature flags
- Default settings values
- UI text that should be configurable

---

## 🔍 Audit Methodology

### Phase 1: Discovery (30 min)
```bash
# Search for email patterns
grep -r "noreply@" supabase/functions/ src/
grep -r "@agilecaremanagement" supabase/functions/ src/
grep -r "@gmail.com" supabase/functions/ src/

# Search for phone patterns
grep -r "+44" supabase/functions/ src/
grep -r "phone.*:" supabase/functions/ src/ | grep -v "staff.phone"

# Search for domain patterns
grep -r "agilecaremanagement.co.uk" supabase/functions/ src/
grep -r "acgstafflink.com" supabase/functions/ src/

# Search for SaaS name patterns
grep -r "ACG StaffLink" supabase/functions/ src/
grep -r "Agile Care Management" supabase/functions/ src/

# Search for agency names
grep -r "Dominion Healthcare" supabase/functions/ src/
grep -r "Guest Glow" supabase/functions/ src/
```

### Phase 2: Categorization (30 min)
Create findings report:
- File path
- Line number
- Hard-coded value found
- Severity (Critical/Important/Nice-to-have)
- Suggested replacement

### Phase 3: Database Schema Design (30 min)
Determine where dynamic values should come from:

**Option A: Add to `agencies` table**
```sql
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "company_name": "Agency Name",
  "support_email": "support@agency.com",
  "support_phone": "+44...",
  "logo_url": null,
  "primary_color": "#667eea",
  "secondary_color": "#764ba2"
}'::jsonb;
```

**Option B: Create new `system_settings` table**
```sql
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  saas_name TEXT DEFAULT 'StaffLink Pro',
  saas_support_email TEXT DEFAULT 'support@stafflinkpro.com',
  saas_support_phone TEXT,
  white_label_domain TEXT,
  branding JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_agency ON system_settings(agency_id);
```

**Option C: Use environment variables for SaaS-level values**
```bash
SAAS_NAME="StaffLink Pro"
SAAS_SUPPORT_EMAIL="support@stafflinkpro.com"
SAAS_SUPPORT_PHONE="+44..."
SAAS_PRIMARY_DOMAIN="stafflinkpro.com"
```

### Phase 4: Implementation (60 min)
Replace hard-coded values with dynamic lookups.

**Example - Email Template Fix:**
```typescript
// ❌ BEFORE (hard-coded)
const html = `
  <p>Questions? Contact us at support@agilecaremanagement.co.uk</p>
  <p>&copy; 2025 Agile Care Management. All rights reserved.</p>
`;

// ✅ AFTER (dynamic)
const saasName = Deno.env.get("SAAS_NAME") || "StaffLink Pro";
const supportEmail = Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@stafflinkpro.com";

const html = `
  <p>Questions? Contact us at ${supportEmail}</p>
  <p>&copy; 2025 ${saasName}. All rights reserved.</p>
`;
```

**Example - Agency Branding:**
```typescript
// Fetch agency branding from database
const { data: agency } = await supabase
  .from('agencies')
  .select('name, branding')
  .eq('id', agencyId)
  .single();

const agencyName = agency.name;
const supportEmail = agency.branding?.support_email || Deno.env.get("SAAS_SUPPORT_EMAIL");
const supportPhone = agency.branding?.support_phone || Deno.env.get("SAAS_SUPPORT_PHONE");
```

### Phase 5: Testing (30 min)
- Verify all email templates render correctly
- Verify SMS templates show correct values
- Verify WhatsApp templates show correct values
- Test multi-tenant isolation (each agency sees own branding)

---

## 📊 Progress Tracking

### Discovery Findings:
- [ ] Edge functions scanned
- [ ] React components scanned
- [ ] Email templates audited
- [ ] SMS templates audited
- [ ] WhatsApp templates audited
- [ ] Database migrations checked
- [ ] Findings report created

### Implementation Progress:
- [ ] Database schema designed
- [ ] Environment variables added
- [ ] Edge functions updated
- [ ] React components updated
- [ ] Templates updated
- [ ] Migration scripts created

### Testing:
- [ ] Email templates tested
- [ ] SMS templates tested
- [ ] WhatsApp templates tested
- [ ] Multi-tenant isolation verified

---

## 🚨 Known Hard-Coded Values (Initial)

### From Previous Work:
1. ✅ **FIXED:** `https://acgstafflink.com/portal` → Dynamic `SITE_URL` (smart-marketplace-digest)
2. ❓ **UNKNOWN:** Check all other functions for portal URLs

### To Investigate:
- [ ] `send-email` function footer
- [ ] `send-sms` function templates
- [ ] `send-whatsapp` function templates
- [ ] `payment-reminder-engine` templates
- [ ] `shift-reminder-engine` templates
- [ ] `whatsapp-master-router` responses
- [ ] `notification-digest-engine` templates
- [ ] React UI text (company name in headers/footers)

---

## 🎯 Success Criteria

- ✅ Zero hard-coded email addresses in codebase
- ✅ Zero hard-coded phone numbers in codebase
- ✅ Zero hard-coded agency names in templates
- ✅ SaaS name pulled from environment/database
- ✅ Support contact details configurable per agency
- ✅ Portal URLs dynamic for all functions
- ✅ Multi-tenant branding works correctly
- ✅ White-label ready (can support custom domains later)

---

## 📁 Output Files

### Required Deliverables:
1. `TEMPLATE_AUDIT_FINDINGS.md` - Complete findings report
2. `TEMPLATE_AUDIT_FIXES.md` - List of all changes made
3. `add_branding_columns.sql` - Database migration for branding
4. `UPDATE_ENV_VARIABLES.md` - New environment variables needed
5. `TESTING_CHECKLIST.md` - How to verify multi-tenant branding

---

## 🔄 Continuation Instructions

**If agent hits context limit:**
1. Save findings to `TEMPLATE_AUDIT_FINDINGS.md`
2. Update progress checkboxes above
3. Note last file scanned in `CONTINUATION_POINT.md`
4. Next agent: Resume from last checkpoint

**Last Checkpoint:** None (not started)

---

## 📞 Context for Next Agent

**Multi-Tenant Architecture:**
- Each agency (`agencies` table) has own clients, staff, shifts
- Agency-level settings in `agencies.settings` JSONB column
- Current structure: `settings.automation_settings`, `settings.urgent_shift_notifications`

**Current Environment Variables:**
```
SITE_URL=https://agilecaremanagement.co.uk
RESEND_FROM_DOMAIN=agilecaremanagement.co.uk
RESEND_DEFAULT_FROM=noreply@agilecaremanagement.co.uk
```

**Email Flow:**
- `send-email` function uses `from_name` parameter (already dynamic)
- `smart-marketplace-digest` passes agency name as `from_name` (already dynamic)
- But footer/support contact may still be hard-coded

**Critical Files to Check:**
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-sms/index.ts`
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/smart-marketplace-digest/index.ts`
- `supabase/functions/payment-reminder-engine/index.ts`
- `supabase/functions/shift-reminder-engine/index.ts`
- All React pages with contact information

---

**Last Updated:** 2025-12-16
**Next Review:** After discovery phase complete
