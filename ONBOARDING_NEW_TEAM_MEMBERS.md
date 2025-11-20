# Onboarding New Team Members - Day 1 Guide

This guide helps new engineers, UX designers, and team members get productive on Day 1.

---

## Before Their First Day

### Access Checklist
- [ ] GitHub repository access
- [ ] Supabase project access (rzzxxkppkiasuouuglaf)
- [ ] Environment variables file (`.env`)
- [ ] Figma workspace access (UX designer)
- [ ] Slack/Discord invite
- [ ] Linear/Jira project access

---

## Day 1: Frontend Engineer

### Morning (2-3 hours)

**1. Environment Setup**
```bash
# Clone repository
git clone [your-repo-url]
cd agc_latest3

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Ask tech lead for actual values

# Start development server
npm run dev
# Should open on http://localhost:5173
```

**2. Codebase Tour** (Read these files)
- [PARALLEL_DEVELOPMENT_RESTRUCTURE.md](PARALLEL_DEVELOPMENT_RESTRUCTURE.md) - Development workflow
- [src/App.jsx](src/App.jsx) - Application entry point
- [src/components/ui/](src/components/ui/) - UI component library (40+ components)
- [src/api/supabaseClient.js](src/api/supabaseClient.js) - Backend connection

**3. First Task: Fix a Small UI Bug**
- Check Linear/Jira for "good first issue" tagged tasks
- Typical examples:
  - Update button text
  - Fix component spacing
  - Add loading state to existing component

**Expected outcome**: Pull request created by end of day!

### Afternoon (2-3 hours)

**4. Component Development Practice**
- Read [shared/types/edge-functions.ts](shared/types/edge-functions.ts)
- Build a simple component using existing UI library
- Example: Create `<ShiftStatusBadge>` component

```tsx
// src/components/shifts/ShiftStatusBadge.tsx
import { SHIFT_STATUS } from '@acg/shared/constants';

export function ShiftStatusBadge({ status }) {
  const colors = {
    [SHIFT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
    [SHIFT_STATUS.CONFIRMED]: 'bg-blue-100 text-blue-800',
    [SHIFT_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    [SHIFT_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded ${colors[status]}`}>
      {status}
    </span>
  );
}
```

**5. Code Review Practice**
- Review an existing pull request
- Leave constructive feedback
- Learn team's code standards

---

## Day 1: Backend Engineer

### Morning (2-3 hours)

**1. Environment Setup**
```bash
# Clone repository
git clone [your-repo-url]
cd agc_latest3

# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref rzzxxkppkiasuouuglaf
```

**2. Database Exploration**
```bash
# Pull current schema
supabase db pull

# Explore migrations
ls supabase/migrations/

# Connect to database (read-only first day!)
supabase db inspect
```

**3. Codebase Tour**
- Read [supabase/functions/](supabase/functions/) - 53 edge functions
- Understand naming convention:
  - `send-*` = Communication functions
  - `*-engine` = Automation functions
  - `*-validator` = Validation functions
- Read [shared/types/edge-functions.ts](shared/types/edge-functions.ts)

**4. Run Edge Function Locally**
```bash
# Start local Supabase
supabase start

# Serve a function locally
supabase functions serve send-sms --env-file .env.local

# Test with curl (in another terminal)
curl http://localhost:54321/functions/v1/send-sms \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"to":"+447911123456","message":"Test"}'
```

**Expected outcome**: Successfully run one edge function locally!

### Afternoon (2-3 hours)

**5. First Task: Add Logging to Existing Function**
- Pick a simple function (e.g., `send-sms`)
- Add console.log statements for debugging
- Deploy to staging and test

```typescript
// supabase/functions/send-sms/index.ts
Deno.serve(async (req) => {
  console.log('📨 SMS request received:', await req.clone().text());

  const body = await req.json();
  console.log('✅ Parsed body:', body);

  // ... rest of function

  console.log('📤 Response:', response);
  return new Response(JSON.stringify(response));
});
```

**6. Deploy Your First Change**
```bash
# Deploy single function
supabase functions deploy send-sms --project-ref rzzxxkppkiasuouuglaf

# Check logs
supabase functions logs send-sms
```

---

## Day 1: UX Designer

### Morning (2-3 hours)

**1. Design System Audit**
- Open [src/components/ui/](src/components/ui/)
- List all existing components (40+):
  - Buttons, Cards, Dialogs, Forms, Tables, etc.
- Document what exists vs. what's missing

**2. Create Component Inventory Spreadsheet**
| Component | Exists? | Figma Link | Status | Notes |
|-----------|---------|------------|--------|-------|
| Button | ✅ | [link] | Done | Has 3 variants |
| Card | ✅ | [link] | Needs update | Missing shadow option |
| Modal | ✅ | [link] | Done | - |
| ShiftCard | ❌ | - | TODO | Need to design |

**3. Review Current User Flows**
- Walk through the application as different user roles:
  - Agency Admin (can create shifts, manage staff)
  - Staff Member (can view and apply to shifts)
  - Client (care home manager)
- Document pain points and opportunities

### Afternoon (2-3 hours)

**4. Create First Component Spec**

Example: ShiftMarketplaceCard

```markdown
## Component: ShiftMarketplaceCard

**File**: `src/components/shifts/ShiftMarketplaceCard.tsx`

**Purpose**: Display available shift in marketplace for staff to apply

**Props:**
- `shift` (object) - Shift entity from database
- `onApply` (function) - Callback when staff clicks "Apply"
- `disabled` (boolean) - Whether shift is already applied to

**Visual States:**
1. Default (available)
2. Hover (shows more details)
3. Applied (grayed out, shows checkmark)
4. Loading (during apply action)

**Layout:**
┌─────────────────────────────────────┐
│ Client Name               [📍 2.5mi]│
│ Care Home Address                   │
│                                     │
│ 📅 Monday, Nov 20                   │
│ ⏰ 08:00 - 16:00 (8 hours)          │
│ 💷 £18.50/hr                        │
│                                     │
│ [Apply for Shift]        [→ Details]│
└─────────────────────────────────────┘

**Figma**: [Insert link]

**Implementation Notes:**
- Use `<Card>` from UI library
- Distance calculation from staff profile location
- Show shift type badge (Day, Night, Long Day)
- Respect minimum font sizes for accessibility
```

**5. First Design Task**
- Create 3 variations of one component in Figma
- Share with frontend engineer for feedback
- Iterate based on implementation feasibility

---

## Day 1: Tech Lead / Overseer

### Morning (2-3 hours)

**1. Architecture Review**
- Read [PARALLEL_DEVELOPMENT_RESTRUCTURE.md](PARALLEL_DEVELOPMENT_RESTRUCTURE.md)
- Review current codebase structure
- Identify technical debt priorities

**2. Set Up Project Management**
- Create project board (GitHub Projects or Linear)
- Break down current sprint into tasks
- Assign initial tasks to team members

**Example Epic: "Staff Shift Preferences"**
```
Epic: Staff Shift Preferences
├── [BACKEND] Create staff_preferences table migration
├── [BACKEND] Implement get-staff-preferences edge function
├── [BACKEND] Implement update-staff-preferences edge function
├── [SHARED] Define API contracts in edge-functions.ts
├── [UX] Design preferences form UI
├── [FRONTEND] Build PreferencesForm component
├── [FRONTEND] Integrate with backend APIs
└── [QA] Test end-to-end flow
```

**3. Define Review Process**
- Code review checklist
- PR approval requirements
- Deployment process

### Afternoon (2-3 hours)

**4. Team Sync Meeting**
- Introduce team members
- Walk through current sprint goals
- Assign first tasks to each team member
- Schedule daily standups (15 min, same time each day)

**5. Set Up CI/CD Monitoring**
- Review GitHub Actions workflows
- Set up error alerts (Sentry, LogRocket, etc.)
- Create deployment dashboard

---

## Week 1 Goals by Role

### Frontend Engineer
- [ ] Successfully run development server
- [ ] Make first UI change
- [ ] Create first pull request
- [ ] Review teammate's PR
- [ ] Ship one small feature

### Backend Engineer
- [ ] Run edge function locally
- [ ] Deploy one function change
- [ ] Write API contract for one new function
- [ ] Review database schema
- [ ] Ship one small feature

### UX Designer
- [ ] Complete component inventory
- [ ] Create 3 component specs
- [ ] Get feedback from frontend engineer
- [ ] Iterate on one design based on feedback
- [ ] Create design system documentation

### Tech Lead
- [ ] Onboard all team members
- [ ] Set up project management system
- [ ] Define sprint goals
- [ ] Review and approve first PRs
- [ ] Establish team rituals (standups, retros)

---

## Daily Standups (15 minutes max)

**Format:** Each person answers:
1. What did you ship yesterday?
2. What will you ship today?
3. Any blockers?

**Example:**
> **Frontend Engineer**: Yesterday I built the ShiftStatusBadge component. Today I'll integrate it into the ShiftTable. No blockers.

> **Backend Engineer**: Yesterday I added logging to send-sms. Today I'll implement the get-staff-preferences endpoint. Blocked: Need database schema approval.

> **UX Designer**: Yesterday I created component specs for ShiftCard. Today I'll design the preferences form. No blockers.

> **Tech Lead**: Unblocking backend - I'll review the schema PR this morning.

---

## Communication Guidelines

### When to Use What

**Slack/Discord:**
- Quick questions
- Status updates
- Sharing links/screenshots
- Celebrations ("Just shipped X!")

**GitHub Issues/Linear:**
- Feature requests
- Bug reports
- Task tracking

**Pull Request Comments:**
- Code-specific feedback
- Implementation questions
- Suggesting alternatives

**Video Calls:**
- Complex architectural discussions
- Pair programming sessions
- Design feedback sessions
- Weekly planning

---

## Common Questions

**Q: Can I work on frontend if backend API isn't ready?**
A: Yes! Use mock data. See [src/api/mockClient.ts](src/api/mockClient.ts) for examples.

**Q: How do I know what API endpoint to call?**
A: Check [shared/types/edge-functions.ts](shared/types/edge-functions.ts) for all API contracts.

**Q: What if I need a new component that doesn't exist?**
A: Check with UX designer first. They may have it designed. If not, create a spec together.

**Q: Can I deploy to production?**
A: Not on Day 1! Deploy to staging first, get tech lead approval.

**Q: What's the code review process?**
A: 1 approval required. Tech lead reviews architecture changes. Same-role reviews for other changes.

---

## Success Metrics

After Day 1, each team member should:
- ✅ Have working development environment
- ✅ Understand their area of the codebase
- ✅ Know who to ask for help
- ✅ Have created something (even if small)
- ✅ Feel excited about the project

After Week 1, the team should:
- ✅ Ship 2-3 small features together
- ✅ Have established daily standup rhythm
- ✅ Feel comfortable with tools and processes
- ✅ Be ready to tackle bigger features independently

---

## Emergency Contacts

**Database Issues**: [Tech Lead]
**Supabase Access Problems**: [Tech Lead]
**Deployment Issues**: [Tech Lead]
**Design Questions**: [UX Designer]
**Code Review Needed**: [Tech Lead or Senior Engineer]

**Remember**: No question is too small on Day 1. Ask early, ask often!
