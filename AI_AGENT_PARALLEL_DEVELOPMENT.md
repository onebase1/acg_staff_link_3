# AI Agent Parallel Development Guide

## Your Team: You + 3 AI Agents

This guide shows how to orchestrate multiple AI agents (Claude, GPT-4, Cursor, etc.) to work in parallel on different parts of your codebase **without stepping on each other's toes**.

---

## The AI Team Structure

### Agent #1: Frontend Agent
**Role**: UI components, pages, styling
**Tools**: Cursor, Claude Code, or GPT-4 with Code Interpreter
**Works on**: `src/components/`, `src/pages/`, `src/styles/`
**Never touches**: `supabase/functions/`, `supabase/migrations/`

### Agent #2: Backend Agent
**Role**: Edge functions, database logic, automation
**Tools**: Claude Code, Cursor AI, or GitHub Copilot Workspace
**Works on**: `supabase/functions/`, `supabase/migrations/`
**Never touches**: `src/` frontend code

### Agent #3: Integration Agent
**Role**: API contracts, type definitions, testing, documentation
**Tools**: Claude or GPT-4 for structured output
**Works on**: `shared/types/`, `tests/`, documentation
**Never touches**: Implementation files

### You: Orchestrator + Code Reviewer
**Role**: Define tasks, review AI output, merge code, fix conflicts
**Focus**: Architecture decisions, code review, deployment

---

## How to Divide Work for Parallel AI Agents

### Example: Implement "Staff Shift Preferences" Feature

#### Your Prompt to Each Agent (in separate conversations):

**Frontend Agent Prompt:**
```
I'm building a Staff Shift Preferences feature. I need you to create the UI components.

CONTEXT:
- We use React 18 + TailwindCSS + Shadcn UI
- Component location: src/components/preferences/
- API contract is already defined in shared/types/edge-functions.ts

YOUR TASK (DO NOT TOUCH BACKEND):
1. Read shared/types/edge-functions.ts for API contract
2. Create PreferencesForm.tsx component with these fields:
   - Preferred shift times (checkboxes: Morning, Afternoon, Night)
   - Preferred days (checkboxes: Mon-Sun)
   - Max distance willing to travel (slider: 0-50 miles)
   - Preferred hourly rate (min: £15/hr)
3. Create useStaffPreferences.ts hook to call the API
4. Add to src/pages/StaffProfile.tsx page

CONSTRAINTS:
- Use existing UI components from src/components/ui/
- Mock the API responses for now (backend being built separately)
- Follow existing component patterns in src/components/shifts/

OUTPUT:
- List all files you created/modified
- Provide git commands to commit your changes
```

**Backend Agent Prompt:**
```
I'm building a Staff Shift Preferences feature. I need you to create the backend logic.

CONTEXT:
- We use Supabase Edge Functions (Deno/TypeScript)
- Database: PostgreSQL with RLS policies
- API contracts are defined in shared/types/edge-functions.ts

YOUR TASK (DO NOT TOUCH FRONTEND):
1. Create database migration: supabase/migrations/add_staff_preferences.sql
   - Table: staff_preferences
   - Columns: staff_id, preferred_times[], preferred_days[], max_distance, min_rate
   - RLS policies: Users can only update their own preferences

2. Create edge function: supabase/functions/get-staff-preferences/index.ts
   - Input: { staff_id: string }
   - Output: StaffPreferences object
   - Validates user can access this staff_id

3. Create edge function: supabase/functions/update-staff-preferences/index.ts
   - Input: UpdateStaffPreferencesRequest
   - Output: Success/error response
   - Validates preferences data

CONSTRAINTS:
- Follow existing patterns in supabase/functions/send-sms/
- Use types from shared/types/edge-functions.ts
- Include error handling for all edge cases

OUTPUT:
- List all files you created
- SQL to run migration
- How to deploy and test functions
```

**Integration Agent Prompt:**
```
I'm building a Staff Shift Preferences feature. Two other AI agents are building frontend and backend separately.

YOUR TASK:
1. Define TypeScript interfaces in shared/types/edge-functions.ts:
   - GetStaffPreferencesRequest
   - GetStaffPreferencesResponse
   - UpdateStaffPreferencesRequest
   - UpdateStaffPreferencesResponse

2. Create validation schemas in shared/schemas/preferences.ts using Zod:
   - Validate preferred_times array
   - Validate max_distance (0-100 miles)
   - Validate min_rate (>= £10/hr)

3. Create integration test in tests/preferences.test.ts:
   - Test API contract between frontend and backend
   - Mock both sides

4. Update documentation in docs/api/preferences.md

CONSTRAINTS:
- Do not implement frontend or backend code
- Only define contracts and tests
- Use existing patterns from shared/types/

OUTPUT:
- All type definitions
- Validation schemas
- Test file
- Documentation
```

---

## Orchestration Workflow

### Step 1: Define Contracts First (Integration Agent)

**You**: Run Integration Agent **first** to define the API contract.

**Wait for**: Integration Agent to finish and provide:
- `shared/types/edge-functions.ts` (updated)
- `shared/schemas/preferences.ts` (new)

**You do**: Review and commit these files to `main` branch.

### Step 2: Parallel Development (Frontend + Backend Agents)

**Now run Frontend and Backend agents in parallel** (separate conversations/windows).

Both agents can work simultaneously because:
- ✅ They have the contract from Integration Agent
- ✅ They work on different directories
- ✅ They won't create merge conflicts

**Wait for**: Both agents to finish.

**You get**:
- Frontend Agent: React components + hooks
- Backend Agent: Database migration + edge functions

### Step 3: Review and Integrate (You)

```bash
# Create separate branches for each agent's work
git checkout -b frontend-agent-preferences
# Apply frontend agent changes
git add src/
git commit -m "feat: Staff preferences UI (AI-generated)"

git checkout main
git checkout -b backend-agent-preferences
# Apply backend agent changes
git add supabase/
git commit -m "feat: Staff preferences backend (AI-generated)"

# Merge both to main
git checkout main
git merge frontend-agent-preferences
git merge backend-agent-preferences
# No conflicts because they touched different files!
```

### Step 4: Test Integration (You or Integration Agent)

Run integration tests to verify frontend and backend work together.

---

## Tools for AI Agent Orchestration

### Option 1: Cursor AI Composer (Multi-Agent Mode)
- Open multiple Cursor windows
- Each window = one agent
- Use "Command Palette > Add Folder to Workspace" to restrict access

**Setup:**
```
Window 1 (Frontend Agent):
- Restrict to: src/

Window 2 (Backend Agent):
- Restrict to: supabase/

Window 3 (Integration Agent):
- Restrict to: shared/, tests/, docs/
```

### Option 2: Claude Code + Windsurf
- Claude Code for backend (edge functions)
- Windsurf for frontend (React components)
- Both running simultaneously in different terminals

### Option 3: Multi-Agent Frameworks

**Crew AI (Python)**
```python
from crewai import Agent, Task, Crew

frontend_agent = Agent(
    role='Frontend Developer',
    goal='Build React components',
    tools=['read_file', 'write_file'],
    constraints=['Only modify files in src/']
)

backend_agent = Agent(
    role='Backend Developer',
    goal='Build Supabase edge functions',
    tools=['read_file', 'write_file'],
    constraints=['Only modify files in supabase/']
)

integration_agent = Agent(
    role='Integration Specialist',
    goal='Define API contracts and tests',
    tools=['read_file', 'write_file'],
    constraints=['Only modify shared/ and tests/']
)

crew = Crew(
    agents=[frontend_agent, backend_agent, integration_agent],
    tasks=[define_contracts, build_frontend, build_backend],
    process='sequential'  # Contracts first, then parallel
)

result = crew.kickoff()
```

**AutoGPT / BabyAGI**
- Define task breakdown
- Each subtask assigned to specialized agent
- Agents work in parallel on independent tasks

**Langchain Agents**
```typescript
import { AgentExecutor } from "langchain/agents";

const frontendAgent = new AgentExecutor({
  tools: [readFileTool, writeFileTool],
  constraints: ["Only modify src/ directory"],
});

const backendAgent = new AgentExecutor({
  tools: [readFileTool, writeFileTool],
  constraints: ["Only modify supabase/ directory"],
});

// Run in parallel
Promise.all([
  frontendAgent.run("Build preferences UI"),
  backendAgent.run("Build preferences API")
]);
```

### Option 4: Simple Shell Scripts (My Recommendation)

Create a script to run agents in parallel:

**File: `run-ai-agents.sh`**
```bash
#!/bin/bash

# Step 1: Integration Agent defines contracts
echo "🤖 Running Integration Agent..."
claude-code --prompt "$(cat prompts/integration-agent-preferences.txt)" \
  --output "integration-agent-output.md"

# Wait for human review
echo "✋ Review integration-agent-output.md and press Enter to continue..."
read

# Step 2: Run Frontend and Backend agents in parallel
echo "🤖 Running Frontend Agent (parallel)..."
claude-code --prompt "$(cat prompts/frontend-agent-preferences.txt)" \
  --output "frontend-agent-output.md" &

echo "🤖 Running Backend Agent (parallel)..."
claude-code --prompt "$(cat prompts/backend-agent-preferences.txt)" \
  --output "backend-agent-output.md" &

# Wait for both to finish
wait

echo "✅ All agents finished! Review outputs and merge changes."
```

---

## Preventing AI Agent Conflicts

### 1. Directory-Based Separation (Most Important!)

**Create `.claudeignore` for each agent:**

**Frontend Agent: `.claudeignore.frontend`**
```
supabase/
tests/
docs/
*.sql
```

**Backend Agent: `.claudeignore.backend`**
```
src/
public/
*.jsx
*.tsx
```

**Integration Agent: `.claudeignore.integration`**
```
src/components/
src/pages/
supabase/functions/
```

### 2. Explicit Constraints in Prompts

Always tell agents what they **cannot** touch:

```
CRITICAL CONSTRAINTS:
- DO NOT modify any files outside of src/components/
- DO NOT create database migrations
- DO NOT modify API contracts in shared/types/
- DO NOT touch backend edge functions
```

### 3. Atomic Tasks

Give each agent **one clear deliverable**:
- ✅ "Build PreferencesForm component"
- ❌ "Build the entire preferences feature" (too broad)

### 4. Pre-Commit Validation

**File: `.git/hooks/pre-commit`**
```bash
#!/bin/bash

# Prevent frontend files from being committed with backend files
if git diff --cached --name-only | grep -q "^src/" && \
   git diff --cached --name-only | grep -q "^supabase/"; then
  echo "❌ ERROR: Cannot commit frontend and backend changes together!"
  echo "Split into separate commits."
  exit 1
fi
```

---

## Example: Full AI Agent Workflow

### Feature: "Daily Shift Digest Email"

**Phase 1: You Define the Task**
```markdown
# Task: Daily Shift Digest Email

## Description
Send staff a daily email at 6 AM with:
- Shifts assigned to them today
- Pending shift applications
- Upcoming compliance deadlines

## Deliverables
1. Backend: Scheduled edge function (cron job)
2. Backend: Email template rendering
3. Shared: API types
4. Tests: Integration tests
5. Docs: Feature documentation

## Agents Assignment
- Integration Agent: API types + tests
- Backend Agent: Edge function + cron
- (No frontend needed for this feature)
```

**Phase 2: Integration Agent (10 minutes)**

Prompt:
```
Define TypeScript types for Daily Shift Digest feature.

TASK:
1. In shared/types/edge-functions.ts, add:
   - DailyShiftDigestRequest
   - DailyShiftDigestResponse
   - DigestContentItem interface

2. Define email template structure

3. Create test fixtures in tests/fixtures/digest-data.ts

OUTPUT: Complete type definitions and test data
```

**Phase 3: Backend Agent (30 minutes)**

Prompt:
```
Implement Daily Shift Digest Email backend.

TASK:
1. Create supabase/functions/daily-shift-digest/index.ts
   - Query shifts for today per staff member
   - Query pending applications
   - Query expiring compliance
   - Render email HTML
   - Send via send-email function

2. Add cron job in supabase/migrations/add_daily_digest_cron.sql:
   - Schedule: 0 6 * * * (6 AM daily)

3. Use types from shared/types/edge-functions.ts

CONSTRAINTS:
- Use existing send-email function
- Follow pattern from shift-reminder-engine
- Include unsubscribe link

OUTPUT: Function code + migration SQL
```

**Phase 4: You Review & Deploy (15 minutes)**

```bash
# Review integration agent output
cat integration-agent-output.md
git add shared/types/
git commit -m "types: Add daily digest types (AI)"

# Review backend agent output
cat backend-agent-output.md
git add supabase/
git commit -m "feat: Daily shift digest email (AI)"

# Deploy
supabase db push
supabase functions deploy daily-shift-digest

# Test manually
supabase functions invoke daily-shift-digest --body '{}'
```

**Total Time**: 1 hour (vs. 4-6 hours if you built it manually!)

---

## Advanced: 24/7 AI Development

Since AI agents don't sleep, you can queue work overnight:

**File: `overnight-tasks.sh`**
```bash
#!/bin/bash

# Run at 11 PM before you sleep
echo "🌙 Starting overnight AI agents..."

# Task 1: Refactor shift components (2 hours)
nohup claude-code --prompt "$(cat prompts/refactor-shifts.txt)" \
  --output "overnight-refactor.md" &

# Task 2: Add tests for all edge functions (3 hours)
nohup claude-code --prompt "$(cat prompts/add-tests.txt)" \
  --output "overnight-tests.md" &

# Task 3: Generate API documentation (1 hour)
nohup claude-code --prompt "$(cat prompts/generate-docs.txt)" \
  --output "overnight-docs.md" &

echo "✅ AI agents running in background. Check outputs in morning!"
```

Wake up to completed work! ☕

---

## Verification Checklist

After AI agents complete work, always verify:

- [ ] **Types match**: Frontend uses same types as backend
- [ ] **No conflicts**: Git merge works cleanly
- [ ] **Tests pass**: Run `npm test` and `supabase test`
- [ ] **Linting clean**: `npm run lint`
- [ ] **No hardcoded values**: Check for API keys, secrets
- [ ] **Error handling**: AI agents often forget edge cases
- [ ] **Security**: Check for SQL injection, XSS, etc.

**Common AI Agent Mistakes:**
1. Hardcoding API keys in code
2. Missing error handling
3. Not following existing patterns
4. Creating unnecessary files
5. Breaking existing tests

Always review before merging!

---

## Tools Summary

| Tool | Best For | Cost | Setup Time |
|------|----------|------|------------|
| **Cursor Composer** | Multi-window parallel editing | $20/mo | 5 min |
| **Claude Code + Windsurf** | Backend + Frontend separation | $20-40/mo | 10 min |
| **CrewAI (Python)** | Fully automated multi-agent | Free | 1 hour |
| **Shell Scripts + Claude API** | Custom orchestration | Pay-per-use | 2 hours |
| **GitHub Copilot Workspace** | Task-based multi-file edits | $10/mo | 5 min |

**My Recommendation**: Start with **Cursor Composer** (easiest) or **shell scripts** (most control).

---

## Next Steps

1. **Today**: Set up shared types structure
   ```bash
   chmod +x setup-parallel-dev.sh
   ./setup-parallel-dev.sh
   ```

2. **This Week**: Test with simple feature
   - Pick one small feature (e.g., "Add shift notes field")
   - Divide between 2 AI agents (frontend + backend)
   - Review and merge

3. **Next Week**: Optimize workflow
   - Create prompt templates
   - Set up automated verification
   - Measure time savings

4. **Month 1**: Scale to 3+ agents
   - Add testing agent
   - Add documentation agent
   - Queue overnight work

---

## Success Story Example

**Before AI Agents**:
- You: 8 hours/day coding
- Ship 2-3 features/week
- Always context switching
- Burned out

**After AI Agents** (You + 3 Agents):
- You: 2 hours/day reviewing + deploying
- AI Agents: 20 hours/day coding (across 3 agents)
- Ship 10-15 features/week
- You focus on architecture + product

**Result**: 5x productivity increase! 🚀

---

## Questions?

**Q: Will AI agents create bugs?**
A: Yes, but so do humans. The key is thorough review and testing. Use strict types and validation.

**Q: How do I know which agent did what?**
A: Use `git commit -m "feat: X (AI-Frontend)"` to tag AI-generated commits.

**Q: Can AI agents handle complex features?**
A: Yes, but break into small tasks. AI is better at focused tasks than huge features.

**Q: What if agents create conflicting code?**
A: That's why we use directory separation and clear constraints. Conflicts are rare if you follow the workflow.

**Q: Is this ethical/safe?**
A: Yes. You're the code reviewer and decision maker. AI agents are tools, not replacements.

---

## Final Thoughts

With **you + 3 AI agents**, your codebase becomes:
- ✅ Faster to develop
- ✅ More consistent (AI follows patterns)
- ✅ Better documented (AI writes docs)
- ✅ More tested (AI generates tests)

**The key**: Treat AI agents like junior developers. Give clear instructions, review their work, and iterate.

**You remain the architect.** AI agents are your execution team. 🏗️

Good luck building! 🚀
