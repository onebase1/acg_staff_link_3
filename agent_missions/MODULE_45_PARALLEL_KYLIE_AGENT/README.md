# MODULE 45: Parallel Kylie AI Supervisor Agent

**Project Code:** KYLIE-PARALLEL-045
**Status:** Foundation Built (Workflows Created)
**Start Date:** 2026-01-28
**Priority:** High (Parallel Development)

---

## 🎯 Mission Objective

Develop a parallel, n8n-centric AI Assistant ("Supervisor Agent") for Kylie. This architecture moves the "brains" (LLM) and decision-making logic from Supabase Edge Functions into a visual, agentic n8n environment. 

**Key Goals:**
- Adopt the "Vapi/MCP" pattern: AI Agent as a central router calling subworkflows as tools.
- Provide a low-code alternative to the TypeScript-based `whatsapp-master-router`.
- Mirror the Staff Portal capabilities with 100% fidelity.

---

## 📐 Architecture: "Supervisor Agent" Pattern

Unlike the current master router, the Supervisor Agent is not a static switch-case block. It is a live AI Agent that reasons about user intent and selects the appropriate tool (subworkflow).

### Core Stack
- **Incoming Trigger:** WhatsApp Webhook (Meta Cloud API).
- **Brain Node:** n8n `AI Agent` node (Optimized for Groq or Anthropic).
- **Memory Node:** `Window Buffer Memory` via Supabase `whatsapp_conversations` table.
- **Tooling:** All business logic is encapsulated in **n8n subworkflows** exposed as tools.

---

## 📋 Identified Subworkflows

| Category | Action | n8n Subworkflow | Role |
| :--- | :--- | :--- | :--- |
| **Compliance** | Profile Photo | `handler-profile-photo` | Updates `staff.profile_photo_url` |
| **Compliance** | Written References | `handler-references` | Collects 2 records; updates JSONB |
| **Compliance** | Employment History | `handler-employment-history` | Updates `staff.employment_history` JSONB |
| **Compliance** | OH Clearance | `handler-occupational-health` | Status update in `compliance` table |
| **Compliance** | DBS Certificate | `handler-dbs-certificate` | Metadata extraction + image link |
| **Compliance** | Right to Work | `handler-right-to-work` | Metadata extraction + image link |
| **Compliance** | Mandatory Training | `handler-mandatory-training` | Lists 0/10; handles uploads |
| **Compliance** | Personal Info | `handler-personal-info` | NLP extract for DOB, Address, Contact |
| **Marketplace** | List Shifts | `get-market-shifts` | Mirrors portal logic via RPC |
| **Marketplace** | Accept Shift | `accept-market-shift` | Availability check + DB transaction |
| **Schedule** | My Shifts | `get-staff-schedule` | Status-based schedule categorization |
| **Schedule** | Shift Details | `get-shift-details` | Deep dive into notes, contact, & address |
| **Schedule** | Decline Shift | `decline-staff-shift` | Warning logic + cancellation process |
| **Timesheet** | Image Upload | `whatsapp-timesheet-handler` | Routes to "perfected" OCR Edge Func |
| **Logistics** | On My Way | `on-my-way-logic` | Triggers shift verification chain |

---

## 🚀 Implementation Strategy

1. **Skeleton Phase (✅ COMPLETE):** 
    - Created `Kylie-Master-Agent` (ID: `pg4QwcjjHDAVKYX3`)
    - Created `Kylie-Sub-GetMarketShifts` (ID: `TLCg6CpkgAbDriij`)
    - Created `Kylie-Sub-GetStaffSchedule` (ID: `0d9s3zqj4d45w26h`)
    - Created `Kylie-Sub-GetShiftDetails` (ID: `4aYN39qD9eQRo4xd`)
    - Created `Kylie-Sub-OnMyWayLogic` (ID: `I2RUPuWlReSm86kh`)
2. **Tool Phase (⏳ IN PROGRESS):** 
    - Connect Master Agent to sub-workflows via `AI Agent` tool-binding.
    - Implement remaining 11 subworkflows.
3. **Integration Phase:** Test with real WhatsApp traffic in parallel with the Supabase router.
4. **Validation Phase:** 100% feature parity with staff portal.
