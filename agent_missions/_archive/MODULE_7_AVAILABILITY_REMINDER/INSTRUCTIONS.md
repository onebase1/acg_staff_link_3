# MODULE 7: AGENT INSTRUCTIONS

## 🔧 PRE-FLIGHT CHECKLIST
```bash
# Verify these exist:
src/pages/MyAvailability.jsx              # Staff availability page
supabase/functions/send-email/index.ts    # Email sending function
```

---

## TASK 1: Create Edge Function

### Create: `supabase/functions/availability-reminder-engine/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WEEKLY AVAILABILITY REMINDER ENGINE
 * 
 * Runs every Sunday 6pm via cron
 * Sends email to active staff who haven't updated availability recently
 */

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log('📅 [Availability Reminder] Starting weekly reminder...');

  try {
    // Get all active staff
    const { data: allStaff, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email, agency_id, availability, availability_updated_at')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (error) throw error;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let sent = 0;
    let skipped = 0;

    for (const staff of allStaff) {
      // Skip if updated recently
      if (staff.availability_updated_at) {
        const lastUpdate = new Date(staff.availability_updated_at);
        if (lastUpdate > sevenDaysAgo) {
          skipped++;
          continue;
        }
      }

      // Generate availability summary
      const availability = staff.availability || {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      const summary = days.map(day => {
        const shifts = availability[day] || [];
        if (shifts.length === 0) return `❌ ${day.charAt(0).toUpperCase() + day.slice(1)}: Not available`;
        return `✅ ${day.charAt(0).toUpperCase() + day.slice(1)}: ${shifts.join(', ')}`;
      }).join('<br>');

      const appUrl = Deno.env.get('APP_URL') || 'https://acg-staff-link.vercel.app';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📅 Update Your Availability</h2>
          <p>Hi ${staff.first_name},</p>
          <p>Please update your availability for next week so we can match you with the best shifts!</p>
          
          <h3>Your Current Availability:</h3>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            ${summary}
          </div>
          
          <p style="text-align: center; margin: 25px 0;">
            <a href="${appUrl}/my-availability" 
               style="background: #0891b2; color: white; padding: 12px 24px; 
                      border-radius: 6px; text-decoration: none; font-weight: bold;">
              Update My Availability
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If your availability hasn't changed, you're all set! No action needed.
          </p>
        </div>
      `;

      // Send email
      await supabase.functions.invoke('send-email', {
        body: {
          to: staff.email,
          subject: '📅 Update your availability for next week',
          html: emailHtml,
          agency_id: staff.agency_id
        }
      });

      sent++;
      console.log(`📧 Sent to ${staff.first_name} ${staff.last_name}`);
    }

    console.log(`✅ [Availability Reminder] Complete: ${sent} sent, ${skipped} skipped`);

    return new Response(JSON.stringify({
      success: true,
      sent,
      skipped,
      total: allStaff.length
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error('❌ [Availability Reminder] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
```

### Deploy:
```bash
npx supabase functions deploy availability-reminder-engine
```

---

## TASK 2: Add Database Column

### Migration SQL:
```sql
-- Add column to track when availability was last updated
ALTER TABLE staff ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ;
COMMENT ON COLUMN staff.availability_updated_at IS 'When staff last updated their availability';
```

---

## TASK 3: Update MyAvailability.jsx

### File: `src/pages/MyAvailability.jsx`

Find the `updateAvailabilityMutation` (around line 93) and update:

```javascript
const { error } = await supabase
  .from('staff')
  .update({ 
    availability: newAvailability,
    availability_updated_at: new Date().toISOString()  // ADD THIS
  })
  .eq('id', staffProfile.id);
```

---

## TASK 4: Setup Cron Job

### Run in Supabase SQL Editor:
```sql
-- Schedule weekly reminder for Sunday 6pm
SELECT cron.schedule(
  'weekly-availability-reminder',
  '0 18 * * 0',
  $$SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/availability-reminder-engine',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  )$$
);
```

---

## 🧪 TESTING

### Manual Test:
```bash
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/availability-reminder-engine \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Verify Cron:
```sql
SELECT * FROM cron.job WHERE jobname = 'weekly-availability-reminder';
```

