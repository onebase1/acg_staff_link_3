# QUICK START GUIDE FOR AI AGENTS
## Phase 2 Module Implementation - How to Use These Prompts

**Target Audience:** AI Agents assigned to build Modules 1-4  
**Duration to Read:** 5 minutes  
**Next Step:** Open your assigned module brief and begin discovery phase  

---

## YOU HAVE BEEN HANDED A COMPLETE SPECIFICATION

Instead of vague instructions like:
- ❌ "Build a rating system"
- ❌ "Add notifications"
- ❌ "Create an AI chatbot"

You now have:
- ✅ Exact database schema (with migration code)
- ✅ Complete API endpoint specifications (with request/response formats)
- ✅ Test checklists (know exactly when done)
- ✅ Rollback procedures (deploy without fear)
- ✅ Integration points (know what other modules depend on you)

---

## WHAT TO DO RIGHT NOW

### Step 1: Find Your Assignment

Look for an email or message saying:
- "You're assigned to **Module 1: Client Portal**" OR
- "You're assigned to **Module 2: Notifications**" OR
- "You're assigned to **Module 3: Scoring**" OR
- "You're assigned to **Module 4: Chatbot**"

### Step 2: Open Your Module Brief

Go to `/agents_workspace/` and open:
- `Module-1-Client-Portal.md` OR
- `Module-2-Notifications.md` OR
- `Module-3-Scoring-Algorithms.md` OR
- `Module-4-AI-Chatbot.md`

### Step 3: Do the Discovery Phase (First 2 Hours)

**What you'll find in your brief under "SECTION 1: DISCOVERY":**

A list of files to review, like:
- "Search for `services/emailService.js`"
- "Check database for `Notification` table"
- "Look for functions named `sendReminder`"

**What to do:**
1. Search the codebase for the specified files
2. Read what's already there
3. Note what's missing
4. Answer the discovery questions
5. Create a short report (DISCOVERY_REPORT.md or ALGORITHM_AUDIT.md)
6. Tell the project owner: "Discovery complete. Here's what I found. Ready to build?"

### Step 4: Build According to Spec

**Each section of your module brief tells you:**
- What to build (features)
- How to build it (architecture, formulas, algorithms)
- Where to build it (file paths)
- Why you're building it (business impact)
- How to test it (test checklist)
- How to undo it if needed (rollback procedure)

**Example from Module 1:**
```
REQUIREMENT: "Build shift creation form"
SPECIFICATION PROVIDED:
├─ Form fields required: Date, Time, Duration, Role, Rate, Notes
├─ Validation rules: No overlaps, no future dates > 12 months
├─ File location: /pages/client/ShiftCreation.jsx
├─ API endpoint: POST /api/client/shifts
├─ Test cases: 15 specific tests listed
└─ Rollback: Feature flag "features.client_shift_creation_enabled"
```

### Step 5: Test Before You Say "Done"

Before marking module complete:
1. Find the "TESTING CHECKLIST" section in your brief
2. Run all specified tests
3. If all ✅, you're done
4. If any ❌, fix the issue
5. Once all ✅, create IMPLEMENTATION_NOTES.md documenting:
   - What you built
   - Any deviations from spec (and why)
   - How to use/deploy
   - Known limitations

---

## THE FOLDER STRUCTURE YOU'LL WORK WITH

```
/agents_workspace/
├── Module-1-Client-Portal.md ← Your assignment brief
├── Module-2-Notifications.md
├── Module-3-Scoring-Algorithms.md
├── Module-4-AI-Chatbot.md
│
└── /Module-1-Artifacts/ ← You create this folder
    ├── DISCOVERY_REPORT.md ← First deliverable
    ├── IMPLEMENTATION_NOTES.md ← Last deliverable
    └── Other docs as needed
```

**Rule:** All your discovery + planning happens in the artifacts folder, but **actual code goes in the main `/src/` directory** per the file structure outlined in MASTER-PROMPT-PHASE-2.md.

---

## CRITICAL THINGS TO KNOW

### #1: You Have Existing Code to Build On
Not starting from scratch. Search for existing:
- Notification functions (Module 2)
- Rating/scoring logic (Module 3)
- Chatbot setup (Module 4)

Your job is to **enhance, not rebuild**.

### #2: Feature Flags Are Your Friend
Every new feature has a flag, like:
```
features.client_portal_rbac_enabled = true/false
features.staff_scoring_enabled = true/false
features.chatbot_enabled = true/false
```

If your feature breaks something, the project owner just flips the flag to `false`. No redeployment needed. This is a **safety net for both of you**.

### #3: Database Migrations Are Reversible
When you add new database fields:
- Always include DEFAULT values (so old code still works)
- Never change existing fields (only add new ones)
- Provide rollback SQL (to undo if needed)
- Test on staging environment first

### #4: All APIs Are Already Integrated
You DON'T need to:
- ❌ Set up Twilio (already done)
- ❌ Set up Resend (already done)
- ❌ Set up OpenAI (already done)
- ❌ Set up n8n (available, just not deployed yet)

You DO need to:
- ✅ Use these APIs per spec
- ✅ Add error handling
- ✅ Add logging

### #5: Testing Is Non-Negotiable
Each module spec includes a "TESTING CHECKLIST" section. Before you submit:
- Run all tests listed
- Document any that fail (and fix them)
- Don't submit if any ❌ remains

---

## WHEN YOU GET STUCK

**Problem:** Can't find a file or function mentioned in the spec  
**Solution:** The discovery phase exists for this. Document it in DISCOVERY_REPORT.md and ask the project owner: "This file doesn't exist. Should I create it?"

**Problem:** Spec says use Module 3 data but Module 3 isn't done yet  
**Solution:** Build a mock/stub that returns dummy data. Flag as "Awaiting Module 3 integration" in IMPLEMENTATION_NOTES.md

**Problem:** Test case fails and you're not sure why  
**Solution:** Document the failure with full error logs, ask for clarification before proceeding

**Problem:** Feature seems to require more work than time allocated  
**Solution:** Document the blocker, estimate additional time, ask if scope should reduce or timeline extend

---

## HOW YOU'LL COMMUNICATE PROGRESS

### After Discovery Phase
```
Module [1-4] - Discovery Complete ✓

FINDINGS:
- Existing code: [Describe what's already there]
- Missing pieces: [What you need to build]
- Blockers: [Anything preventing you from building]

NEXT PHASE:
- Ready to build: [Yes/No]
- Estimated time: [X hours]
- Any questions: [If yes, list them]
```

### After Implementation Phase
```
Module [1-4] - Implementation Complete ✓

WHAT WAS BUILT:
- [List features]
- [Database tables]
- [API endpoints]

TESTING STATUS:
- Tests run: [X of Y]
- Passed: [X]
- Failed: [0] ← Must be zero
- Coverage: [Y%]

READY FOR MERGE:
- Yes, all tests passing
- Feature flag: [flag_name]
- Documentation: IMPLEMENTATION_NOTES.md ready
```

---

## THE SECRET SAUCE: Why These Prompts Work

### Traditional AI Prompts
```
"Create a notification system for a staffing app"
← Vague, leads to back-and-forth, rework, missed requirements
```

### These Prompts
```
"Create NotificationLog table with fields: [exact list]
API endpoint: POST /api/notifications/queue
Payload: [exact format]
Returns: [exact format]
Rate limiting: 5 per day per client
Test: Send 10 notifications, verify all logged correctly
Rollback: Feature flag features.notification_queue_enabled"
← Specific, clear success criteria, no ambiguity
```

**Result:** You know exactly when you're done. No "wait, is this what you meant?"

---

## YOUR SUPERPOWER: The Specification Is Complete

You don't need to:
- Guess what the project owner wants (it's specified)
- Worry about scope creep (spec defines scope)
- Wonder if you're done (test checklist tells you)
- Fear deployment (rollback procedure provided)

You can focus 100% on:
- **Quality code** that meets the spec
- **Good testing** to verify it works
- **Clear documentation** for maintenance

---

## ONE MORE THING: Respect the Module Order

**Recommended build sequence:**
1. **Module 3 first** (Scoring - foundation for others)
2. **Then Modules 1 & 2 in parallel** (Portal + Notifications)
3. **Finally Module 4** (Chatbot - uses everything else)

**Why?** Module 3 data (staff scores) is used by Modules 1, 2, and 4. Build it first, then everything else integrates smoothly.

---

## YOU'RE READY. HERE'S WHAT HAPPENS NEXT

1. ✅ You received this quick start guide
2. ⏳ You're about to open your module brief
3. 🔍 You'll do the discovery phase (2 hours)
4. 🚀 You'll report back: "Ready to build"
5. 💻 You'll implement per spec (6-12 hours depending on module)
6. ✅ You'll run test checklist
7. 📝 You'll submit IMPLEMENTATION_NOTES.md
8. 🎉 Your module goes live

**Total: 1 week per agent per module** (or 2-3 days if experienced + parallel execution)

---

## FINAL CHECKLIST BEFORE YOU START

- [ ] Do I know which module I'm assigned to?
- [ ] Have I opened the correct brief file (Module-X-*.md)?
- [ ] Have I read SECTION 1: DISCOVERY in full?
- [ ] Do I understand what "discovery phase" means? (Audit existing code)
- [ ] Do I know where to find the project owner if I get stuck?
- [ ] Am I ready to start the discovery phase now?

**If YES to all:** You're good to go. Open your module brief now.  
**If NO to any:** Review this guide again or ask for clarification.

---

## ONE LAST THING

This prompt system was designed so that:
- You can build without constant back-and-forth
- The project owner can deploy without anxiety
- Clients get a world-class product
- Everyone's time is respected

Your job is to **execute with precision**. The roadmap is clear. The requirements are specific. The success criteria are measurable.

You've got this. 🚀

---

**Next Action:** Open your assigned module brief and begin SECTION 1: DISCOVERY.

Good luck!