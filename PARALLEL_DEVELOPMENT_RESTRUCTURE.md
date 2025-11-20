# Parallel Development Restructure Guide

## Goal: Enable 4-Person Team to Work Simultaneously

**Team Structure:**
- **Frontend Engineer** - UI components, pages, user interactions
- **Backend Engineer** - Edge functions, database migrations, business logic
- **UX Designer** - Figma designs, user flows, component specifications
- **Tech Lead/Overseer** - Architecture, reviews, coordination

---

## Phase 1: Shared Type System (CRITICAL - Do This First)

### Step 1A: Auto-Generate TypeScript Types from Supabase

```bash
# Install Supabase CLI (if not already)
npm install -g supabase

# Generate types from your database schema
supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > src/types/supabase-generated.ts
```

### Step 1B: Create Shared Types Package

```
agc_latest3/
├── shared/                          # NEW - Shared types package
│   ├── types/
│   │   ├── entities.ts              # Core entity types (Staff, Shift, Client, etc.)
│   │   ├── api-contracts.ts         # API request/response interfaces
│   │   ├── edge-functions.ts        # Edge function I/O types
│   │   ├── enums.ts                 # Shared enums (ShiftStatus, UserRole, etc.)
│   │   └── index.ts                 # Re-export all types
│   ├── schemas/
│   │   ├── validation.ts            # Zod validation schemas
│   │   └── index.ts
│   ├── constants/
│   │   ├── app-constants.ts         # App-wide constants
│   │   └── index.ts
│   └── package.json                 # Independent package
```

**Create `shared/package.json`:**
```json
{
  "name": "@acg/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

### Step 1C: Define API Contracts (Example)

**File: `shared/types/edge-functions.ts`**
```typescript
// Example: send-sms edge function contract
export interface SendSMSRequest {
  to: string;                    // Phone number in E.164 format
  message: string;               // SMS content (max 1600 chars)
  shift_id?: string;             // Optional: link to shift
  staff_id?: string;             // Optional: link to staff
  client_id?: string;            // Optional: link to client
}

export interface SendSMSResponse {
  success: boolean;
  message_sid?: string;          // Twilio message ID
  error?: string;
}

// Example: shift-reminder-engine
export interface ShiftReminderEngineRequest {
  shift_id?: string;             // Optional: specific shift
  hours_before?: number;         // Default: 24
}

export interface ShiftReminderEngineResponse {
  success: boolean;
  reminders_sent: number;
  failed: number;
  details: Array<{
    shift_id: string;
    staff_name: string;
    sent: boolean;
    error?: string;
  }>;
}

// Add contracts for ALL 53 edge functions
```

### Step 1D: Use Shared Types Everywhere

**Frontend (React):**
```typescript
// src/api/supabaseFunctions.ts
import type { SendSMSRequest, SendSMSResponse } from '@acg/shared/types/edge-functions';

export async function sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
  const response = await supabase.functions.invoke('send-sms', {
    body: request
  });
  return response.data as SendSMSResponse;
}
```

**Backend (Edge Function):**
```typescript
// supabase/functions/send-sms/index.ts
import type { SendSMSRequest, SendSMSResponse } from '../_shared/types.ts';

Deno.serve(async (req) => {
  const body: SendSMSRequest = await req.json();

  // Type safety guaranteed!
  const response: SendSMSResponse = {
    success: true,
    message_sid: '...'
  };

  return new Response(JSON.stringify(response));
});
```

---

## Phase 2: Development Workflow Separation

### 2A: Define Clear Boundaries

| Role | Primary Work Area | Secondary Areas | Communication |
|------|-------------------|-----------------|---------------|
| **Frontend Engineer** | `src/components/`, `src/pages/`, `src/hooks/` | `src/api/` (read-only) | Needs API contract specs |
| **Backend Engineer** | `supabase/functions/`, `supabase/migrations/` | `shared/types/` (update when needed) | Publishes API changes |
| **UX Designer** | Figma, Design specs | `src/components/ui/` (read for implementation status) | Provides component specs |
| **Tech Lead** | Architecture, code reviews | All areas | Approves breaking changes |

### 2B: Git Workflow (Prevents Merge Conflicts)

```bash
# Create feature branches by area
git checkout -b frontend/shift-marketplace-ui
git checkout -b backend/shift-reminder-refactor
git checkout -b ux/new-dashboard-components
```

**Branch Naming Convention:**
- `frontend/*` - Frontend engineer
- `backend/*` - Backend engineer
- `ux/*` - UX implementation
- `shared/*` - Shared type updates (requires review from both FE/BE)

### 2C: Protected Work Areas

**Frontend-only changes** (no backend review needed):
- `src/components/` (except API calls)
- `src/pages/`
- `src/styles/`
- `public/`

**Backend-only changes** (no frontend review needed):
- `supabase/functions/` (if API contract unchanged)
- `supabase/migrations/` (if schema contract unchanged)
- Internal function logic

**Requires cross-team review:**
- `shared/types/` - Any changes to API contracts
- `src/api/` - Changes to API integration layer
- Database schema changes - Frontend needs to know

---

## Phase 3: Tools for Parallel Development

### 3A: Communication & Coordination Tools

**1. Linear / Jira / GitHub Issues**
- Track features by team member
- Dependencies between frontend/backend clearly marked
- Example: "Frontend: Shift Marketplace UI (depends on backend/shift-search-api)"

**2. Loom / Screen Recording**
- Backend engineer records API demo for frontend engineer
- UX designer records interaction flows
- Reduces back-and-forth questions

**3. API Documentation (OpenAPI/Swagger)**
```bash
# Install OpenAPI generator
npm install -g @openapitools/openapi-generator-cli

# Create openapi.yaml for all edge functions
```

**Example `supabase/functions/api-spec.yaml`:**
```yaml
openapi: 3.0.0
info:
  title: ACG StaffLink Edge Functions
  version: 1.0.0
paths:
  /send-sms:
    post:
      summary: Send SMS to staff/client
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                to:
                  type: string
                  example: "+447911123456"
                message:
                  type: string
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message_sid:
                    type: string
```

**4. Figma → React Component Mapping**

UX Designer creates Figma components with naming convention:
- Figma: `Button/Primary/Large`
- React: `<Button variant="primary" size="lg">`

Use **Figma Dev Mode** to export component specs.

### 3B: Local Development Environment Isolation

**Frontend dev can work without Supabase running locally:**
```typescript
// src/api/mockClient.ts (for frontend dev)
export const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => Promise.resolve({ data: MOCK_DATA[table], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
  }),
  functions: {
    invoke: (name: string, params: any) =>
      Promise.resolve({ data: MOCK_RESPONSES[name], error: null })
  }
};
```

**Use environment variable to toggle:**
```typescript
// src/api/supabaseClient.js
const client = import.meta.env.VITE_USE_MOCK === 'true'
  ? mockSupabaseClient
  : createClient(SUPABASE_URL, SUPABASE_KEY);
```

**Backend dev can test edge functions independently:**
```bash
# Run single function locally
supabase functions serve send-sms --env-file .env.local

# Test with curl
curl http://localhost:54321/functions/v1/send-sms \
  -H "Authorization: Bearer <token>" \
  -d '{"to":"+447911123456","message":"Test"}'
```

### 3C: CI/CD Pipeline (Parallel Deployment)

**GitHub Actions workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build frontend
        run: npm run build
      - name: Deploy to Netlify/Vercel
        run: npm run deploy:frontend

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy edge functions
        run: supabase functions deploy --project-ref ${{ secrets.PROJECT_REF }}

  database:
    runs-on: ubuntu-latest
    needs: [frontend, backend]  # Run after others
    steps:
      - name: Run migrations
        run: supabase db push
```

---

## Phase 4: UX Designer Integration

### 4A: Design System as Code

**Create design tokens file:**
```typescript
// src/design-tokens.ts
export const tokens = {
  colors: {
    primary: '#0066FF',
    secondary: '#6B7280',
    success: '#10B981',
    danger: '#EF4444',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    heading1: { size: '32px', weight: 700 },
    heading2: { size: '24px', weight: 600 },
    body: { size: '16px', weight: 400 },
  }
};
```

**UX designer updates this file, frontend engineer uses it:**
```tsx
// src/components/ui/Button.tsx
import { tokens } from '@/design-tokens';

export function Button({ variant = 'primary' }) {
  return (
    <button style={{ backgroundColor: tokens.colors[variant] }}>
      Click me
    </button>
  );
}
```

### 4B: Component Spec Template

UX designer fills out this template in Figma or Notion:

```markdown
## Component: ShiftMarketplaceCard

**Purpose**: Display available shift in marketplace

**Props:**
- `shift_id` (string) - Required
- `client_name` (string)
- `start_time` (string) - HH:MM format
- `end_time` (string) - HH:MM format
- `rate` (number) - Hourly rate
- `distance` (number) - Miles from user location
- `onApply` (function) - Callback when "Apply" clicked

**States:**
- Default
- Hover
- Applied (disabled)
- Loading

**Design:**
[Figma link]

**Implementation Notes:**
- Use `<Card>` component from `src/components/ui/Card.tsx`
- Distance should show "< 1 mile" if < 1
- Rate should show "£X.XX/hr"
```

Frontend engineer implements exactly to spec.

---

## Phase 5: Realistic Example Workflow

### Scenario: New Feature "Staff Shift Preferences"

**Week 1: Planning**
- **Tech Lead**: Creates epic "Staff Shift Preferences" with 4 tasks
- **UX Designer**: Creates Figma designs for preferences UI
- **Backend Engineer**: Reviews database schema needs
- **Frontend Engineer**: Reviews required API endpoints

**Week 2: Parallel Development**

**Monday:**
- **Backend**: Creates migration `add_staff_preferences_table.sql`
- **Backend**: Updates `shared/types/entities.ts` with `StaffPreference` type
- **UX**: Finalizes component specs for `PreferencesForm.tsx`
- **Frontend**: Waits for API contract spec

**Tuesday:**
- **Backend**: Implements `get-staff-preferences` edge function
- **Backend**: Updates `shared/types/edge-functions.ts` with function contract
- **Frontend**: Reads contract, starts building UI with mock data
- **UX**: Reviews component implementation, provides feedback

**Wednesday:**
- **Backend**: Completes `update-staff-preferences` edge function
- **Frontend**: Integrates real API, replaces mocks
- **UX**: Conducts user testing on staging
- **Tech Lead**: Code review for both frontend and backend PRs

**Thursday:**
- **Backend**: Fixes bugs from code review
- **Frontend**: Implements UX feedback
- **Tech Lead**: Approves both PRs

**Friday:**
- **All**: Merge to main
- **CI/CD**: Automatically deploys frontend + backend
- **All**: Test on production

**Total**: Feature shipped in 1 week with 4 people working in parallel!

---

## Quick Start: What to Do Right Now

### Immediate Actions (This Week):

1. **Generate Supabase types** (15 minutes)
```bash
supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > src/types/supabase.ts
```

2. **Create shared types folder** (30 minutes)
```bash
mkdir -p shared/types
# Create API contract file for your top 10 most-used edge functions
```

3. **Document one edge function fully** (1 hour)
   - Pick `send-sms` or `send-email`
   - Write TypeScript interface for request/response
   - Add JSDoc comments explaining parameters
   - Share with team as example

4. **Set up branch protection rules** (15 minutes)
   - `main` requires 1 approval
   - `shared/*` branches require approval from both FE and BE lead

5. **Create project board** (30 minutes)
   - Use GitHub Projects or Linear
   - Columns: Backlog, Design, Frontend, Backend, Review, Done
   - Tag each task with owner

### Next Week:

1. **Convert 5 more edge functions** to use typed contracts
2. **Create mock data layer** for frontend development
3. **Set up Storybook** for component development in isolation
4. **Write contributing guide** with workflow explanation

---

## Tools Checklist

- [ ] **GitHub Projects** or **Linear** - Task management
- [ ] **Figma** - Design collaboration
- [ ] **Storybook** - Component development
- [ ] **OpenAPI/Swagger** - API documentation
- [ ] **Zod** - Runtime validation (matches TypeScript types)
- [ ] **Prettier** - Code formatting (prevent merge conflicts)
- [ ] **ESLint** - Linting (shared config)
- [ ] **Husky** - Pre-commit hooks (run tests before commit)
- [ ] **Conventional Commits** - Commit message format
- [ ] **Changesets** - Version management

---

## Success Metrics

You'll know parallel development is working when:

✅ Frontend engineer can build UI without waiting for backend
✅ Backend engineer can refactor functions without breaking frontend
✅ UX designer can see components in Storybook without running full app
✅ Merge conflicts are rare (< 1 per week)
✅ Feature development time decreases by 50%
✅ Team members don't block each other

---

## Common Pitfalls to Avoid

❌ **Don't**: Make breaking API changes without versioning
✅ **Do**: Version your APIs (`/v1/send-sms`) or use feature flags

❌ **Don't**: Have frontend and backend in same PR
✅ **Do**: Separate PRs with dependency chain

❌ **Don't**: Let type definitions drift from implementation
✅ **Do**: Generate types automatically where possible

❌ **Don't**: Skip documentation "to move faster"
✅ **Do**: Document as you code (JSDoc comments)

❌ **Don't**: Have UX designer work in isolation
✅ **Do**: Weekly sync with designers to review component implementation

---

## Questions?

Read more:
- [Monorepo setup with Turborepo](https://turbo.build/repo/docs)
- [OpenAPI specification](https://swagger.io/specification/)
- [Zod validation](https://zod.dev/)
- [Storybook for React](https://storybook.js.org/docs/react/get-started/introduction)

Next steps: Start with shared types, then add tooling incrementally.
