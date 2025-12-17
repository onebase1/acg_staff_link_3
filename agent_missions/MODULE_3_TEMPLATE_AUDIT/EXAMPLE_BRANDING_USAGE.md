# Example: How to Use getBranding() Helper

**Purpose:** Show how to replace hard-coded values with dynamic branding

---

## ❌ BEFORE (Hard-Coded)

```typescript
// welcome-agency/index.ts (BEFORE)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(/*...*/);

  // ❌ Hard-coded SaaS name
  const subject = "🎉 Welcome to ACG StaffLink - Let's Transform Your Agency!";

  // ❌ Hard-coded support email
  const supportEmail = "support@acgstafflink.com";

  // ❌ Hard-coded company name
  const copyright = `© ${new Date().getFullYear()} ACG StaffLink. All rights reserved.`;

  // ❌ Hard-coded sender name
  const emailResponse = await supabase.functions.invoke('send-email', {
    body: {
      to: agency.contact_email,
      subject: subject,
      html: `
        <h1>🎉 Welcome to ACG StaffLink!</h1>
        <p>Thanks for joining the ACG StaffLink family!</p>
        <p>Questions? Contact ${supportEmail}</p>
        <p>${copyright}</p>
      `,
      from_name: 'ACG StaffLink'
    }
  });
});
```

**Problems:**
- Cannot rebrand without code changes
- Blocks white-label functionality
- All agencies see same "ACG StaffLink" name
- No per-agency customization

---

## ✅ AFTER (Dynamic Branding)

```typescript
// welcome-agency/index.ts (AFTER)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBranding, getEmailFooter } from "../_shared/getBranding.ts";

serve(async (req) => {
  const supabase = createClient(/*...*/);
  const { agency_id } = await req.json();

  // ✅ Get branding for this agency
  const branding = await getBranding(supabase, agency_id);

  // ✅ Use dynamic values
  const subject = `🎉 Welcome to ${branding.saasName} - Let's Transform Your Agency!`;

  // ✅ Dynamic footer with copyright, support contact, white-label support
  const footer = getEmailFooter(branding);

  // ✅ Dynamic sender name
  const emailResponse = await supabase.functions.invoke('send-email', {
    body: {
      to: agency.contact_email,
      subject: subject,
      html: `
        <h1>🎉 Welcome to ${branding.saasName}!</h1>
        <p>Thanks for joining the ${branding.saasName} family!</p>
        <p>${branding.saasName} is trusted by leading healthcare providers...</p>
        ${footer}
      `,
      from_name: branding.saasName
    }
  });
});
```

**Benefits:**
- ✅ Rebrand entire SaaS by changing env variables
- ✅ Each agency can have custom branding (premium feature)
- ✅ White-label ready (hide "Powered by" text)
- ✅ Multi-tenant isolation maintained

---

## 🎨 Example: WhatsApp Message with Branding

```typescript
import { getBranding, getWhatsAppFooter } from "../_shared/getBranding.ts";

const branding = await getBranding(supabase, agency_id);

const message = `🏥 *${branding.saasName}*

${shifts.length} NEW SHIFT${shifts.length > 1 ? 'S' : ''} AVAILABLE

These shifts match your:
✓ Role (${staff.role.toUpperCase()})
✓ Availability
✓ Schedule (no double-bookings)

View & claim shifts now:
🔗 ${branding.portalUrl}

First come, first served!

${getWhatsAppFooter(branding)}`;
```

---

## 📧 Example: Email Template with Branding

```typescript
import { getBranding, getEmailFooter, getEmailFrom } from "../_shared/getBranding.ts";

const branding = await getBranding(supabase, agency_id);
const { from, from_name } = getEmailFrom(branding, agency.name); // Optional: use agency name as sender

const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">${branding.saasName}</h1>
    </div>

    <div style="padding: 30px;">
      <h2>2 New Shifts Matched For You</h2>
      <p>Great news! We have 2 new shifts that perfectly match your profile.</p>

      <a href="${branding.portalUrl}" style="background: ${branding.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View & Claim Shifts Now →
      </a>
    </div>

    ${getEmailFooter(branding, true, staff.email)}
  </div>
`;

await supabase.functions.invoke('send-email', {
  body: {
    to: staff.email,
    subject: `🎯 2 New Shifts Matched For You - ${branding.saasName}`,
    html: html,
    from_name: from_name
  }
});
```

---

## 🔢 Example: SMS Message with Branding

```typescript
import { getBranding, getSMSFooter } from "../_shared/getBranding.ts";

const branding = await getBranding(supabase, agency_id);

const message = `🏥 ${branding.saasName}

2 NEW SHIFTS AVAILABLE

These shifts match your:
✓ Role (NURSE)
✓ Availability
✓ Schedule

View & claim:
👉 ${branding.portalUrl}

First come, first served!${getSMSFooter(branding)}`;
```

---

## 🎯 Multi-Tenant Example

```typescript
// Agency A (Dominion Healthcare) - Custom Branding
const brandingA = await getBranding(supabase, "agency-a-id");
console.log(brandingA.saasName); // "Dominion StaffLink" (custom)
console.log(brandingA.supportEmail); // "support@dominionhealthcare.co.uk" (custom)
console.log(brandingA.siteUrl); // "https://staffing.dominionhealthcare.co.uk" (custom domain)

// Agency B (Guest Glow) - SaaS Defaults
const brandingB = await getBranding(supabase, "agency-b-id");
console.log(brandingB.saasName); // "ACG StaffLink" (SaaS default)
console.log(brandingB.supportEmail); // "support@agilecaremanagement.co.uk" (SaaS default)
console.log(brandingB.siteUrl); // "https://agilecaremanagement.co.uk" (SaaS default)
```

---

## 📋 Quick Reference

### Import Statement
```typescript
import { getBranding, getEmailFooter, getWhatsAppFooter, getSMSFooter, getEmailFrom } from "../_shared/getBranding.ts";
```

### Available Branding Properties
```typescript
interface Branding {
  saasName: string;           // "ACG StaffLink"
  companyName: string;        // "Agile Care Management"
  supportEmail: string;       // "support@agilecaremanagement.co.uk"
  supportPhone: string;       // "+44 20 1234 5678"
  noreplyEmail: string;       // "noreply@agilecaremanagement.co.uk"
  siteUrl: string;            // "https://agilecaremanagement.co.uk"
  appUrl: string;             // "https://agilecaremanagement.co.uk"
  portalUrl: string;          // "https://agilecaremanagement.co.uk/portal"
  fromDomain: string;         // "agilecaremanagement.co.uk"
  logoUrl?: string;           // Optional logo URL
  primaryColor?: string;      // "#667eea"
  secondaryColor?: string;    // "#764ba2"
  enableWhiteLabel?: boolean; // false (hides "Powered by" when true)
}
```

### Helper Functions
```typescript
// Get branding for agency
const branding = await getBranding(supabase, agencyId);

// Get SaaS defaults only
const saasDefaults = getSaaSDefaults();

// Get email from header
const { from, from_name } = getEmailFrom(branding, "Custom Sender Name");

// Get email footer HTML
const footer = getEmailFooter(branding, includeUnsubscribe, userEmail);

// Get WhatsApp footer
const whatsappFooter = getWhatsAppFooter(branding);

// Get SMS footer
const smsFooter = getSMSFooter(branding);
```

---

## ✅ Checklist: Updating an Edge Function

1. [ ] Import `getBranding` and helper functions
2. [ ] Call `getBranding(supabase, agency_id)` early in function
3. [ ] Replace all hard-coded "ACG StaffLink" with `${branding.saasName}`
4. [ ] Replace all hard-coded "Agile Care Management" with `${branding.companyName}`
5. [ ] Replace all hard-coded support emails with `${branding.supportEmail}`
6. [ ] Replace all hard-coded URLs with `${branding.portalUrl}` / `${branding.siteUrl}`
7. [ ] Replace copyright notices with `getEmailFooter(branding)`
8. [ ] Replace `from_name` with `${branding.saasName}` or agency name
9. [ ] Test with different agency IDs to verify multi-tenant isolation
10. [ ] Redeploy edge function

---

**Next Step:** Apply this pattern to all 12 edge functions identified in TEMPLATE_AUDIT_FINDINGS.md
