# Data Simulation Tools - Supabase Upgrade & AdminWorkflows Integration

## ✅ UPGRADE COMPLETE

### **What Was Changed:**

The Data Simulation Tools page has been upgraded to:
1. ✅ **Work with current Supabase database** (migrated from Base44 SDK)
2. ✅ **Auto-populate AdminWorkflows** when shifts need admin action
3. ✅ **Assign priority levels** to workflows (critical/high/medium)
4. ✅ **Track and display workflow creation** in results

---

## 🎯 How It Works Now

### **October 2025 Shift Status Randomization**

**Purpose:** Testing tool to simulate realistic shift outcomes for October 2025 shifts.

**Status Distribution:**
- **70%** → `completed` (shift worked successfully)
- **10%** → `cancelled` (client cancelled)
- **5%** → `disputed` (hours/location/rate dispute) → **CRITICAL priority**
- **5%** → `no_show` (staff didn't show up) → **HIGH priority**
- **10%** → `awaiting_admin_closure` (needs verification) → **MEDIUM priority**

---

## 🔗 AdminWorkflows Integration

### **Automatic Workflow Creation**

When a shift is marked as one of these statuses, an AdminWorkflow is **automatically created**:

| Shift Status | Workflow Priority | Workflow Title | Description |
|--------------|-------------------|----------------|-------------|
| `disputed` | **CRITICAL** | 🚨 DISPUTED SHIFT - [date] | CRITICAL: Shift disputed. Reason: [reason]. Requires immediate investigation. |
| `no_show` | **HIGH** | ❌ NO SHOW - [date] | Staff no-show reported. Reason: [reason]. Verify and update payroll. |
| `awaiting_admin_closure` | **MEDIUM** | Past Shift Needs Closure - [ID] | Shift from [date] needs admin review. Was it worked? No-show? Cancelled? |

**Workflow Details:**
- **Type:** `shift_completion_verification`
- **Status:** `pending`
- **Deadline:** 48 hours from creation
- **Related Entity:** Links to the specific shift
- **Auto-created:** `true` (flagged as system-generated)

---

## 📊 AdminWorkflows Stats - What Constitutes "Critical"

### **Critical Count Calculation**

```javascript
const criticalCount = workflows.filter(w => w.priority === 'critical').length;
```

**What makes a workflow "Critical":**
1. **Priority field = 'critical'** (set during workflow creation)
2. **Disputed shifts** → Always marked as CRITICAL
3. **Manual workflows** → Admin can set priority to critical when creating

**Current Critical Triggers:**
- ✅ Disputed shifts (hours/location/rate disputes)
- ✅ Manually created workflows with critical priority
- ❌ No-shows are HIGH priority (not critical)
- ❌ Awaiting closure is MEDIUM priority (not critical)

---

## 🧪 Testing the Tool

### **Step 1: Navigate to Data Simulation Tools**
```
http://localhost:5173/datasimulationtools
```

### **Step 2: Run October Randomization**
1. Click **"Randomize October Shift Statuses"** button
2. Confirm the action in the popup
3. Wait for processing (shows spinner)

### **Step 3: Review Results**
Results will show:
- ✅ Total shifts updated
- ✅ Status breakdown (completed/cancelled/disputed/no_show/awaiting)
- ✅ ChangeLog entries created
- ✅ **NEW:** AdminWorkflows created (with priority breakdown)

### **Step 4: Verify AdminWorkflows**
1. Click **"View AdminWorkflows"** button
2. Check stats:
   - **Critical:** Should show disputed shifts count
   - **Pending:** Should show all new workflows
   - **Active Workflows:** Should show total (pending + in_progress)

---

## 🔍 Verification Checklist

### **Database Changes:**
- [ ] Shifts table updated with new statuses
- [ ] `shift_ended_at`, `admin_closed_at` populated for completed shifts
- [ ] `cancelled_at`, `cancellation_reason` populated for cancelled shifts
- [ ] `admin_closure_outcome` set correctly

### **ChangeLog Entries:**
- [ ] One entry per shift updated
- [ ] `change_type` = 'shift_modified'
- [ ] `reason` includes "[DATA SIMULATION]" prefix
- [ ] `risk_level` set correctly (high for disputed, medium for no_show, low for others)
- [ ] `flagged_for_review` = true for disputed/no_show

### **AdminWorkflows Created:**
- [ ] Workflows created for disputed/no_show/awaiting_admin_closure shifts
- [ ] Priority levels correct (critical/high/medium)
- [ ] `related_entity` links to shift ID
- [ ] `deadline` set to 48 hours from now
- [ ] `auto_created` = true

### **UI Updates:**
- [ ] AdminWorkflows page shows new workflows
- [ ] Critical count matches disputed shifts
- [ ] Pending count includes all new workflows
- [ ] Active Workflows count = Pending + In Progress

---

## 🚨 Important Notes

### **Testing Environment Only**
⚠️ This tool directly modifies database records. **Only use in test/UAT environments.**

### **Audit Trail**
✅ All changes are logged to `change_logs` table with:
- Timestamp
- User who triggered the action
- Old value → New value
- Reason for change
- Risk level

### **Query Invalidation**
After running, the tool invalidates these queries:
- `['all-shifts']` - Refreshes shift list
- `['shifts']` - Refreshes shift data
- `['workflows']` - **NEW:** Refreshes AdminWorkflows page

---

## 📈 Expected Outcomes

### **For 100 October Shifts:**
- ~70 completed shifts (no workflows)
- ~10 cancelled shifts (no workflows)
- ~5 disputed shifts → **5 CRITICAL workflows**
- ~5 no-show shifts → **5 HIGH workflows**
- ~10 awaiting closure → **10 MEDIUM workflows**

**Total AdminWorkflows Created:** ~20 (5 critical + 5 high + 10 medium)

---

## ✅ READY TO TEST!

The tool is now fully integrated with Supabase and will auto-populate AdminWorkflows with proper priority levels.

