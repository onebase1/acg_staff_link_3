# ACG StaffLink - Testing Quick Reference

**Purpose:** Quick lookup for next module to test  
**Full Details:** See `MODULE_TESTING_ROADMAP.md`  
**Date:** 2025-11-14

---

## 🎯 What to Test Next?

### **CRITICAL Priority (Do First)**
1. ✅ **Module 1.1: Staff Portal** - COMPLETE ✅
2. ⏳ **Module 1.2: Admin Shift Management** - Ready to start
3. ⏳ **Module 1.3: Staff Availability** - Ready to start (can parallelize)
4. ⏳ **Module 2.1: Timesheet Management** - Ready to start (can parallelize)
5. ⏳ **Module 2.2: GPS Clock-In** - Ready to start (can parallelize)
6. ⏳ **Module 2.3: Invoicing** - Ready to start (can parallelize)
7. ⏳ **Module 2.4: Payroll** - Ready to start (can parallelize)
8. ⏳ **Module 2.5: Compliance** - Ready to start (can parallelize)

### **HIGH Priority (Do Second)**
9. ⏳ **Module 1.4: Client Portal** - Ready to start (can parallelize)
10. ⏳ **Module 2.6: Client/Staff Management** - Ready to start (can parallelize)
11. ⏳ **Module 3.1: Financial Lock** - Ready to start (can parallelize)
12. ⏳ **Module 3.2: Rate Card** - Ready to start (can parallelize)
13. ⏳ **Module 4.1: Email Notifications** - Ready to start (can parallelize)
14. ⏳ **Module 4.2: SMS/WhatsApp** - Ready to start (can parallelize)

---

## 🚀 Recommended Next Thread

### **Option 1: Compliance Tracker (Module 2.5)**
**Why:** Parked items from Staff Portal (profile photo, documents)  
**Priority:** 🔴 CRITICAL  
**Can Parallelize:** ✅ Yes  
**Thread Prompt:**
```
Review and test Module 2.5: Compliance Document Management
- Document upload (DBS, Right to Work, Training certificates)
- Document verification workflow
- Expiry tracking and reminders
- Auto-suspend staff with expired docs
- Compliance reporting

Reference: MODULE_TESTING_ROADMAP.md (lines 302-350)
Follow same testing approach as Staff Portal thread
```

---

### **Option 2: Communications Module (Module 4.1)**
**Why:** Test email notifications parked from Staff Portal  
**Priority:** 🟡 HIGH  
**Can Parallelize:** ✅ Yes  
**Thread Prompt:**
```
Review and test Module 4.1: Email Notifications
- All email triggers (invitation, assignment, reminders, etc.)
- Email templates and rendering
- Delivery tracking
- Bounce handling

Reference: MODULE_TESTING_ROADMAP.md (lines 566-610)
Test all email triggers mentioned in STAFF_PORTAL_WORKFLOW.md
```

---

### **Option 3: Timesheet Management (Module 2.1)**
**Why:** Core operation, critical for invoicing  
**Priority:** 🔴 CRITICAL  
**Can Parallelize:** ✅ Yes  
**Thread Prompt:**
```
Review and test Module 2.1: Timesheet Management
- Auto-create timesheets on shift confirmation
- Staff upload timesheet photos
- AI OCR extraction
- Auto-approval workflow
- Financial lock enforcement

Reference: MODULE_TESTING_ROADMAP.md (lines 151-200)
Includes GPS clock-in workflow from Staff Portal
```

---

## 📊 Progress Tracker

| Module | Status | Priority | Agent | Start Date | Completion |
|--------|--------|----------|-------|------------|------------|
| 1.1 Staff Portal | ✅ Complete | 🔴 CRITICAL | - | 2025-11-13 | 2025-11-14 |
| 1.2 Admin Shift Mgmt | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 1.3 Staff Availability | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 1.4 Client Portal | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 1.5 Shift Journey E2E | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.1 Timesheet Mgmt | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.2 GPS Clock-In | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.3 Invoicing | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.4 Payroll | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.5 Compliance | ⏳ Not Started | 🔴 CRITICAL | - | - | - |
| 2.6 Client/Staff Mgmt | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 3.1 Financial Lock | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 3.2 Rate Card | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 3.3 Dispute Resolution | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 3.4 Operational Costs | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 4.1 Email Notifications | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 4.2 SMS/WhatsApp | ⏳ Not Started | 🟡 HIGH | - | - | - |
| 4.3 WhatsApp Bot | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 5.1 Automated Workflows | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 5.2 AI Email Parsing | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 5.3 AI OCR | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 5.4 NL Shift Creation | ⏳ Not Started | 🟢 LOW | - | - | - |
| 6.1 Performance Analytics | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 6.2 Timesheet Analytics | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 6.3 Data Export | ⏳ Not Started | 🟢 MEDIUM | - | - | - |
| 7.1 Agency Settings | ⏳ Not Started | 🟢 LOW | - | - | - |
| 7.2 User Management | ⏳ Not Started | 🟢 LOW | - | - | - |
| 7.3 Super Admin | ⏳ Not Started | 🟢 LOW | - | - | - |
| 7.4 Help Center | ⏳ Not Started | 🟢 LOW | - | - | - |

**Total:** 1/29 complete (3.4%)

---

## 🔄 Parallel Testing Opportunities

### **Can Run 4 Agents in Parallel Right Now:**
- **Agent A:** Module 2.1 (Timesheet Management)
- **Agent B:** Module 2.2 (GPS Clock-In)
- **Agent C:** Module 2.3 (Invoicing)
- **Agent D:** Module 2.4 (Payroll)

All 4 are CRITICAL priority and have no dependencies on each other!

---

## 📝 Thread Template

When starting a new testing thread, use this prompt:

```
Review and test Module X.X: [Module Name]

**Reference:** MODULE_TESTING_ROADMAP.md (lines XXX-XXX)

**Scope:**
[Copy scope from roadmap]

**Success Criteria:**
[Copy success criteria from roadmap]

**Testing Approach:**
1. Review module scope and dependencies
2. Manual testing of all features
3. Create Playwright tests
4. Fix any issues found
5. Document workflow (like STAFF_PORTAL_WORKFLOW.md)
6. Document parked items
7. Update MODULE_TESTING_ROADMAP.md with completion status

**Deliverables:**
- Module workflow document (MODULE_NAME_WORKFLOW.md)
- Playwright test file (tests/module-name.spec.js)
- Updated MODULE_TESTING_ROADMAP.md
- Thread closure summary
```

---

## 🎯 Key Files

- **MODULE_TESTING_ROADMAP.md** - Complete module details (1142 lines)
- **STAFF_PORTAL_WORKFLOW.md** - Example workflow doc
- **STAFF_PORTAL_THREAD_CLOSURE.md** - Example closure doc
- **critical_path_testing_matrix.csv** - Pipeline test matrix
- **TESTING_PLAN.md** - Overall testing strategy

---

**Last Updated:** 2025-11-14  
**Next Module:** Module 2.5 (Compliance) OR Module 4.1 (Email) OR Module 2.1 (Timesheet)

