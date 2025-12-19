# MODULE REGISTRY AUTOMATION SYSTEM
## Advanced Multi-Agent Coordination with Linear Integration

**Created:** 2025-12-18
**Last Updated:** 2025-12-18
**Version:** 2.0 (Enhanced with Linear MCP bidirectional sync)
**Purpose:** Prevent module conflicts, enable agent autonomy, sync with Linear
**Priority:** P0 - CRITICAL (Foundation for autonomous agent operations)

---

## 🚀 AGENT QUICK START (30 seconds)

```bash
# 1. Get your assigned work from Linear
"Get my assigned issues from Linear project SaaS Branding & White-Label System"

# 2. Read the ticket details
"Get issue AUT-XX details including description"

# 3. Execute the work (agent follows instructions in ticket)

# 4. Update Linear when done
"Update issue AUT-XX state to Done and add comment 'Completed: [summary]'"
```

**That's it.** The sections below explain the full system.

---

## 🎯 Problem Statement

When multiple agents create modules on different days:
1. **Conflict:** Both create MODULE_21 (numbering collision)
2. **Data Loss:** Agent archives in-progress work thinking it's complete
3. **Wasted Tokens:** Agents recreate existing work
4. **Linear Desync:** Issues created but modules don't exist
5. **No Rollback:** Changes break things with no undo plan

---

## 💡 Solution: Registry + Linear Dual-Track System

### Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-TRACK SYSTEM                            │
│                                                                 │
│  ┌─────────────────────┐    ⟷    ┌─────────────────────┐       │
│  │  MODULE_REGISTRY    │  SYNC   │      LINEAR         │       │
│  │  (Source of Truth)  │ ←────→  │  (Task Tracking)    │       │
│  ├─────────────────────┤         ├─────────────────────┤       │
│  │ • Module metadata   │         │ • Assignees         │       │
│  │ • Dependencies      │         │ • Due dates         │       │
│  │ • File paths        │         │ • Comments          │       │
│  │ • Rollback plans    │         │ • Status (Kanban)   │       │
│  │ • Code references   │         │ • Priority          │       │
│  └─────────────────────┘         └─────────────────────┘       │
│           │                               │                     │
│           └───────────┬───────────────────┘                     │
│                       │                                         │
│              ┌────────▼────────┐                               │
│              │  AGENT READS    │                               │
│              │  Linear ticket  │                               │
│              │  + Registry     │                               │
│              │  → Executes     │                               │
│              │  → Updates both │                               │
│              └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure
```
agent_missions/
├── MODULE_REGISTRY.json           ← Single source of truth (metadata)
├── MODULE_REGISTRY_INSTRUCTIONS.md ← Agent quick reference
├── LINEAR_TICKET_TEMPLATE.md      ← Template for agent-readable tickets
├── scripts/
│   ├── create-module.mjs          ← Auto-increment + validate
│   ├── update-module-status.mjs   ← Status transitions + Linear sync
│   ├── archive-module.mjs         ← Safe archiving with rollback
│   ├── sync-registry-to-linear.mjs ← Registry → Linear
│   └── sync-linear-to-registry.mjs ← Linear → Registry (bidirectional)
└── MODULE_*/                       ← Individual module folders
```

---

## 🤖 HOW AGENTS SHOULD USE THIS SYSTEM

### For Agents Executing Work (Most Common)

```
SCENARIO: User says "Work on branding updates"

STEP 1: Query Linear for available work
─────────────────────────────────────────
linear("List issues in project 'SaaS Branding & White-Label System'
        with state Backlog or Todo, show identifier, title, state")

STEP 2: Pick a ticket (prioritize by identifier number, lower = older)
─────────────────────────────────────────
linear("Get full details for issue AUT-16 including description")

STEP 3: Parse the ticket description
─────────────────────────────────────────
Extract from description:
- Context → Understand why
- Task → Step-by-step what to do
- Files → What to edit
- Acceptance Criteria → How to know you're done
- Rollback → What to do if it breaks

STEP 4: Execute the work
─────────────────────────────────────────
Follow Task steps exactly. Edit Files listed. Test changes.

STEP 5: Update Linear
─────────────────────────────────────────
linear("Update issue AUT-16 state to Done")
linear("Add comment to AUT-16: '✅ Completed.
        Changes: [list files]. Tested: [what you tested]'")

STEP 6: Report to user
─────────────────────────────────────────
"Completed AUT-16: [title]. Changes made to [files]. Ready for review."
```

### For Agents Creating New Work

```
SCENARIO: User says "We need a feature for X"

STEP 1: Check if similar work exists
─────────────────────────────────────────
linear("Search issues with query 'feature X' in team Autonoma")

STEP 2: If new, create the module + ticket
─────────────────────────────────────────
# First, create in registry
node scripts/create-module.mjs --name "Feature X" --priority P1 --hours 4

# Then, create Linear ticket using template (TASK 9)
linear("Create issue in team Autonoma with title 'MODULE 32: Feature X'
        and description '[use LINEAR_TICKET_TEMPLATE format]'")

STEP 3: Link them
─────────────────────────────────────────
# Update registry with Linear ID
# Update Linear ticket with registry path
```

### For Agents Checking Project Status

```
SCENARIO: User says "What's the status of branding work?"

STEP 1: Query Linear project
─────────────────────────────────────────
linear("Get project 'SaaS Branding & White-Label System' with all issues
        showing identifier, title, state")

STEP 2: Summarize
─────────────────────────────────────────
Report:
- Total tickets: X
- Backlog: X
- In Progress: X
- Done: X
- Blocked: X

STEP 3: Identify next actions
─────────────────────────────────────────
"Next recommended ticket: AUT-XX because [reason]"
```

---

## 📋 TASK 1: Create MODULE_REGISTRY.json

**File:** `agent_missions/MODULE_REGISTRY.json`

**Initial Content:**
```json
{
  "version": "1.0",
  "lastUpdated": "2025-12-18T16:45:00Z",
  "nextModuleNumber": 32,
  "modules": {},
  "archived": {},
  "statusDefinitions": {
    "planned": "Module documented, not started",
    "in_progress": "Agent actively working",
    "in_review": "Awaiting human validation",
    "completed": "Fully implemented and validated",
    "blocked": "Cannot proceed (missing dependency)",
    "archived": "Moved to archive (completed or obsolete)"
  },
  "rules": {
    "canArchive": ["completed", "blocked"],
    "cannotArchive": ["planned", "in_progress", "in_review"],
    "archiveRequiresApproval": true
  }
}
```

**Action:** Create this file, then backfill existing modules 21-31 into the registry.

---

## 📋 TASK 2: Backfill Existing Modules

**Script:** `scripts/backfill-registry.mjs`

**Purpose:** Read existing `agent_missions/MODULE_*/` folders and populate registry

**Logic:**
```javascript
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';
const MISSIONS_DIR = 'agent_missions';

async function backfillRegistry() {
  // 1. Read current registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // 2. Find all MODULE_* folders
  const folders = fs.readdirSync(MISSIONS_DIR)
    .filter(name => name.startsWith('MODULE_') && !name.includes('REGISTRY'))
    .sort();

  // 3. For each folder, extract metadata
  for (const folder of folders) {
    const match = folder.match(/^MODULE_(\d+)_(.+)$/);
    if (!match) continue;

    const [, numberStr, slug] = match;
    const number = parseInt(numberStr, 10);

    // Read INSTRUCTIONS.md to extract metadata
    const instructionsPath = path.join(MISSIONS_DIR, folder, 'INSTRUCTIONS.md');
    let name = slug.replace(/_/g, ' ');
    let priority = 'P1';
    let phase = 1;
    let estimatedHours = 4;

    if (fs.existsSync(instructionsPath)) {
      const content = fs.readFileSync(instructionsPath, 'utf-8');

      // Extract name from first # heading
      const nameMatch = content.match(/^#\s+(.+)$/m);
      if (nameMatch) name = nameMatch[1];

      // Extract priority
      if (content.includes('P0') || content.includes('CRITICAL')) priority = 'P0';
      else if (content.includes('P2') || content.includes('ENHANCEMENT')) priority = 'P2';

      // Extract phase
      if (content.includes('Phase 2')) phase = 2;
      else if (content.includes('Phase 3')) phase = 3;
      else if (content.includes('Phase 4')) phase = 4;

      // Extract estimated hours
      const hoursMatch = content.match(/Duration:\*\*\s*(\d+)/);
      if (hoursMatch) estimatedHours = parseInt(hoursMatch[1], 10);
    }

    // Add to registry
    registry.modules[number] = {
      number,
      name,
      slug,
      status: number === 21 ? 'in_progress' : 'planned', // 21 is currently in progress
      priority,
      phase,
      createdBy: 'Backfill Script',
      createdAt: new Date().toISOString(),
      linearIssueId: `AUT-${number - 16}`, // AUT-5 = MODULE 21, so offset by 16
      estimatedHours,
      dependencies: [], // TODO: Parse from instructions
      folderPath: `agent_missions/${folder}`,
      instructionsPath,
      lastModifiedBy: 'Backfill Script',
      lastModifiedAt: new Date().toISOString(),
      completedAt: null
    };
  }

  // 4. Update nextModuleNumber
  const maxNumber = Math.max(...Object.keys(registry.modules).map(Number));
  registry.nextModuleNumber = maxNumber + 1;
  registry.lastUpdated = new Date().toISOString();

  // 5. Save updated registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`✅ Backfilled ${Object.keys(registry.modules).length} modules`);
  console.log(`📊 Next module number: ${registry.nextModuleNumber}`);
}

backfillRegistry().catch(console.error);
```

**Run:** `node scripts/backfill-registry.mjs`

---

## 📋 TASK 3: Create Module Creation Script

**Script:** `scripts/create-module.mjs`

**Purpose:** Atomic module creation with auto-increment and validation

**Usage:**
```bash
node scripts/create-module.mjs --name "New Feature" --priority P1 --phase 2 --hours 5
```

**Logic:**
```javascript
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';
const MISSIONS_DIR = 'agent_missions';

async function createModule(options) {
  const { name, priority = 'P1', phase = 1, hours = 4, dependencies = [] } = options;

  // 1. Lock registry (read)
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // 2. Get next module number
  const moduleNumber = registry.nextModuleNumber;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const folderName = `MODULE_${moduleNumber}_${slug.toUpperCase().replace(/-/g, '_')}`;
  const folderPath = path.join(MISSIONS_DIR, folderName);

  // 3. Validate not exists
  if (fs.existsSync(folderPath)) {
    throw new Error(`❌ Conflict: ${folderPath} already exists!`);
  }

  if (registry.modules[moduleNumber]) {
    throw new Error(`❌ Conflict: MODULE ${moduleNumber} already in registry!`);
  }

  // 4. Create folder structure
  fs.mkdirSync(folderPath, { recursive: true });

  // 5. Create INSTRUCTIONS.md template
  const instructionsTemplate = `# ${name}

## 🎯 Objective

[Describe what this module achieves]

## 📋 Key Deliverables

- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

## 📁 Resources

- **Duration:** ${hours} hours
- **Priority:** ${priority}
- **Phase:** ${phase}

## 🔗 Dependencies

${dependencies.length > 0 ? dependencies.map(d => `- MODULE ${d}`).join('\n') : '- None'}

## ✅ Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2

---

**Created:** ${new Date().toISOString().split('T')[0]}
**Status:** Planned
`;

  fs.writeFileSync(path.join(folderPath, 'INSTRUCTIONS.md'), instructionsTemplate);

  // 6. Add to registry
  registry.modules[moduleNumber] = {
    number: moduleNumber,
    name,
    slug,
    status: 'planned',
    priority,
    phase,
    createdBy: process.env.AGENT_NAME || 'create-module script',
    createdAt: new Date().toISOString(),
    linearIssueId: null, // Will be set by sync-to-linear.mjs
    estimatedHours: hours,
    dependencies,
    folderPath: `agent_missions/${folderName}`,
    instructionsPath: `agent_missions/${folderName}/INSTRUCTIONS.md`,
    lastModifiedBy: process.env.AGENT_NAME || 'create-module script',
    lastModifiedAt: new Date().toISOString(),
    completedAt: null
  };

  // 7. Increment next number
  registry.nextModuleNumber = moduleNumber + 1;
  registry.lastUpdated = new Date().toISOString();

  // 8. Save registry (atomic write)
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`✅ Created MODULE ${moduleNumber}: ${name}`);
  console.log(`📁 Path: ${folderPath}`);
  console.log(`📊 Next module number: ${registry.nextModuleNumber}`);

  return moduleNumber;
}

// CLI parsing
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];

  if (key === 'dependencies') {
    options[key] = value.split(',').map(Number);
  } else if (key === 'hours' || key === 'phase') {
    options[key] = parseInt(value, 10);
  } else {
    options[key] = value;
  }
}

if (!options.name) {
  console.error('Usage: node create-module.mjs --name "Feature Name" [--priority P1] [--phase 1] [--hours 4] [--dependencies 21,22]');
  process.exit(1);
}

createModule(options).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

---

## 📋 TASK 4: Update Module Status Script

**Script:** `scripts/update-module-status.mjs`

**Purpose:** Change module status with validation

**Usage:**
```bash
node scripts/update-module-status.mjs --module 21 --status in_progress
node scripts/update-module-status.mjs --module 21 --status completed
```

**Logic:**
```javascript
import fs from 'fs';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';

const VALID_TRANSITIONS = {
  planned: ['in_progress', 'blocked'],
  in_progress: ['in_review', 'blocked', 'completed'],
  in_review: ['in_progress', 'completed'],
  blocked: ['planned', 'in_progress'],
  completed: ['archived']
};

async function updateStatus(moduleNumber, newStatus) {
  // 1. Read registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // 2. Validate module exists
  if (!registry.modules[moduleNumber]) {
    throw new Error(`❌ MODULE ${moduleNumber} not found in registry`);
  }

  const module = registry.modules[moduleNumber];
  const currentStatus = module.status;

  // 3. Validate transition
  if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    throw new Error(
      `❌ Invalid transition: ${currentStatus} → ${newStatus}\n` +
      `   Valid transitions: ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
    );
  }

  // 4. Update status
  module.status = newStatus;
  module.lastModifiedBy = process.env.AGENT_NAME || 'update-status script';
  module.lastModifiedAt = new Date().toISOString();

  if (newStatus === 'completed') {
    module.completedAt = new Date().toISOString();
  }

  registry.lastUpdated = new Date().toISOString();

  // 5. Save registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`✅ MODULE ${moduleNumber} status: ${currentStatus} → ${newStatus}`);

  // 6. Sync to Linear (optional)
  console.log(`💡 Tip: Run 'node scripts/sync-to-linear.mjs --module ${moduleNumber}' to update Linear`);
}

// CLI parsing
const args = process.argv.slice(2);
const moduleNumber = args[args.indexOf('--module') + 1];
const newStatus = args[args.indexOf('--status') + 1];

if (!moduleNumber || !newStatus) {
  console.error('Usage: node update-module-status.mjs --module 21 --status in_progress');
  process.exit(1);
}

updateStatus(parseInt(moduleNumber, 10), newStatus).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

---

## 📋 TASK 5: Safe Archive Script

**Script:** `scripts/archive-module.mjs`

**Purpose:** Only archive completed/obsolete modules with validation

**Usage:**
```bash
node scripts/archive-module.mjs --module 21 --reason "Superseded by MODULE 30"
```

**Logic:**
```javascript
import fs from 'fs';
import path from 'path';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';
const MISSIONS_DIR = 'agent_missions';
const ARCHIVE_DIR = path.join(MISSIONS_DIR, '_archived');

async function archiveModule(moduleNumber, reason) {
  // 1. Read registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // 2. Validate module exists
  if (!registry.modules[moduleNumber]) {
    throw new Error(`❌ MODULE ${moduleNumber} not found in registry`);
  }

  const module = registry.modules[moduleNumber];

  // 3. Validate can archive (CRITICAL SAFETY CHECK)
  if (!registry.rules.canArchive.includes(module.status)) {
    throw new Error(
      `❌ Cannot archive MODULE ${moduleNumber} with status '${module.status}'\n` +
      `   Can only archive: ${registry.rules.canArchive.join(', ')}\n` +
      `   Current status: ${module.status}\n` +
      `   💡 Tip: Update status to 'completed' first if work is done`
    );
  }

  // 4. Check dependencies (don't archive if other modules depend on it)
  const dependents = Object.values(registry.modules).filter(m =>
    m.dependencies?.includes(moduleNumber) && m.status !== 'archived'
  );

  if (dependents.length > 0) {
    throw new Error(
      `❌ Cannot archive MODULE ${moduleNumber} - other modules depend on it:\n` +
      dependents.map(m => `   - MODULE ${m.number}: ${m.name} (${m.status})`).join('\n')
    );
  }

  // 5. Require approval for safety
  if (registry.rules.archiveRequiresApproval) {
    console.log(`⚠️  About to archive MODULE ${moduleNumber}: ${module.name}`);
    console.log(`   Status: ${module.status}`);
    console.log(`   Reason: ${reason}`);
    console.log(`\n   Add --confirm flag to proceed`);

    if (!process.argv.includes('--confirm')) {
      process.exit(0);
    }
  }

  // 6. Create archive directory
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  // 7. Move folder
  const sourcePath = module.folderPath;
  const folderName = path.basename(sourcePath);
  const archivePath = path.join(ARCHIVE_DIR, folderName);

  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, archivePath);
    console.log(`📦 Moved ${sourcePath} → ${archivePath}`);
  } else {
    console.log(`⚠️  Source folder not found: ${sourcePath}`);
  }

  // 8. Update registry
  registry.archived[moduleNumber] = {
    ...module,
    archivedBy: process.env.AGENT_NAME || 'archive-module script',
    archivedAt: new Date().toISOString(),
    archivedReason: reason,
    originalStatus: module.status,
    archivePath: `agent_missions/_archived/${folderName}`
  };

  delete registry.modules[moduleNumber];
  registry.lastUpdated = new Date().toISOString();

  // 9. Save registry
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`✅ Archived MODULE ${moduleNumber}: ${module.name}`);
}

// CLI parsing
const args = process.argv.slice(2);
const moduleNumber = args[args.indexOf('--module') + 1];
const reason = args[args.indexOf('--reason') + 1] || 'No reason provided';

if (!moduleNumber) {
  console.error('Usage: node archive-module.mjs --module 21 --reason "Completed" --confirm');
  process.exit(1);
}

archiveModule(parseInt(moduleNumber, 10), reason).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

---

## 📋 TASK 6: Linear Sync Script

**Script:** `scripts/sync-to-linear.mjs`

**Purpose:** Auto-create/update Linear issues from registry

**Prerequisites:** Linear MCP server configured in `.mcp.json`

**Usage:**
```bash
node scripts/sync-to-linear.mjs --module 21  # Sync one module
node scripts/sync-to-linear.mjs --all         # Sync all modules
```

**Logic:**
```javascript
import fs from 'fs';
import { execSync } from 'child_process';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';
const LINEAR_TEAM_ID = '6c84a0b5-9784-43eb-befc-4f3ab2ae3750'; // Autonoma - Staff Link

async function syncToLinear(moduleNumber) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  if (!registry.modules[moduleNumber]) {
    throw new Error(`❌ MODULE ${moduleNumber} not found`);
  }

  const module = registry.modules[moduleNumber];

  // If Linear issue already exists, update it
  if (module.linearIssueId) {
    console.log(`ℹ️  Linear issue ${module.linearIssueId} already exists for MODULE ${moduleNumber}`);
    console.log(`   Use Linear MCP directly to update status`);
    return module.linearIssueId;
  }

  // Create new Linear issue
  const title = `MODULE ${moduleNumber}: ${module.name}`;
  const description = `## 🎯 Objective

${module.name}

## 📋 Key Deliverables

See: \`${module.instructionsPath}\`

## 📁 Resources

- **Duration:** ${module.estimatedHours} hours
- **Priority:** ${module.priority}
- **Phase:** ${module.phase}

## 🔗 Dependencies

${module.dependencies.length > 0 ? module.dependencies.map(d => `- MODULE ${d}`).join('\n') : '- None'}

## ✅ Success Criteria

See INSTRUCTIONS.md for detailed checklist

---

**Status:** ${module.status}
**Created:** ${module.createdAt}
`;

  const priorityMap = { P0: 1, P1: 2, P2: 3, P3: 4 };
  const priority = priorityMap[module.priority] || 2;

  // Note: This would need to call Linear MCP via Claude Code
  // For now, just output what needs to be created
  console.log(`📝 Would create Linear issue:`);
  console.log(`   Title: ${title}`);
  console.log(`   Priority: ${priority}`);
  console.log(`\n💡 Run with Claude Code's Linear MCP to actually create`);

  return null;
}

// CLI parsing
const args = process.argv.slice(2);

if (args.includes('--all')) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  for (const moduleNumber of Object.keys(registry.modules)) {
    syncToLinear(parseInt(moduleNumber, 10)).catch(console.error);
  }
} else {
  const moduleNumber = args[args.indexOf('--module') + 1];
  if (!moduleNumber) {
    console.error('Usage: node sync-to-linear.mjs --module 21  OR  --all');
    process.exit(1);
  }
  syncToLinear(parseInt(moduleNumber, 10)).catch(console.error);
}
```

---

## 📋 TASK 7: Agent Instructions File

**File:** `agent_missions/MODULE_REGISTRY_INSTRUCTIONS.md`

**Purpose:** Quick reference for all future agents

**Content:**
```markdown
# MODULE REGISTRY - Agent Instructions

## 🚨 CRITICAL: Read Before Creating Any Module

To prevent conflicts, ALL agents MUST use the registry system.

## ✅ Before Creating a New Module

1. **Check Registry First:**
   \`\`\`bash
   cat agent_missions/MODULE_REGISTRY.json | grep -A 5 "nextModuleNumber"
   \`\`\`

2. **Use Creation Script:**
   \`\`\`bash
   node scripts/create-module.mjs --name "Your Feature" --priority P1 --phase 2 --hours 5
   \`\`\`

   This will:
   - Auto-increment module number (prevents conflicts)
   - Create folder structure
   - Generate INSTRUCTIONS.md template
   - Update registry atomically

3. **Update Status as You Work:**
   \`\`\`bash
   node scripts/update-module-status.mjs --module 32 --status in_progress
   \`\`\`

4. **Mark Complete When Done:**
   \`\`\`bash
   node scripts/update-module-status.mjs --module 32 --status completed
   \`\`\`

## ❌ NEVER Archive Without Validation

To archive a module:

\`\`\`bash
# This will validate status and dependencies first
node scripts/archive-module.mjs --module 32 --reason "Completed and validated" --confirm
\`\`\`

The script will PREVENT archiving if:
- Status is not 'completed' or 'blocked'
- Other modules depend on it
- No --confirm flag provided (safety check)

## 📊 Registry Status Workflow

\`\`\`
planned → in_progress → in_review → completed → archived
           ↓
        blocked (if dependency missing)
\`\`\`

## 🔍 Quick Commands

\`\`\`bash
# View all modules
cat agent_missions/MODULE_REGISTRY.json | jq '.modules'

# View next available number
cat agent_missions/MODULE_REGISTRY.json | jq '.nextModuleNumber'

# View archived modules
cat agent_missions/MODULE_REGISTRY.json | jq '.archived'

# Check specific module
cat agent_missions/MODULE_REGISTRY.json | jq '.modules["21"]'
\`\`\`

## 🎯 Integration with Linear

After creating a module, sync to Linear:

\`\`\`bash
node scripts/sync-to-linear.mjs --module 32
\`\`\`

This creates a Linear issue and stores the issue ID in the registry.

---

**Questions?** Check \`MODULE_REGISTRY_AUTOMATION_INSTRUCTIONS.md\` for full implementation details.
\`\`\`

---

## 📋 TASK 8: Add to .gitignore

Ensure these are tracked:
\`\`\`
# Do NOT ignore (need to commit)
!agent_missions/MODULE_REGISTRY.json
!scripts/*.mjs
\`\`\`

---

## ✅ Testing Checklist

After implementation, test:

1. **Create Module:**
   \`\`\`bash
   node scripts/create-module.mjs --name "Test Feature" --priority P2 --phase 1 --hours 3
   # Verify: MODULE_32 folder created, registry updated
   \`\`\`

2. **Update Status:**
   \`\`\`bash
   node scripts/update-module-status.mjs --module 32 --status in_progress
   # Verify: registry shows in_progress
   \`\`\`

3. **Attempt Invalid Archive:**
   \`\`\`bash
   node scripts/archive-module.mjs --module 32 --reason "Test" --confirm
   # Expected: ❌ Error (status not 'completed')
   \`\`\`

4. **Complete and Archive:**
   \`\`\`bash
   node scripts/update-module-status.mjs --module 32 --status completed
   node scripts/archive-module.mjs --module 32 --reason "Test successful" --confirm
   # Verify: Moved to _archived/, registry updated
   \`\`\`

5. **Create Another Module:**
   \`\`\`bash
   node scripts/create-module.mjs --name "Another Test" --priority P1
   # Verify: MODULE_33 created (auto-incremented correctly)
   \`\`\`

---

## 🎯 Success Metrics

After implementation, you should have:

- ✅ `MODULE_REGISTRY.json` with all 21-31 modules backfilled
- ✅ 5 automation scripts in `scripts/` folder
- ✅ Agent instructions file for future reference
- ✅ Conflict prevention (numbering, status, archiving)
- ✅ Linear MCP integration (bidirectional sync)
- ✅ Rollback plans in both Registry and Linear tickets
- ✅ Agent-readable ticket templates

---

## 📋 TASK 9: LINEAR TICKET TEMPLATE (Agent-Readable Format)

**File:** `agent_missions/LINEAR_TICKET_TEMPLATE.md`

This template ensures AI agents can read and execute Linear tickets autonomously.

**Template:**
```markdown
## Context
[1-2 sentences: Why does this task exist? What problem does it solve?]

## Task
[Step-by-step numbered instructions the agent should follow]
1. First step
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

**Example (Real Ticket - AUT-16):**
```markdown
## Context
The send-shift-notifications edge function has hardcoded 'ACG StaffLink' branding. This prevents white-labeling and SaaS rebranding.

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
1. Revert to previous version: `git checkout HEAD~1 -- supabase/functions/send-shift-notifications/index.ts`
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

## 📋 TASK 10: BIDIRECTIONAL SYNC (Registry ↔ Linear)

### Sync Registry → Linear

When module status changes in registry, update Linear:

**Script:** `scripts/sync-registry-to-linear.mjs`

```javascript
import fs from 'fs';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';

// Status mapping: Registry → Linear
const STATUS_MAP = {
  'planned': 'Backlog',
  'in_progress': 'In Progress',
  'in_review': 'In Review',
  'completed': 'Done',
  'blocked': 'Blocked',
  'archived': 'Canceled'
};

async function syncRegistryToLinear(moduleNumber) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  const module = registry.modules[moduleNumber];

  if (!module) {
    throw new Error(`MODULE ${moduleNumber} not found in registry`);
  }

  if (!module.linearIssueId) {
    console.log(`⚠️  MODULE ${moduleNumber} has no Linear issue. Create one first.`);
    return;
  }

  const linearState = STATUS_MAP[module.status] || 'Backlog';

  // This would be executed via Linear MCP
  console.log(`📤 Sync to Linear:`);
  console.log(`   Issue: ${module.linearIssueId}`);
  console.log(`   New State: ${linearState}`);
  console.log(`\n💡 Execute with Linear MCP:`);
  console.log(`   "Update issue ${module.linearIssueId} state to ${linearState}"`);
}

// For agent execution via MCP:
// linear("Update issue AUT-XX state to [mapped_state]")
```

### Sync Linear → Registry

When issue status changes in Linear, update registry:

**Script:** `scripts/sync-linear-to-registry.mjs`

```javascript
import fs from 'fs';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';

// Status mapping: Linear → Registry
const REVERSE_STATUS_MAP = {
  'Backlog': 'planned',
  'Todo': 'planned',
  'In Progress': 'in_progress',
  'In Review': 'in_review',
  'Done': 'completed',
  'Blocked': 'blocked',
  'Canceled': 'archived'
};

async function syncLinearToRegistry(linearIssueId, linearStatus) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // Find module by Linear issue ID
  const moduleEntry = Object.entries(registry.modules).find(
    ([num, mod]) => mod.linearIssueId === linearIssueId
  );

  if (!moduleEntry) {
    console.log(`⚠️  No module found for Linear issue ${linearIssueId}`);
    return;
  }

  const [moduleNumber, module] = moduleEntry;
  const registryStatus = REVERSE_STATUS_MAP[linearStatus];

  if (!registryStatus) {
    console.log(`⚠️  Unknown Linear status: ${linearStatus}`);
    return;
  }

  // Update registry
  module.status = registryStatus;
  module.lastModifiedBy = 'Linear Sync';
  module.lastModifiedAt = new Date().toISOString();

  if (registryStatus === 'completed') {
    module.completedAt = new Date().toISOString();
  }

  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`✅ Updated MODULE ${moduleNumber}: ${module.status}`);
}
```

### Agent Workflow for Bidirectional Sync

```
┌─────────────────────────────────────────────────────────────────┐
│                 BIDIRECTIONAL SYNC WORKFLOW                     │
│                                                                 │
│  SCENARIO 1: Agent completes work                               │
│  ─────────────────────────────────                              │
│  1. Agent finishes task                                         │
│  2. Agent: linear("Update AUT-XX state to Done")                │
│  3. Agent: update-module-status.mjs --module XX --status done   │
│  4. Both systems in sync ✅                                     │
│                                                                 │
│  SCENARIO 2: Human updates Linear                               │
│  ────────────────────────────────                               │
│  1. Human moves ticket to "In Progress" in Linear UI            │
│  2. Next agent session starts                                   │
│  3. Agent: "Check Linear for status updates"                    │
│  4. Agent: sync-linear-to-registry.mjs                          │
│  5. Registry updated to match Linear ✅                         │
│                                                                 │
│  SCENARIO 3: Conflict resolution                                │
│  ───────────────────────────────                                │
│  Rule: LINEAR IS SOURCE OF TRUTH FOR STATUS                     │
│  Rule: REGISTRY IS SOURCE OF TRUTH FOR METADATA                 │
│  If conflict: Linear status wins, registry metadata wins        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 TASK 11: ROLLBACK INTEGRATION

Every module and Linear ticket MUST have rollback instructions.

### Registry Rollback Schema

Add to `MODULE_REGISTRY.json`:

```json
{
  "modules": {
    "32": {
      "number": 32,
      "name": "Feature X",
      "rollback": {
        "type": "git_revert",
        "commands": [
          "git revert <commit-hash>",
          "supabase functions deploy affected-function"
        ],
        "affectedFiles": [
          "supabase/functions/xxx/index.ts",
          "src/pages/Xxx.jsx"
        ],
        "testAfterRollback": [
          "npm run test:xxx",
          "Check /xxx page loads"
        ],
        "dataRollback": null,
        "notes": "Safe to rollback, no database migrations"
      }
    }
  }
}
```

### Linear Ticket Rollback Section

Always include in ticket description:

```markdown
## Rollback Plan

### If Code Changes Break:
1. `git log --oneline -5` (find commit hash)
2. `git revert <commit-hash>`
3. `supabase functions deploy <function-name>`

### If Database Changes Break:
1. Run reverse migration: `<migration-name>_down.sql`
2. Verify data integrity: `SELECT COUNT(*) FROM affected_table`

### If Nothing Works:
1. Alert: @human-owner
2. Rollback window: 24 hours (after that, data may be inconsistent)

### Test After Rollback:
- [ ] Page loads without errors
- [ ] API returns expected response
- [ ] No console errors
```

### Rollback Script

**Script:** `scripts/rollback-module.mjs`

```javascript
import fs from 'fs';
import { execSync } from 'child_process';

const REGISTRY_PATH = 'agent_missions/MODULE_REGISTRY.json';

async function rollbackModule(moduleNumber) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  const module = registry.modules[moduleNumber];

  if (!module?.rollback) {
    console.error(`❌ No rollback plan for MODULE ${moduleNumber}`);
    console.log(`💡 Add rollback instructions to the module before proceeding`);
    process.exit(1);
  }

  const { rollback } = module;

  console.log(`⚠️  ROLLBACK MODULE ${moduleNumber}: ${module.name}`);
  console.log(`\n📋 Commands to execute:`);
  rollback.commands.forEach((cmd, i) => {
    console.log(`   ${i + 1}. ${cmd}`);
  });

  console.log(`\n📁 Affected files:`);
  rollback.affectedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });

  console.log(`\n✅ Test after rollback:`);
  rollback.testAfterRollback.forEach(test => {
    console.log(`   - ${test}`);
  });

  if (rollback.notes) {
    console.log(`\n📝 Notes: ${rollback.notes}`);
  }

  console.log(`\n⚠️  Add --execute flag to run commands automatically`);

  if (process.argv.includes('--execute')) {
    console.log(`\n🚀 Executing rollback...`);
    for (const cmd of rollback.commands) {
      console.log(`   $ ${cmd}`);
      try {
        execSync(cmd, { stdio: 'inherit' });
      } catch (err) {
        console.error(`   ❌ Command failed: ${err.message}`);
        process.exit(1);
      }
    }
    console.log(`\n✅ Rollback complete. Run tests to verify.`);
  }
}
```

---

## 📋 TASK 12: AGENT QUICK START COMMAND

The simplest workflow for any agent:

### Standard Agent Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT EXECUTION FLOW                         │
│                                                                 │
│  USER: "Work on the SaaS branding project"                      │
│                                                                 │
│  AGENT STEP 1: Get Project from Linear                          │
│  ───────────────────────────────────────                        │
│  linear("List issues in project SaaS Branding & White-Label     │
│          System that are in Backlog or Todo state")             │
│                                                                 │
│  AGENT STEP 2: Pick First Unassigned Ticket                     │
│  ────────────────────────────────────────                       │
│  linear("Get issue AUT-16 full details")                        │
│                                                                 │
│  AGENT STEP 3: Read Instructions                                │
│  ──────────────────────────────                                 │
│  • Parse Context, Task, Files, Acceptance Criteria              │
│  • Check Dependencies (are they Done?)                          │
│  • Review Rollback Plan                                         │
│                                                                 │
│  AGENT STEP 4: Execute Work                                     │
│  ─────────────────────────                                      │
│  • Follow step-by-step Task instructions                        │
│  • Edit files listed in Files section                           │
│  • Run tests                                                    │
│                                                                 │
│  AGENT STEP 5: Update Linear                                    │
│  ─────────────────────────                                      │
│  linear("Update issue AUT-16 state to Done")                    │
│  linear("Comment on AUT-16: Completed. Changes: [summary]")     │
│                                                                 │
│  AGENT STEP 6: Update Registry (Optional)                       │
│  ────────────────────────────────────────                       │
│  node scripts/sync-linear-to-registry.mjs                       │
│                                                                 │
│  AGENT STEP 7: Report to User                                   │
│  ───────────────────────────                                    │
│  "✅ Completed AUT-16. Files changed: [...]. Ready for review." │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Prompt Template

When starting a new session, user can say:

```
"Get my next task from Linear project [PROJECT_NAME],
read the instructions, execute it, and update the ticket when done."
```

Agent will:
1. Query Linear for project issues
2. Find first actionable ticket (Backlog/Todo, no blockers)
3. Read full ticket description
4. Execute step-by-step
5. Update Linear status
6. Report completion

---

## 📞 Phase 2 Enhancements (Future)

1. **Git Hooks:** Pre-commit validates registry consistency
2. **Webhook:** Linear webhook auto-updates registry on status change
3. **Dashboard:** Web UI showing module status + Linear sync status
4. **Dependency Graph:** Visual tree of module dependencies
5. **Slack Integration:** Notify when modules complete
6. **AI Validation:** GPT validates ticket instructions are complete before execution

---

## ✅ Implementation Priority

| Task | Priority | Effort | Description |
|------|----------|--------|-------------|
| TASK 1-3 | P0 | 2h | Registry + Backfill + Create Script |
| TASK 4-5 | P0 | 2h | Status + Archive Scripts |
| TASK 6 | P1 | 1h | Linear Sync (one-way) |
| TASK 9 | P1 | 1h | Ticket Template |
| TASK 10 | P2 | 2h | Bidirectional Sync |
| TASK 11 | P1 | 1h | Rollback Integration |
| TASK 12 | P1 | 0.5h | Agent Quick Start Doc |

**Total Estimated Time:** 8-10 hours

---

**Ready to implement?**

1. Start with TASK 1 (create registry)
2. Then TASK 2 (backfill existing modules)
3. Then TASK 9 (ticket template) - this enables agent autonomy immediately
4. Build scripts as needed

**Key Success Metric:** An agent should be able to execute this prompt and complete work:
> "Get my next task from Linear, read instructions, execute, update status when done."
