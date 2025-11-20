# 🎯 REMAINING TASKS BREAKDOWN
## What Can Be Done in This Thread vs. New Thread

**Date**: 2025-11-20  
**Progress**: 2/9 groups complete (22%)

---

## ✅ COMPLETED (This Thread)

1. ✅ **GROUP G**: Financial Calculations Fix
2. ✅ **GROUP A**: Domain & Email Migration (code + manual steps)
3. ✅ **BONUS**: Email Trust Fix (branded templates, DNS verified)

---

## 🟢 CAN DO IN THIS THREAD (Simple, Low-Risk)

### **GROUP H: Documentation Updates** ⏱️ 30-60 minutes
**Complexity**: ⭐ Low  
**Risk**: 🟢 None (documentation only)  
**Files**: 2-3 markdown files

**Tasks**:
- Update `dominion_doc/PRE_ANNOUNCEMENT_DRAFTS.md` with correct email domains
- Remove "track earnings" false claim
- Add GPS clock-in feature to announcements
- Update `dominion_doc/DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md`

**Why This Thread**: Simple find-replace, no code changes, no testing needed

---

### **GROUP B: Branding Update (Partial)** ⏱️ 1-2 hours
**Complexity**: ⭐⭐ Low-Medium  
**Risk**: 🟢 Low (cosmetic changes)  
**Files**: 10-15 files

**Tasks We Can Do**:
- ✅ Find all "ACG StaffLink" references in code
- ✅ Replace with "Agile Care Management" or "Agile Care"
- ✅ Update email templates (already done in GROUP A)
- ✅ Update documentation references
- ⚠️ **SKIP**: Logo creation (requires design work)

**Why This Thread**: Mostly find-replace, low risk, no complex logic

---

## 🟡 MAYBE IN THIS THREAD (Medium Complexity)

### **GROUP F: GPS & Mapbox Verification** ⏱️ 1-2 hours
**Complexity**: ⭐⭐⭐ Medium  
**Risk**: 🟡 Medium (testing required)  
**Files**: 1-2 files + environment variables

**Tasks**:
- Check `VITE_MAPBOX_TOKEN` in Netlify env vars
- Review `src/components/staff/MobileClockIn.jsx` code
- Verify Mapbox Static Images API implementation
- **CANNOT DO**: Live GPS testing (requires mobile device + real shift)

**Why Maybe**: Can review code and verify configuration, but can't fully test without live shift

**Recommendation**: Do code review in this thread, defer live testing to GROUP I

---

## 🔴 NEEDS NEW THREAD (Complex, High-Risk)

### **GROUP C: Authentication UI Redesign** ⏱️ 2-3 hours
**Complexity**: ⭐⭐⭐⭐ High  
**Risk**: 🟡 Medium (affects user onboarding)  
**Files**: 1-3 files (Login.jsx redesign)

**Why New Thread**:
- Complete UI redesign (not simple edits)
- Mobile responsiveness testing required
- Multiple iterations likely needed
- Affects critical user flow (login/signup)

---

### **GROUP D: Staff Portal UX Improvements** ⏱️ 3-4 hours
**Complexity**: ⭐⭐⭐⭐ High  
**Risk**: 🟢 Low (enhancements only)  
**Files**: 3-5 files (StaffPortal.jsx + new calendar page)

**Why New Thread**:
- Creating new `/shift-calendar` page from scratch
- Calendar UI component (complex)
- Mobile-first design required
- Multiple components to coordinate

---

### **GROUP E: Notification System Audit** ⏱️ 4-6 hours
**Complexity**: ⭐⭐⭐⭐⭐ Very High  
**Risk**: 🟡 Medium (affects all notifications)  
**Files**: 50+ email/SMS/WhatsApp templates

**Why New Thread**:
- Massive scope (1,328 lines in audit doc)
- 50+ templates to review
- Dark/light theme testing required
- Consistency checks across entire system
- Needs dedicated focus

---

### **GROUP I: Testing & Verification** ⏱️ 4-6 hours
**Complexity**: ⭐⭐⭐⭐⭐ Very High  
**Risk**: 🔴 Critical (production readiness)  
**Files**: Entire system

**Why New Thread**:
- End-to-end testing required
- Live timesheet upload testing
- Complete shift lifecycle testing
- Domain verification testing
- Requires real data and live environment

---

## 🎯 RECOMMENDATION FOR THIS THREAD

**Do Now (Next 2-3 hours)**:
1. ✅ **GROUP H**: Documentation Updates (30-60 min)
2. ✅ **GROUP B**: Branding Update - Text Only (1-2 hours)
3. ⚠️ **GROUP F**: GPS Code Review Only (30 min)

**Total**: ~2.5-3.5 hours of work

**After This Thread**:
- Commit all changes
- Create summary of what was done
- Recommend next thread focus (GROUP C or GROUP E)

---

## 📋 SUMMARY

| Group | Status | This Thread? | Reason |
|-------|--------|--------------|--------|
| **A** | ✅ Done | ✅ Yes | Complete |
| **G** | ✅ Done | ✅ Yes | Complete |
| **H** | ⏳ Pending | ✅ Yes | Simple docs |
| **B** | ⏳ Pending | ✅ Yes (partial) | Text only, skip logo |
| **F** | ⏳ Pending | ⚠️ Maybe | Code review only |
| **C** | ⏳ Pending | ❌ No | Complex UI redesign |
| **D** | ⏳ Pending | ❌ No | New page creation |
| **E** | ⏳ Pending | ❌ No | Massive scope |
| **I** | ⏳ Pending | ❌ No | End-to-end testing |

---

**Next Action**: Confirm which tasks to proceed with in this thread

