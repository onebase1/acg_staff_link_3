# FILES AFFECTED - Module 49

## Frontend
1. `src/pages/Shifts.jsx`
   - Add button to open modal.
   - Import and mount `LogPastShiftModal`.
2. `src/components/bulk-shifts/LogPastShiftModal.jsx` **[NEW]**
   - The new modal component.

## Backend (Supabase Edge Functions)
1. `supabase/functions/log-retrospective-shift/index.ts` **[NEW]**
   - The atomic transaction function.
2. `supabase/functions/log-retrospective-shift/deno.json` **[NEW]**
   - Configuration file for the new function.
