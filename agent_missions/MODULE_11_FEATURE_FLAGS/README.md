# MODULE 11: Feature Flags System

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 4-5 hours
**Risk Level:** Low
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** No way to safely toggle features without code deployment:
- Can't A/B test features
- Can't disable broken features quickly
- Can't roll out features gradually
- Can't customize features per agency

**Solution:**
1. Database-driven feature flags
2. Admin UI to toggle flags
3. Frontend hook to check flags
4. Agency-level overrides

**End State:** Toggle any feature on/off from admin UI without deploying code.

---

## 📊 FEATURE FLAG TYPES

| Type | Description | Example |
|------|-------------|---------|
| **Boolean** | On/Off | `enable_whatsapp_notifications` |
| **Percentage** | % of users | `ai_shift_matching: 50%` |
| **Agency** | Per-agency | `agency_123: beta_features` |
| **Date** | Time-based | `christmas_theme: Dec 20-27` |

---

## 📦 DELIVERABLES

### Phase 1: Database Schema (1 hour)
- [ ] Create `feature_flags` table
- [ ] Create `agency_feature_overrides` table
- [ ] Seed with initial flags

### Phase 2: React Hook (1 hour)
- [ ] Create `useFeatureFlag` hook
- [ ] Cache flags in React Query
- [ ] Support agency overrides

### Phase 3: Admin UI (2 hours)
- [ ] Create `src/pages/FeatureFlags.jsx`
- [ ] List all flags with current state
- [ ] Toggle on/off with one click
- [ ] Set percentage rollout
- [ ] Add agency overrides

### Phase 4: Integration (1 hour)
- [ ] Add flags to 5 key features
- [ ] Test toggle behavior
- [ ] Document available flags

---

## 🔧 DATABASE SCHEMA

```sql
CREATE TABLE feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key TEXT UNIQUE NOT NULL,
    flag_type TEXT CHECK (flag_type IN ('boolean', 'percentage', 'date_range')),
    is_enabled BOOLEAN DEFAULT FALSE,
    percentage INTEGER CHECK (percentage >= 0 AND percentage <= 100),
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agency_feature_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID REFERENCES agencies(id),
    flag_key TEXT REFERENCES feature_flags(flag_key),
    is_enabled BOOLEAN,
    UNIQUE(agency_id, flag_key)
);
```

---

## 🔧 REACT HOOK

```javascript
// src/hooks/useFeatureFlag.js
export function useFeatureFlag(flagKey) {
  const { user } = useAuth();
  const { data } = useQuery(['feature-flag', flagKey], async () => {
    // Check agency override first
    // Then check global flag
    // Return boolean
  });
  return data ?? false;
}

// Usage:
const showWhatsApp = useFeatureFlag('enable_whatsapp');
if (showWhatsApp) { /* render WhatsApp UI */ }
```

---

## 📋 INITIAL FLAGS TO CREATE

1. `enable_whatsapp_notifications` - WhatsApp integration
2. `enable_ai_shift_matching` - AI staff matching
3. `enable_auto_invoice` - Automatic invoice generation
4. `enable_gps_clockin` - GPS clock-in requirement
5. `enable_ocr_timesheet` - OCR timesheet extraction
6. `enable_beta_features` - Beta features bundle
7. `show_debug_tools` - Debug/diagnostic pages
8. `enable_multi_channel_broadcast` - Multi-channel notifications

---

## ✅ SUCCESS CRITERIA

- [ ] Feature flags table created
- [ ] 8+ flags seeded
- [ ] useFeatureFlag hook working
- [ ] Admin UI accessible
- [ ] Can toggle flags in real-time
- [ ] Agency overrides work
- [ ] 3+ features using flags

---

## 📞 AGENT HANDOFF

**To Start:** Create database schema first
**When Done:** Document all available flags
**Next Module:** MODULE_12 (Critical Features Dashboard)

