---
type: "always_apply"
---

text
---
type: always_apply
---

# Anti-Patterns (DO NOT DO THESE)

## Code Anti-Patterns ❌

**Monolithic functions >200 lines**
- ❌ Bad: One giant function doing everything
- ✅ Good: Split into smaller, reusable functions
- Action: If I suggest this, I'll raise flag

**Hardcoded values**
- ❌ Bad: `const API_URL = "https://example.com"`
- ✅ Good: `const API_URL = process.env.API_URL`
- Action: Always use environment variables

**Duplicate code across files**
- ❌ Bad: Copy-pasting utility logic
- ✅ Good: Extract to shared utility function
- Action: Check if it exists before building new

**No error handling**
- ❌ Bad: `const data = await fetch(url)`
- ✅ Good: Try-catch + error logging + user feedback
- Action: Always include error handling

**API calls without timeout**
- ❌ Bad: `await externalAPI()` (could hang forever)
- ✅ Good: 30-second timeout + retry logic
- Action: Always set timeouts

---

## Documentation Anti-Patterns ❌

**Creating .md with no lifecycle metadata**
- ❌ Bad: `.md` file missing YAML header
- ✅ Good: All `.md` files have status/dates/code_reference
- Action: Reject any `.md` without metadata

**Documentation drifting from code**
- ❌ Bad: `.md` describes old API, code has new one
- ✅ Good: `.md` tied to code_reference, auto-flagged if stale
- Action: Auto-deprecate docs >30 days old

**.md files in random locations**
- ❌ Bad: `.md` files scattered everywhere
- ✅ Good: Organized in functions/, components/, docs/*, schemas/
- Action: Enforce folder structure

**Deprecated .md files in main build**
- ❌ Bad: Committing deprecated `.md` files
- ✅ Good: Move to archive/, exclude from builds
- Action: Git pre-commit hook blocks this

**No code reference in .md files**
- ❌ Bad: `.md` with generic description, no link to code
- ✅ Good: `code_reference: functions/myFile.js:1-100`
- Action: Require this field or mark as "N/A" with justification

---

## Architecture Anti-Patterns ❌

**Rebuilding existing functionality**
- ❌ Bad: Building custom email system when Resend exists
- ✅ Good: Use Twilio, OpenAI, Resend, Supabase first
- Action: GATE 1 flags this before build

**Tight coupling between modules**
- ❌ Bad: Function A directly calls Function B internals
- ✅ Good: Independent functions with clear API boundaries
- Action: Design for reusability from start

**Ignoring scalability**
- ❌ Bad: Code works for 10 agencies, breaks at 100
- ✅ Good: Design handles 100+ agencies, edge cases managed
- Action: GATE 2 validates this

**No rollback plan**
- ❌ Bad: Deploy code, no way to undo if broken
- ✅ Good: Every change has explicit rollback steps
- Action: GATE 3 requires rollback in execution plan

**Manual `.md` updates instead of automation**
- ❌ Bad: Human remembers to update docs after code change
- ✅ Good: Lifecycle system auto-flags when sync needed
- Action: Use automation, not manual tracking

---

## When Anti-Patterns Are Found

**Action**: STOP work immediately
**Response**: Raise the flag, explain the issue
**Next**: Propose fix or alternative approach
**Wait**: User makes decision before proceeding

No exceptions. This keeps codebase clean and maintainable.