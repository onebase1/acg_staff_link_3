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
