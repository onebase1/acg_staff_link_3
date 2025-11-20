# Quick Start: AI Agent Parallel Development

**Goal**: Set up your codebase so you + 3 AI agents can work simultaneously without conflicts.

---

## ⚡ 5-Minute Setup

### Step 1: Run Setup Script
```bash
# Make script executable
chmod +x setup-parallel-dev.sh

# Run it
./setup-parallel-dev.sh
```

This creates:
- `shared/` - Shared types directory
- `shared/types/edge-functions.ts` - API contracts
- `prompts/` - AI agent prompt templates

### Step 2: Generate Supabase Types
```bash
cd shared
supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > types/supabase-generated.ts
```

### Step 3: You're Ready!
Now you can assign tasks to 3 AI agents working in parallel.

---

## 🤖 Your AI Team

| Agent | Works On | Never Touches | Prompt Template |
|-------|----------|---------------|-----------------|
| **Frontend Agent** | `src/` (React components) | `supabase/` | [prompts/frontend-agent-template.txt](prompts/frontend-agent-template.txt) |
| **Backend Agent** | `supabase/` (Edge functions, DB) | `src/` | [prompts/backend-agent-template.txt](prompts/backend-agent-template.txt) |
| **Integration Agent** | `shared/`, `tests/`, `docs/` | Implementation code | [prompts/integration-agent-template.txt](prompts/integration-agent-template.txt) |

---

## 📋 Workflow for New Feature

### Example: "Staff Shift Preferences"

**Step 1: Integration Agent First** (10 min)
```bash
# Copy prompt template
cp prompts/integration-agent-template.txt prompts/staff-preferences-integration.txt

# Edit the task section with your requirements
# Then send to Claude/GPT:
cat prompts/staff-preferences-integration.txt
```

**What Integration Agent Does:**
- Defines API types in `shared/types/edge-functions.ts`
- Creates validation schemas in `shared/schemas/preferences.ts`
- Writes tests in `tests/integration/preferences.test.ts`

**You Review & Commit:**
```bash
git add shared/ tests/
git commit -m "feat(contracts): Staff preferences API contracts (AI)"
```

**Step 2: Frontend + Backend Agents in Parallel** (30 min)

**Frontend Agent** (separate conversation):
```bash
# Use template
cat prompts/frontend-agent-template.txt

# Customize for your feature
# Send to Claude/GPT (in Cursor, Claude Code, etc.)
```

**Backend Agent** (separate conversation):
```bash
# Use template
cat prompts/backend-agent-template.txt

# Customize for your feature
# Send to different Claude/GPT instance
```

Both agents work **simultaneously** because:
- ✅ They have API contract from Integration Agent
- ✅ They work on different directories (`src/` vs `supabase/`)
- ✅ No merge conflicts!

**You Review & Commit:**
```bash
# Review frontend output
git add src/
git commit -m "feat(frontend): Staff preferences UI (AI)"

# Review backend output
git add supabase/
git commit -m "feat(backend): Staff preferences API (AI)"

# Deploy
supabase functions deploy get-staff-preferences
supabase functions deploy update-staff-preferences
npm run build
```

**Total Time**: ~45 minutes (vs 6 hours if you built it manually!)

---

## 🛠 Tools You Need

### Option 1: Cursor (Recommended - Easiest)
- Open 3 Cursor windows
- Window 1: Frontend agent (restrict to `src/`)
- Window 2: Backend agent (restrict to `supabase/`)
- Window 3: Integration agent (restrict to `shared/`, `tests/`)
- **Cost**: $20/month
- **Setup**: 5 minutes

### Option 2: Claude Code + Multiple Terminals
- Terminal 1: `claude-code` for backend
- Terminal 2: Different AI tool for frontend (Cursor, Windsurf, etc.)
- **Cost**: $20-40/month
- **Setup**: 10 minutes

### Option 3: API Automation (Advanced)
```bash
# Run agents via API calls
# See AI_AGENT_PARALLEL_DEVELOPMENT.md for examples
```

---

## 🎯 Your First Test Run (30 min)

Let's build a simple feature to test the workflow:

### Feature: "Add Shift Notes Field"

**Integration Agent Task:**
```
Define API contract for adding notes to shifts:

1. Add to shared/types/edge-functions.ts:
   - UpdateShiftNotesRequest { shift_id: string, notes: string }
   - UpdateShiftNotesResponse { success: boolean, error?: string }

2. Create validation schema in shared/schemas/shift-notes.ts
   - Validate notes length (max 500 chars)

3. Write test in tests/integration/shift-notes.test.ts
```

**Backend Agent Task:**
```
Add notes field to shifts:

1. Migration: Add 'notes' column to shifts table (TEXT, nullable)

2. Edge function: update-shift-notes
   - Input: UpdateShiftNotesRequest
   - Updates shift notes
   - Validates user has permission

Follow pattern from existing edge functions.
```

**Frontend Agent Task:**
```
Add notes field to Shift UI:

1. Update ShiftTable component (src/components/shifts/ShiftTable.tsx)
   - Add "Notes" column

2. Update ShiftAssignmentModal
   - Add textarea for notes
   - Call update-shift-notes API

Follow existing component patterns.
```

**Expected Result**: Complete feature in 30 minutes with 3 agents working in parallel!

---

## ✅ Quality Checklist

Before merging AI-generated code:
- [ ] **Types match**: Frontend uses same types as backend
- [ ] **No conflicts**: `git merge` works cleanly
- [ ] **Tests pass**: `npm test`
- [ ] **Linting clean**: `npm run lint`
- [ ] **No secrets**: Check for hardcoded API keys
- [ ] **Error handling**: AI agents often forget edge cases
- [ ] **Security**: SQL injection, XSS, etc.

---

## 🚨 Common AI Agent Mistakes

Watch out for:
1. **Hardcoded values**: API keys, secrets in code
2. **Missing error handling**: No try/catch blocks
3. **Breaking existing patterns**: Not following your code style
4. **Unnecessary files**: Creating files that already exist
5. **No validation**: Missing input validation
6. **Security issues**: SQL injection, XSS

**Solution**: Always review code before merging!

---

## 📊 Success Metrics

You'll know it's working when:
- ✅ You ship 3-5x faster than before
- ✅ Merge conflicts are rare (< 1 per week)
- ✅ AI agents don't block each other
- ✅ You spend 80% time reviewing, 20% coding
- ✅ Features ship in hours, not days

---

## 🔄 Daily Workflow

### Morning (30 min):
1. Plan 3-5 features for the day
2. Write prompts for each AI agent
3. Start Integration Agent first
4. Launch Frontend + Backend agents in parallel

### Afternoon (1-2 hours):
1. Review Integration Agent output → commit
2. Review Frontend Agent output → commit
3. Review Backend Agent output → commit
4. Test integrated feature → deploy

### Evening (30 min):
1. Queue overnight tasks for AI agents (optional)
2. Plan tomorrow's features

---

## 📚 Full Documentation

- [PARALLEL_DEVELOPMENT_RESTRUCTURE.md](PARALLEL_DEVELOPMENT_RESTRUCTURE.md) - Complete parallel dev guide
- [AI_AGENT_PARALLEL_DEVELOPMENT.md](AI_AGENT_PARALLEL_DEVELOPMENT.md) - Advanced AI agent strategies
- [ONBOARDING_NEW_TEAM_MEMBERS.md](ONBOARDING_NEW_TEAM_MEMBERS.md) - Onboarding guide (can adapt for AI agents)

---

## 💡 Pro Tips

1. **Start small**: Test with 1-2 small features first
2. **Clear prompts**: Spend 5 extra minutes on prompt clarity → save 30 min on reviews
3. **Templates**: Use prompt templates consistently
4. **Batching**: Queue 3-5 features at once for AI agents
5. **Overnight work**: AI agents don't sleep - use them!
6. **Version control**: Tag AI commits with `(AI-Frontend)`, `(AI-Backend)`, etc.
7. **Iterate**: AI agents improve with better prompts

---

## 🆘 Troubleshooting

**Problem**: AI agents create conflicting code
**Solution**: Ensure they work on different directories. Use `.claudeignore` files.

**Problem**: Types don't match between frontend/backend
**Solution**: Always run Integration Agent first to define contracts.

**Problem**: AI generates insecure code
**Solution**: Add security checklist to prompts. Always review.

**Problem**: Too many merge conflicts
**Solution**: Agents are touching same files. Assign clearer boundaries.

---

## 🎉 Next Steps

1. **Today**: Run setup script + test with simple feature
2. **This week**: Build 3-5 features with AI agents
3. **Next week**: Optimize prompts based on learnings
4. **Month 1**: 5x productivity increase!

---

## Questions?

Read the full guides:
- [AI_AGENT_PARALLEL_DEVELOPMENT.md](AI_AGENT_PARALLEL_DEVELOPMENT.md) - In-depth AI agent guide
- [PARALLEL_DEVELOPMENT_RESTRUCTURE.md](PARALLEL_DEVELOPMENT_RESTRUCTURE.md) - Architecture guide

**Remember**: You're the architect. AI agents are your execution team. 🏗️

Good luck! 🚀
