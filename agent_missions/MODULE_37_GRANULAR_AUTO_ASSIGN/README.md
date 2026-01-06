# MODULE 37: Granular Auto-Assignment Settings

**Status:** ⏸️ Parked (Post-MVP)
**Priority:** Medium
**Dependencies:** Auto-assignment engine, Agency Settings
**Created:** 2026-01-03

---

## 🎯 Objective

Enhance the auto-assignment system to allow granular control over "Auto-Assign" and "Auto-Confirm" settings. Currently, these are global toggles per agency. The goal is to allow enabling/disabling these features at more specific levels:
1.  **Per Client:** e.g., "Auto-assign for Care Home A, but Manual for Care Home B"
2.  **Per Shift Batch:** e.g., "Auto-assign this batch of 50 shifts"
3.  **Per Role/Zone:** (Optional)

---

## 📋 Business Requirements

### User Story
> "As an agency admin, I want to turn on auto-assignment for my trusted clients who trust our matching, but keep it manual for new clients who require me to vet every staff member personally."

### Key Features
1.  **Client Override:** `clients` table needs `auto_assign_override` (Boolean/Enum: Default, Enabled, Disabled).
2.  **Batch/Bulk Override:** `shift_batches` (if exists) or `shift_metadata` needs `auto_assign_strategy`.
3.  **Engine Logic Update:** The `auto_assign_shift` RPC must check:
    - Shift-level override (if any)
    - Client-level override
    - Agency-level fallback (Global Setting)

---

## 📐 Technical Implementation Notes

### Database Changes
```sql
ALTER TABLE clients ADD COLUMN auto_assign_config jsonb DEFAULT '{"mode": "agency_default"}';
-- modes: 'agency_default', 'enabled', 'disabled'
```

### Logic Update
The `auto_assign_shift` PostgreSQL function needs to allow the client setting to override the `agency_settings` check.

```sql
-- Pseudo-code
v_client_config := (SELECT auto_assign_config FROM clients WHERE id = v_shift.client_id);
IF v_client_config->>'mode' = 'enabled' THEN
  -- Proceed
ELSEIF v_client_config->>'mode' = 'disabled' THEN
  -- Stop
ELSE
  -- Check Global Agency Setting
END IF;
```

---

## 🛑 Why Parked?

**Decision Date:** Jan 3, 2026
**Reason:** The current auto-assignment engine was recently stabilized (recursive loop fixed). Introducing hierarchical configuration logic carries a high risk of regression for a "nice to have" feature. The user agreed to park this until post-MVP to prioritize stability and critical UX gaps (like Staff Decline).
