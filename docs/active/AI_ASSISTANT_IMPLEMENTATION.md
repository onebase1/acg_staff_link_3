---
status: active
last_sync_date: 2025-11-18
code_reference: supabase/functions/ai-assistant/index.ts:1-194
associated_issues: Natural Language Shift Creator Implementation, CORS Fix
commit_hash: [current]
---

# AI Assistant - Generic LLM Gateway

## Overview

The `ai-assistant` edge function is a centralized AI gateway that handles all LLM operations across the ACG StaffLink application. It provides a single, consistent interface for OpenAI integration with multiple operational modes.

## Architecture Decision

**Pattern:** Generic AI Gateway (Option C)
**Rationale:** 
- ✅ Single source of truth for OpenAI integration
- ✅ Consistent error handling and retry logic
- ✅ Easy to extend with new AI capabilities
- ✅ Reduces technical debt (consolidates AI logic)
- ✅ Future-proof for new AI features

## Supported Modes

### 1. `extract_shifts` (Primary Use Case)
Parses natural language into structured shift data for the Natural Language Shift Creator.

**Input:**
```javascript
{
  mode: 'extract_shifts',
  prompt: 'System prompt + conversation history',
  response_json_schema: true,
  temperature: 0.7
}
```

**Output:**
```javascript
{
  success: true,
  data: {
    complete: true,
    shifts: [
      {
        client_name: "Divine Care Centre",
        date: "2025-11-23",
        start_time: "08:00",
        end_time: "20:00",
        duration_hours: 12,
        role_required: "hca",
        urgency: "normal",
        work_location_within_site: "Room 14"
      }
    ]
  }
}
```

### 2. `generate_description`
Creates professional shift descriptions (future migration from `generateShiftDescription`).

### 3. `conversational`
General Q&A and assistance (default mode).

### 4. `validate`
Data validation with AI reasoning.

## Frontend Integration

### Usage in Natural Language Shift Creator

<augment_code_snippet path="src/pages/NaturalLanguageShiftCreator.jsx" mode="EXCERPT">
````javascript
const response = await InvokeLLM({
  prompt: `${systemPrompt}\n\nConversation history:\n${updatedHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nRespond naturally or with JSON if complete.`,
  add_context_from_internet: false
});
````
</augment_code_snippet>

### Integration Layer

<augment_code_snippet path="src/api/integrations.js" mode="EXCERPT">
````javascript
InvokeLLM: async (params) => {
  return invokeEdgeFunction('ai-assistant', {
    mode: params.mode || 'conversational',
    prompt: params.prompt,
    response_json_schema: params.response_json_schema || false,
    temperature: params.temperature || 0.7,
    max_tokens: params.max_tokens || 1000,
    model: params.model || 'gpt-4o-mini'
  });
}
````
</augment_code_snippet>

## Features

### 1. Retry Logic
Automatic retry with exponential backoff (3 attempts) for transient failures.

### 2. Error Handling
Comprehensive error handling with specific error messages:
- Timeout errors
- Rate limit errors
- Network errors
- Authentication errors

### 3. Authentication
All requests require valid Supabase auth token.

### 4. Usage Tracking
Returns token usage statistics for monitoring and cost control.

## UI Enhancements (Natural Language Shift Creator)

### 1. Clickable Example Prompts
Pre-built examples that users can click to auto-fill input:
- "Need 3 HCA for Divine Care tomorrow 8am-8pm, Room 14, 15, and 20"
- "Urgent night shift tonight at St Mary's, nurse required"
- "Day shifts Monday through Friday next week, care worker"
- "2 senior care workers for weekend, 12-hour shifts"

### 2. Smart Validation
Automatic validation of extracted shifts with warnings:
- ⚠️ **Error**: Missing location for clients that require it
- ⚠️ **Warning**: Rates are £0 (contract not configured)
- ⚠️ **Warning**: No location specified
- ℹ️ **Info**: Overnight shift detected
- ℹ️ **Info**: Weekend shift (verify premium rates)

### 3. Inline Editing
Delete individual shifts from preview table before creation.

### 4. Better Error Messages
Context-aware error messages based on error type:
- Timeout: "Request timed out. Please try again with a simpler request."
- Rate limit: "High demand right now. Please wait a moment."
- Network: "Connection issue detected. Check your internet."
- Auth: "Session expired. Please refresh the page."

## Deployment

### Deploy Command
```bash
C:\Users\gbase\superbasecli\supabase.exe functions deploy ai-assistant --project-ref rzzxxkppkiasuouuglaf
```

### Environment Variables Required
- `OPENAI_API_KEY` - OpenAI API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Testing

Test the Natural Language Shift Creator at `/NaturalLanguageShiftCreator`:
1. Click an example prompt or type your own
2. AI extracts shift details through conversation
3. Review extracted shifts in table with validation warnings
4. Delete any unwanted shifts
5. Confirm to create all shifts

## Future Enhancements

### Phase 4 (Quick Wins)
- Voice input for hands-free creation
- Save frequently used shift patterns
- Bulk operations ("Create same shifts for next week")
- Smart suggestions based on history

### Phase 5 (Advanced)
- Multi-turn conversations ("Change the first shift to 9am")
- Broadcast integration ("Create and broadcast immediately?")
- Staff matching preview before creation

## Technical Debt Impact

**Before Implementation:**
- Missing `invoke-llm` function (feature broken)
- No centralized AI infrastructure

**After Implementation:**
- ✅ Working Natural Language Shift Creator
- ✅ Generic AI gateway for future features
- ✅ Consolidated AI logic (reduced debt)
- ✅ Professional architecture

**Net Debt:** **REDUCED** (consolidated infrastructure)

## Troubleshooting

### CORS Errors
**Symptom:** "Access to fetch has been blocked by CORS policy"

**Fix Applied:** Added CORS headers to all responses:
```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
}

// Include in all responses
headers: { ...corsHeaders, "Content-Type": "application/json" }
```

**Status:** ✅ Fixed in deployment (104.3kB bundle)

### Authentication Errors
**Symptom:** "Unauthorized" or "Missing authorization header"

**Causes:**
1. Session expired - refresh page
2. Not logged in - redirect to login
3. Invalid token - clear localStorage and re-login

### OpenAI Errors
**Symptom:** "Failed to send request to Edge Function"

**Check:**
1. OpenAI API key set in Supabase secrets
2. Sufficient OpenAI credits
3. Network connectivity

## Rollback Plan

1. Keep `generateShiftDescription` running (not affected)
2. If issues arise, can quickly disable Natural Language Shift Creator UI
3. Edge function can be rolled back via Supabase dashboard
4. No database changes required (shifts table unchanged)

