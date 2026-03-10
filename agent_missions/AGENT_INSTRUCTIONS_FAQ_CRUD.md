# AI Agent Instructions: FAQ Management CRUD Implementation
# ACG StaffLink — Kylie Chatbot FAQ System
# Project: C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3

---

## CONTEXT

The `chatbot_faq` table has just been migrated to include an `agency_id` column.
The system works as follows:
- Rows with `agency_id = NULL` are **platform defaults** visible to all agencies
- Rows with a specific `agency_id` are **agency overrides** that replace defaults for that agency
- Kylie (the WhatsApp AI) calls a sub-workflow to fetch the relevant FAQ at runtime

Your job is to implement:
1. `src/services/faqService.js` — Supabase CRUD service
2. `src/pages/KylieFAQManager.jsx` — Admin UI page for managing FAQs
3. Wire it into the app router and navigation

---

## DATABASE SCHEMA REFERENCE

```sql
-- chatbot_faq table columns:
id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4()
agency_id     uuid REFERENCES agencies(id) ON DELETE CASCADE  -- NULL = platform default
category      text CHECK IN ('uniforms','rates','timesheets','shifts','availability','general','compliance','payment','policies')
question      text NOT NULL
answer        text NOT NULL
keywords      text[]
priority      integer DEFAULT 0   -- higher = shown first
active        boolean DEFAULT true
view_count    integer DEFAULT 0   -- read-only, incremented by n8n
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

---

## STEP 1: Create `src/services/faqService.js`

Follow the exact same pattern as `src/services/timesheetService.js`.
Import from `@/lib/supabase`. Export a default object with named async methods.

```javascript
import { supabase } from "@/lib/supabase";

const faqService = {

  /**
   * Fetch all FAQs for an agency (their specific ones + platform defaults).
   * Used by admin UI to show the combined effective FAQ list.
   */
  async getAgencyFAQs(agencyId) {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .select('*')
      .or(`agency_id.eq.${agencyId},agency_id.is.null`)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('category');
    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch ONLY this agency's custom FAQs (not platform defaults).
   * Used for the "agency overrides" management section.
   */
  async getCustomFAQs(agencyId) {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .select('*')
      .eq('agency_id', agencyId)
      .order('category')
      .order('priority', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch platform defaults only (agency_id IS NULL).
   * Used for showing what defaults exist so admin can decide what to override.
   */
  async getPlatformDefaults() {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .select('*')
      .is('agency_id', null)
      .order('category')
      .order('priority', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new agency-specific FAQ entry.
   */
  async createFAQ(agencyId, faqData) {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .insert({
        agency_id: agencyId,
        category: faqData.category,
        question: faqData.question.trim(),
        answer: faqData.answer.trim(),
        keywords: faqData.keywords || [],
        priority: faqData.priority ?? 0,
        active: faqData.active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Update an existing FAQ. Only agency-owned FAQs can be edited.
   * Platform defaults (agency_id IS NULL) cannot be edited — create an override instead.
   */
  async updateFAQ(faqId, agencyId, updates) {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', faqId)
      .eq('agency_id', agencyId) // security: only own rows
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Soft-delete: set active = false. Does not delete row.
   * Hard delete only for agency-owned rows.
   */
  async deleteFAQ(faqId, agencyId) {
    const { error } = await supabase
      .from('chatbot_faq')
      .delete()
      .eq('id', faqId)
      .eq('agency_id', agencyId); // security: only own rows
    if (error) throw error;
    return true;
  },

  /**
   * Toggle active status for a FAQ.
   */
  async toggleActive(faqId, agencyId, currentActive) {
    return faqService.updateFAQ(faqId, agencyId, { active: !currentActive });
  },

  /**
   * Create an agency override from a platform default.
   * Clones the platform default as an agency-specific row so it can be customised.
   */
  async overridePlatformDefault(platformFAQId, agencyId, customAnswer) {
    // First fetch the platform default
    const { data: original, error: fetchError } = await supabase
      .from('chatbot_faq')
      .select('*')
      .eq('id', platformFAQId)
      .is('agency_id', null)
      .single();
    if (fetchError) throw fetchError;

    // Create agency-specific version
    return faqService.createFAQ(agencyId, {
      category: original.category,
      question: original.question,
      answer: customAnswer || original.answer,
      keywords: original.keywords,
      priority: original.priority + 1, // slightly higher priority to take precedence
      active: true,
    });
  },
};

export default faqService;
```

---

## STEP 2: Create `src/pages/KylieFAQManager.jsx`

This is a full-page admin component. Follow the style of existing admin pages
(e.g. `AgencySettings.jsx`, `Timesheets.jsx`) for visual consistency.

### UI Structure

```
Page Header: "Kylie FAQ Manager"
Subtitle: "Manage what Kylie knows about your agency's policies and procedures."

[Tab 1: Platform Defaults]
  - Read-only list of all platform FAQ entries grouped by category
  - Each row shows: Category badge | Question | Answer (truncated) | Priority | Active toggle (disabled)
  - Action button: "Override for this agency" → opens modal with answer pre-filled for editing

[Tab 2: Agency FAQs] (your custom entries)
  - List of agency-specific FAQ entries
  - Shows: Category badge | Question | Answer | Priority | Active toggle | Edit | Delete buttons
  - "Add New FAQ" button → opens create modal

[Tab 3: Preview] (Kylie's effective FAQ)
  - Combined view of what Kylie will actually see (platform defaults + agency overrides)
  - Groups by category
  - Shows which entries are "Platform Default" vs "Agency Custom" with a colour indicator
```

### Create/Edit Modal Fields

```
Category       — Select dropdown: availability | compliance | general | payment | 
                  policies | rates | shifts | timesheets | uniforms
Question *     — Text input (required)
Answer *       — Textarea, 4 rows (required)
Keywords       — Text input, comma-separated (split on save to array)
Priority       — Number input 0–10 (default: 0). Tooltip: "Higher = shown first to Kylie"
Active         — Toggle switch
```

### Key UX Rules

1. **Platform defaults are read-only.** Show a lock icon on rows from the platform.
   Only allow clicking "Override" which creates an editable copy for this agency.

2. **Category color badges**: use consistent colors:
   - `shifts` → blue
   - `rates` / `payment` → green
   - `timesheets` → orange
   - `compliance` → red
   - `uniforms` → purple
   - `availability` → teal
   - `general` / `policies` → gray

3. **Delete confirmation**: always show "Are you sure?" confirm before deleting.

4. **Keywords field**: accept comma-separated string on input,
   split to array on save: `value.split(',').map(k => k.trim()).filter(Boolean)`

5. **useEffect on mount**: load `faqService.getCustomFAQs(agencyId)` and
   `faqService.getPlatformDefaults()` in parallel using `Promise.all`.

6. **Agency ID source**: get from `useAuth()` context or `supabase.auth.getUser()`
   then look up `profiles.agency_id` for the logged-in admin user.

---

## STEP 3: Add to Router (`src/App.jsx` or router file)

Find where routes are defined. Add:

```jsx
import KylieFAQManager from './pages/KylieFAQManager';

// Inside routes:
<Route path="/kylie-faq" element={<KylieFAQManager />} />
```

---

## STEP 4: Add to Navigation

Find the admin sidebar/nav (likely in `src/components/` or `Layout.jsx`).
Add a menu item under the "Kylie" or "AI" section:

```
Icon: MessageSquare or Bot (lucide-react)
Label: "FAQ Manager"
Path: /kylie-faq
```

If no Kylie section exists in nav, add it under "Settings".

---

## IMPORTANT CONSTRAINTS

- **Never allow editing of rows where `agency_id IS NULL`** — these are platform defaults.
  If an admin tries, show: "This is a platform default. Use 'Override' to create a custom version."

- **RLS note**: The `chatbot_faq` table has RLS enabled. The service uses the anon/service key
  from `@/lib/supabase`. If reads fail, check Supabase RLS policies allow `SELECT` for authenticated users.
  You may need to add a policy: `USING (agency_id = auth.jwt()->>'agency_id' OR agency_id IS NULL)`

- **Do NOT hardcode agency names or IDs.** Always read `agency_id` dynamically from auth context.

- **Do NOT add a FAQ management route to the public/staff portal.** This is admin-only.
