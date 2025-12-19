# LINEAR TICKET TEMPLATE FOR AI AGENTS
## Standard Format for Agent-Readable Task Tickets

**Version:** 1.0
**Purpose:** Ensure all Linear tickets can be parsed and executed by AI agents autonomously
**Last Updated:** 2025-12-18

---

## 🎯 Template Structure

Every Linear ticket MUST contain these sections in this order:

```markdown
## Context
[1-2 sentences: Why does this task exist? What problem does it solve?]

## Task
[Step-by-step numbered instructions the agent should follow]
1. First step (be specific - include file paths)
2. Second step
3. Third step

## Files
[Exact paths to files that will be touched]
- `path/to/file1.ts` - Description of change
- `path/to/file2.jsx` - Description of change

## Acceptance Criteria
[Checkboxes for completion validation]
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

## Reference
[Links to related documentation, code, or tickets]
- Related doc: `agent_missions/MODULE_XX/INSTRUCTIONS.md`
- Related ticket: AUT-YY
- Code example: `supabase/functions/_shared/example.ts`

## Rollback Plan
[Exact steps to undo if something breaks]
1. Revert commit: `git revert <commit-hash>`
2. Restore file: `git checkout HEAD~1 -- path/to/file`
3. Redeploy: `supabase functions deploy function-name`

## Dependencies
[What must be completed before this can start]
- Depends on: AUT-XX (must be Done)
- Blocks: AUT-ZZ (cannot start until this is Done)

## Estimated Effort
- **Hours:** X
- **Complexity:** Low/Medium/High
- **Risk:** Low/Medium/High
```

---

## 📝 Example: Real Ticket (AUT-16 Format)

```markdown
## Context
The send-shift-notifications edge function has hardcoded 'ACG StaffLink' branding. 
This prevents white-labeling and SaaS rebranding.

## Task
1. Import `getBranding` helper from `_shared/getBranding.ts`
2. Call `getBranding(supabase, agency_id)` at start of function
3. Replace all hardcoded 'ACG StaffLink' with `branding.saasName`
4. Replace hardcoded support emails with `branding.supportEmail`
5. Replace hardcoded URLs with `branding.portalUrl`
6. Test with different agency IDs

## Files
- `supabase/functions/send-shift-notifications/index.ts` - Main changes
- `supabase/functions/_shared/getBranding.ts` - Reference only (no changes)

## Acceptance Criteria
- [ ] No hardcoded 'ACG StaffLink' in file
- [ ] getBranding() called with agency_id
- [ ] Email templates use dynamic branding
- [ ] Function deployed to staging
- [ ] Tested with 2+ agency IDs

## Reference
- Branding system: `agent_missions/MODULE_3_TEMPLATE_AUDIT/EXAMPLE_BRANDING_USAGE.md`
- Helper function: `supabase/functions/_shared/getBranding.ts`

## Rollback Plan
1. Revert: `git checkout HEAD~1 -- supabase/functions/send-shift-notifications/index.ts`
2. Redeploy: `supabase functions deploy send-shift-notifications`
3. Verify emails still send (test with manual trigger)

## Dependencies
- Depends on: None (getBranding already exists)
- Blocks: AUT-20 (bulk update depends on this pattern working)

## Estimated Effort
- **Hours:** 2
- **Complexity:** Low
- **Risk:** Low (isolated change, easy rollback)
```

---

## ⚠️ Anti-Patterns (DO NOT DO THESE)

**❌ Vague descriptions:**
> "Fix the notifications"

**✅ Specific descriptions:**
> "Update `send-shift-notifications/index.ts` to use `getBranding()` helper"

**❌ Missing file paths:**
> "Update the relevant files"

**✅ Explicit file paths:**
> `supabase/functions/send-shift-notifications/index.ts`

**❌ No rollback:**
> (empty)

**✅ Clear rollback:**
> `git checkout HEAD~1 -- path/to/file && supabase functions deploy name`

---

## 🤖 Agent Workflow with This Template

```
1. Agent receives: "Work on branding project"
2. Agent queries: linear("List issues in project SaaS Branding...")
3. Agent reads: Ticket description (using this template)
4. Agent parses: Context → Task → Files → Criteria
5. Agent validates: Dependencies (are blocking tickets Done?)
6. Agent executes: Step-by-step Task instructions
7. Agent verifies: All Acceptance Criteria checked
8. Agent updates: linear("Update AUT-XX state to Done")
9. Agent reports: "Completed AUT-XX. Files changed: [...]"
```

---

## 📌 Quick Reference: Required Fields

| Field | Required? | Purpose |
|-------|-----------|---------|
| Context | ✅ | Why this task exists |
| Task | ✅ | Step-by-step what to do |
| Files | ✅ | Exact paths to edit |
| Acceptance Criteria | ✅ | How to know it's done |
| Reference | ⚠️ Optional | Related docs/tickets |
| Rollback Plan | ✅ | How to undo if broken |
| Dependencies | ⚠️ Optional | Blocking/blocked tickets |
| Estimated Effort | ⚠️ Optional | Time/complexity/risk |

