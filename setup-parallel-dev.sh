#!/bin/bash

# ============================================================================
# Quick Start: Set Up Parallel Development Structure
# Run this script to create the initial shared types structure
# ============================================================================

echo "🚀 Setting up parallel development structure..."

# Step 1: Create shared types directory
echo "📁 Creating shared/ directory structure..."
mkdir -p shared/types
mkdir -p shared/schemas
mkdir -p shared/constants

# Step 2: Generate TypeScript types from Supabase
echo "🔧 Generating TypeScript types from Supabase database..."
if command -v supabase &> /dev/null; then
    supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > shared/types/supabase-generated.ts
    echo "✅ Generated types at shared/types/supabase-generated.ts"
else
    echo "⚠️  Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    echo "   Then run: supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > shared/types/supabase-generated.ts"
fi

# Step 3: Create package.json for shared package
echo "📦 Creating shared/package.json..."
cat > shared/package.json << 'EOF'
{
  "name": "@acg/shared",
  "version": "1.0.0",
  "description": "Shared types and utilities for ACG StaffLink",
  "type": "module",
  "main": "index.ts",
  "scripts": {
    "generate-types": "supabase gen types typescript --project-id rzzxxkppkiasuouuglaf > types/supabase-generated.ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

# Step 4: Create index.ts for shared types
echo "📝 Creating shared/types/index.ts..."
cat > shared/types/index.ts << 'EOF'
/**
 * Shared Types for ACG StaffLink
 *
 * This file exports all shared types used across frontend and backend.
 * Always update this when adding new edge functions or changing API contracts.
 */

// Re-export Supabase generated types
export * from './supabase-generated';

// Common response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface ValidationIssue {
  severity: Severity;
  timesheet_id?: string;
  shift_id?: string;
  issue: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  summary?: {
    critical: number;
    warnings: number;
    info: number;
  };
}

// Edge function contracts (add more as needed)
export * from './edge-functions';
EOF

# Step 5: Create edge function contracts template
echo "📝 Creating shared/types/edge-functions.ts..."
cat > shared/types/edge-functions.ts << 'EOF'
/**
 * Edge Function API Contracts
 *
 * Define request/response interfaces for all Supabase Edge Functions.
 * Frontend and backend MUST use these types for type safety.
 */

// ============================================================================
// Communication Functions
// ============================================================================

export interface SendSMSRequest {
  to: string;                    // Phone number in E.164 format (+447911123456)
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

export interface SendEmailRequest {
  to: string | string[];         // Email address(es)
  subject: string;
  html?: string;                 // HTML content
  text?: string;                 // Plain text content
  from?: string;                 // Sender (default: ACG StaffLink)
  reply_to?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message_id?: string;           // Resend message ID
  error?: string;
}

export interface SendWhatsAppRequest {
  to: string;                    // WhatsApp number
  message: string;               // Message content
  media_url?: string;            // Optional: image/document URL
}

export interface SendWhatsAppResponse {
  success: boolean;
  message_sid?: string;
  error?: string;
}

// ============================================================================
// Automation Functions
// ============================================================================

export interface ShiftReminderEngineRequest {
  shift_id?: string;             // Optional: specific shift
  hours_before?: number;         // Default: 24
  dry_run?: boolean;             // Preview without sending
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

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidateTimesheetRequest {
  timesheet_id: string;
}

export interface ValidateTimesheetResponse {
  success: boolean;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    issue: string;
    message: string;
  }>;
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
}

// ============================================================================
// TODO: Add contracts for remaining 50 edge functions
// ============================================================================

// Examples to add:
// - auto-timesheet-creator
// - compliance-monitor
// - shift-status-automation
// - daily-shift-closure-engine
// - payment-reminder-engine
// etc.
EOF

# Step 6: Create shared constants
echo "📝 Creating shared/constants/index.ts..."
cat > shared/constants/index.ts << 'EOF'
/**
 * Shared Constants
 *
 * Application-wide constants used by both frontend and backend.
 */

export const SHIFT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  AGENCY_ADMIN: 'agency_admin',
  STAFF: 'staff',
  CLIENT: 'client',
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
} as const;

export const COMPLIANCE_STATUS = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
} as const;

// Type exports for use in TypeScript
export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[keyof typeof NOTIFICATION_CHANNELS];
export type ComplianceStatus = typeof COMPLIANCE_STATUS[keyof typeof COMPLIANCE_STATUS];
EOF

# Step 7: Create shared index.ts (main entry point)
echo "📝 Creating shared/index.ts..."
cat > shared/index.ts << 'EOF'
/**
 * ACG StaffLink Shared Package
 *
 * Import this in both frontend and backend for type safety.
 */

export * from './types';
export * from './constants';
EOF

# Step 8: Update frontend jsconfig to include shared types
echo "🔧 Updating jsconfig.json..."
if [ -f "jsconfig.json" ]; then
    # Backup original
    cp jsconfig.json jsconfig.json.backup

    # Add shared path alias
    echo "✅ Backed up jsconfig.json to jsconfig.json.backup"
    echo "⚠️  Please manually add this to jsconfig.json compilerOptions.paths:"
    echo '   "@acg/shared/*": ["../shared/*"]'
else
    echo "⚠️  jsconfig.json not found, skipping..."
fi

# Step 9: Create .gitignore for shared package
echo "📝 Creating shared/.gitignore..."
cat > shared/.gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
EOF

# Step 10: Create README for shared package
echo "📝 Creating shared/README.md..."
cat > shared/README.md << 'EOF'
# @acg/shared

Shared types, constants, and utilities for ACG StaffLink.

## Usage

### Frontend (React)
```typescript
import type { SendSMSRequest, SendSMSResponse } from '@acg/shared/types/edge-functions';

async function sendReminder(phoneNumber: string) {
  const request: SendSMSRequest = {
    to: phoneNumber,
    message: 'Your shift starts in 2 hours!'
  };

  const response = await supabase.functions.invoke<SendSMSResponse>('send-sms', {
    body: request
  });

  return response.data;
}
```

### Backend (Supabase Edge Function)
```typescript
import type { SendSMSRequest, SendSMSResponse } from '../_shared/types.ts';

Deno.serve(async (req) => {
  const body: SendSMSRequest = await req.json();

  // Type-safe implementation
  const response: SendSMSResponse = {
    success: true,
    message_sid: '...'
  };

  return new Response(JSON.stringify(response));
});
```

## Regenerate Supabase Types

When database schema changes:
```bash
cd shared
npm run generate-types
```

## Adding New Edge Function Contracts

1. Edit `types/edge-functions.ts`
2. Add request/response interfaces
3. Export from `types/index.ts`
4. Update both frontend and backend to use new types
EOF

echo ""
echo "✅ Parallel development structure created!"
echo ""
echo "📋 Next steps:"
echo "   1. cd shared && npm install"
echo "   2. Review shared/types/edge-functions.ts and add your edge function contracts"
echo "   3. Update frontend code to import from @acg/shared"
echo "   4. Update edge functions to use shared types"
echo "   5. Read PARALLEL_DEVELOPMENT_RESTRUCTURE.md for full guide"
echo ""
echo "🎯 Quick win: Start by documenting your top 5 most-used edge functions"
echo ""
