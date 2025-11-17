---
type: "always_apply"
---

type: agent_requested
description: Available APIs and tools - always check these first before suggesting custom solutions
---

# Available APIs & Context7 MCP Standards

## Always Check These First (Before Building Custom)

### Twilio
**What**: SMS, WhatsApp, voice messaging
**Status**: ✅ Configured in ACG
**Use when**: Need to send SMS, WhatsApp messages, or handle calls
**Check first**: Does Twilio template + endpoint solve this?

### OpenAI
**What**: GPT-4, function calling, embeddings
**Status**: ✅ Configured in ACG
**Use when**: Need AI reasoning, content generation, or structured output
**Check first**: Can OpenAI function calling handle this task?

### Resend
**What**: Email delivery and templates
**Status**: ✅ Configured in ACG
**Use when**: Need to send emails or use email templates
**Check first**: Does Resend + template system solve this?

### Supabase
**What**: PostgreSQL database, auth, real-time, file storage
**Status**: ✅ Primary data layer for ACG
**Use when**: Need data persistence, authentication, or file handling
**Check first**: Can Supabase schema + functions solve this?

### n8n
**What**: Workflow automation, multi-step orchestration
**Status**: ✅ Available for Phase 2+ workflows
**Use when**: Need to chain multiple APIs or automate complex processes
**Check first**: Can n8n workflow handle this instead of custom code?

### Context7 MCP
**What**: Up-to-date code documentation, schema introspection, function discovery
**Status**: ✅ ALWAYS available, ALWAYS check this first
**Use when**: Need to understand existing code patterns or database structure
**Check first**: What does context7 tell us about existing solutions?

---

## Decision Flow (BEFORE suggesting new API or custom code)

User requests: "Build X"
↓
Check context7 MCP: "What code already exists for similar task?"
↓
Check Twilio/OpenAI/Resend/Supabase/n8n: "Can any of these solve X?"
↓
If YES to either:
├─ Use existing solution + build integration
└─ Explain why standard approach is better
↓
If NO to both:
├─ Justify why custom code is needed
├─ Present trade-offs
└─ Build with full documentation

text

---

## Examples

### Example 1: "Build automatic email notifications"
Context7 check: No existing notification system
API check:
├─ Resend: Can send email ✅
├─ Supabase: Can store templates ✅
├─ n8n: Can orchestrate ✅

Result: Use Resend + Supabase templates, not custom email engine

text

### Example 2: "Build AI staff matching"
Context7 check: ShiftAssignmentModal already has scoring algorithm
API check:
├─ OpenAI: Can enhance scoring ✅
├─ Supabase: Already has staff data ✅

Result: Enhance existing scorer with OpenAI, don't rebuild from scratch

text

### Example 3: "Build WhatsApp automated responses"
Context7 check: No WhatsApp handler exists yet
API check:
├─ Twilio: Handles WhatsApp ✅
├─ OpenAI: Can generate responses ✅
├─ n8n: Can orchestrate workflow ✅

Result: Use Twilio + OpenAI + n8n, not custom WhatsApp parser