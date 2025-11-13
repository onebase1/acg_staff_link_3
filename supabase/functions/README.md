# Supabase Edge Functions - Development Guide

## 🎯 Strategic Error Handling

### Why Am I Seeing Errors?

Supabase Edge Functions run on **Deno runtime** (not Node.js), which uses:
- Direct URL imports (e.g., `https://deno.land/std@0.168.0/http/server.ts`)
- Deno global APIs
- Different module resolution

Your IDE shows errors because it's configured for Node.js by default.

---

## ✅ Quick Fix: Install Deno Extension

### Step 1: Install Deno Extension for VSCode

1. Open VSCode Extensions (Ctrl+Shift+X)
2. Search for **"Deno"** by Denoland
3. Click **Install**

### Step 2: Reload VSCode

After installing, reload your VSCode window:
- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Press Enter

**✨ All Deno errors should now disappear!**

---

## 📁 Configuration Files Added

I've created the following configuration files:

### 1. `.vscode/settings.json`
- Enables Deno for `./supabase/functions` folder
- Configures Deno linting and formatting
- Allows Deno URL imports

### 2. `supabase/functions/deno.json`
- Deno project configuration
- TypeScript compiler options
- Linting and formatting rules

### 3. `supabase/functions/_shared/types.ts`
- Common TypeScript types for Edge Functions
- Response helpers
- Validation types

---

## 🛠️ Development Workflow

### Testing Functions Locally

```bash
# Start Supabase locally
npx supabase start

# Test a specific function
npx supabase functions serve critical-change-notifier

# Deploy a function
npx supabase functions deploy critical-change-notifier
```

### Common Patterns

#### 1. Import Supabase Client
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);
```

#### 2. Use Shared Types
```typescript
import type { ValidationIssue, Severity } from '../_shared/types.ts';
import { createSuccessResponse, createErrorResponse } from '../_shared/types.ts';

const issues: ValidationIssue[] = [{
  severity: 'critical',
  timesheet_id: 'abc123',
  issue: 'Missing signature',
  message: 'Timesheet requires client signature'
}];

return createSuccessResponse(issues);
```

#### 3. Handle Errors Gracefully
```typescript
try {
  const { data, error } = await supabase
    .from('timesheets')
    .select('*');

  if (error) throw error;

  return createSuccessResponse(data);
} catch (error) {
  console.error('Function error:', error);
  return createErrorResponse(error.message, 500);
}
```

---

## 🚫 Suppressing Remaining Errors (Optional)

If you still see some TypeScript errors after installing Deno extension:

### Option 1: Add Type Assertions
```typescript
// Instead of this (may show error):
const issues = [];

// Do this (explicit type):
const issues: ValidationIssue[] = [];
```

### Option 2: Create Type Declaration File
```typescript
// functions/_shared/global.d.ts
declare const Deno: any;
```

### Option 3: Ignore Specific Lines
```typescript
// @ts-ignore: Deno-specific API
const hostname = Deno.hostname();
```

---

## 📦 Type Definitions Available

### ValidationIssue
```typescript
interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  timesheet_id?: string;
  shift_id?: string;
  issue: string;
  message: string;
}
```

### SupabaseResponse
```typescript
interface SupabaseResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
```

---

## 🎯 Best Practices

1. **Always use explicit types** for function parameters
2. **Import types from `_shared/types.ts`** for consistency
3. **Use helper functions** (`createSuccessResponse`, `createErrorResponse`)
4. **Test locally** before deploying
5. **Handle errors gracefully** with try-catch blocks
6. **Log important events** for debugging

---

## 🔍 Troubleshooting

### "Cannot find module 'Deno'"
- Install Deno extension for VSCode
- Reload VSCode window

### "Property 'severity' does not exist"
- Import types from `_shared/types.ts`
- Add explicit type annotations

### "Argument of type X is not assignable to Y"
- Check function parameter types
- Ensure you're using correct types from `_shared/types.ts`

---

## 📚 Resources

- [Deno Manual](https://deno.land/manual)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)

---

**Need Help?** Check the [SIMPLE_FIX_GUIDE.md](../../SIMPLE_FIX_GUIDE.md) in the root directory.
