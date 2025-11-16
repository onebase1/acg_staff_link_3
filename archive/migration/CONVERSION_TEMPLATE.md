# Base44 → Supabase Conversion Template

## Step-by-Step Conversion Process

For each legacy function in `/legacyFunctions/*.ts`:

### 1. Create Supabase Function Directory
```bash
mkdir -p supabase/functions/[function-name-kebab-case]
```

### 2. Copy and Convert

**Before (Base44):**
```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { param1, param2 } = await req.json();

        // Query database
        const records = await base44.asServiceRole.entities.SomeEntity.filter({
            field: 'value',
            date: { $gte: '2025-01-01' }
        });

        // Update database
        await base44.asServiceRole.entities.SomeEntity.update(id, {
            status: 'updated'
        });

        // Call another function
        await base44.asServiceRole.functions.invoke('sendEmail', {
            to: 'user@example.com',
            subject: 'Test'
        });

        return Response.json({ success: true, data: records });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
```

**After (Supabase):**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Auth check (optional - only if legacy had it)
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        const { param1, param2 } = await req.json();

        // Query database - convert filter to Supabase query builder
        const { data: records, error: queryError } = await supabase
            .from("some_entities")
            .select("*")
            .eq("field", "value")
            .gte("date", "2025-01-01");

        if (queryError) {
            throw queryError;
        }

        // Update database - convert to Supabase update
        const { error: updateError } = await supabase
            .from("some_entities")
            .update({ status: "updated" })
            .eq("id", id);

        if (updateError) {
            throw updateError;
        }

        // Call another function - convert to Supabase function invoke
        const { error: fnError } = await supabase.functions.invoke('send-email', {
            body: {
                to: 'user@example.com',
                subject: 'Test'
            }
        });

        if (fnError) {
            console.error('Function invocation error:', fnError);
        }

        return new Response(
            JSON.stringify({ success: true, data: records }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error('Function error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
```

### 3. Conversion Checklist

For each function, systematically convert:

- [ ] ✅ **Imports**: Replace `npm:@base44/sdk` with Supabase imports
- [ ] ✅ **Serve wrapper**: Ensure wrapped in `serve()` from Deno std
- [ ] ✅ **Client init**: Replace `createClientFromRequest(req)` with Supabase client
- [ ] ✅ **Auth check**: Convert `base44.auth.me()` to `supabase.auth.getUser(token)`
- [ ] ✅ **Database queries**: Convert all `.entities.*.filter()` to `.from().select().eq()`
- [ ] ✅ **Database updates**: Convert `.entities.*.update()` to `.from().update().eq()`
- [ ] ✅ **Database creates**: Convert `.entities.*.create()` to `.from().insert().select().single()`
- [ ] ✅ **Function calls**: Convert `.functions.invoke()` to `.functions.invoke()` with `body` wrapper
- [ ] ✅ **Responses**: Convert `Response.json()` to `new Response(JSON.stringify())`
- [ ] ✅ **Error handling**: Add proper error checking after each Supabase call
- [ ] ✅ **Environment vars**: Use `Deno.env.get()` for API keys
- [ ] ✅ **Business logic**: Keep 100% intact - DO NOT modify algorithms
- [ ] ✅ **Comments**: Preserve all comments from legacy version
- [ ] ✅ **Console logs**: Keep all console.log statements for debugging

### 4. Query Operator Conversion Table

| Base44 Filter | Supabase Query Builder |
|--------------|----------------------|
| `.filter({ field: 'value' })` | `.select("*").eq("field", "value")` |
| `.filter({ field: { $in: ['a', 'b'] } })` | `.select("*").in("field", ['a', 'b'])` |
| `.filter({ num: { $gte: 10 } })` | `.select("*").gte("num", 10)` |
| `.filter({ num: { $lte: 100 } })` | `.select("*").lte("num", 100)` |
| `.filter({ num: { $gt: 10 } })` | `.select("*").gt("num", 10)` |
| `.filter({ num: { $lt: 100 } })` | `.select("*").lt("num", 100)` |
| `.filter({ field: { $ne: 'value' } })` | `.select("*").neq("field", "value")` |
| `.list()` | `.select("*")` |

### 5. Entity Name Conversion (Plural)

Base44 uses **singular** entity names, Supabase uses **plural** table names:

| Base44 Entity | Supabase Table |
|--------------|---------------|
| `Agency` | `agencies` |
| `Shift` | `shifts` |
| `Timesheet` | `timesheets` |
| `Invoice` | `invoices` |
| `Staff` | `staff` (already plural) |
| `Client` | `clients` |
| `Booking` | `bookings` |
| `User` | `users` |
| `AdminWorkflow` | `admin_workflows` |

### 6. Special Considerations

#### For AI/OpenAI Functions:
- Keep OpenAI API calls unchanged
- Use `Deno.env.get("OPENAI_API_KEY")`

#### For Email Functions (Resend):
- Keep Resend API calls unchanged
- Use `Deno.env.get("RESEND_API_KEY")`

#### For SMS/WhatsApp Functions (Twilio):
- Keep Twilio API calls unchanged
- Use `Deno.env.get("TWILIO_*")` env vars

#### For Scheduled Functions:
- Add cron configuration in `supabase/functions/[name]/index.ts`
- Document the cron schedule in comments

### 7. Testing Checklist

After conversion, verify:

- [ ] Function deploys without errors
- [ ] Auth check works (if applicable)
- [ ] Database queries return expected data
- [ ] Database updates work correctly
- [ ] Function calls to other functions work
- [ ] Error handling works properly
- [ ] Response format is correct JSON

### 8. File Naming Convention

**Legacy:** `camelCase.ts` (e.g., `autoInvoiceGenerator.ts`)
**Supabase:** `kebab-case/index.ts` (e.g., `auto-invoice-generator/index.ts`)

Conversion examples:
- `emailAutomationEngine.ts` → `email-automation-engine/index.ts`
- `intelligentTimesheetValidator.ts` → `intelligent-timesheet-validator/index.ts`
- `sendWhatsApp.ts` → `send-whatsapp/index.ts`

---

## Example: Full Conversion

See [BASE44_TO_SUPABASE_CONVERSION_GUIDE.md](./BASE44_TO_SUPABASE_CONVERSION_GUIDE.md) for detailed examples.
