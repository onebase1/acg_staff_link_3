# RBAC Platform-Wide Implementation Guide

**Created:** 2025-12-02
**Status:** Ready for Agent Execution
**Priority:** High (Pre-MVP Tier 1 modules are critical)

---

## 🌟 KEY SCALABILITY FEATURE: MULTI-AGENCY SUPPORT

**Module A implements true multi-tenancy:**
- ✅ Users can belong to **multiple agencies** with different roles
- ✅ Staff can work for 3+ agencies simultaneously
- ✅ Different pay rates per agency
- ✅ Freelance coordinators, shared staff pools supported

**Architecture:**
- Uses `agency_contacts` table (many-to-many relationship)
- Replicates Module 1's proven `client_contacts` pattern
- Migrates away from single-valued `profiles.agency_id`

**Business impact:**
- Enables freelance workforce model
- Multi-branch agencies (one user, 3 branches)
- Platform can handle umbrella organizations
- True SaaS multi-tenancy unlocked

**See:** [MODULE_A_AGENCY_RBAC.md - Multi-Agency Architecture section](MODULE_A_AGENCY_RBAC.md#-multi-agency-architecture-true-multi-tenancy)

---

## 📁 FOLDER STRUCTURE

```
agents workspace/RBAC_PLATFORM_WIDE/
├── README.md (this file)
├── MASTER_RBAC_PLAN.md (Executive summary, role definitions, implementation priority)
├── MODULE_A_AGENCY_RBAC.md (14-18 hrs - Agency roles & permissions)
├── MODULE_B_STAFF_PORTAL_RBAC.md (10-14 hrs - Staff portal roles for drivers, coordinators)
├── MODULE_C_FINANCIAL_HARDENING.md (12-16 hrs - Encryption, audit trail, RLS)
├── MODULE_D_BACKEND_ENFORCEMENT.md (8-12 hrs - API middleware, permission validation)
└── MODULE_E_SUPER_ADMIN_IMPROVEMENTS.md (6-8 hrs - Multi-admin support)
```

---

## 🎯 QUICKSTART: What to Build First

### **TIER 1: CRITICAL PRE-MVP (Weeks 1-4)**

Build these 3 modules BEFORE launching to Dominion Agency:

1. **Module C: Financial Hardening** (12-16 hrs)
   - Why: Encrypts sensitive data, prevents financial data leaks
   - File: `MODULE_C_FINANCIAL_HARDENING.md`
   - Impact: GDPR compliance, security

2. **Module A: Agency RBAC** (14-18 hrs)
   - Why: Dominion demands financial data protection
   - File: `MODULE_A_AGENCY_RBAC.md`
   - Impact: Business critical (agency owner won't go live without it)

3. **Module D: Backend Enforcement** (8-12 hrs)
   - Why: Prevents API bypasses, enforces permissions server-side
   - File: `MODULE_D_BACKEND_ENFORCEMENT.md`
   - Impact: Security hardening

**Total Time:** 34-46 hours (4-6 weeks @ 8-10 hrs/week)

---

### **TIER 2: STRATEGIC POST-MVP (Months 2-3)**

Build when you expand services or scale operations:

4. **Module B: Staff Portal RBAC** (10-14 hrs)
   - When: Adding drivers, coordinators, or compliance officers
   - File: `MODULE_B_STAFF_PORTAL_RBAC.md`
   - Impact: Future growth

5. **Module E: Super Admin Improvements** (6-8 hrs)
   - When: Onboarding partners or delegating admin tasks
   - File: `MODULE_E_SUPER_ADMIN_IMPROVEMENTS.md`
   - Impact: Operational hygiene

**Total Time:** 16-22 hours (2-3 weeks)

---

## 📋 IMPLEMENTATION CHECKLIST

### **Week 1-2: Module C (Financial Hardening)**
- [ ] Create `financial_changes_log` table
- [ ] Create `encryption_keys` metadata table
- [ ] Add `bank_details_encrypted`, `ni_number_encrypted` columns to `staff` table
- [ ] Deploy encryption/decryption functions (pgcrypto)
- [ ] Migrate existing plaintext data to encrypted format
- [ ] Add triggers to log financial changes
- [ ] Deploy RLS policies for `charge_rate`, `pay_rate`, `margin`
- [ ] Test encryption/decryption with different roles
- [ ] Verify audit trail captures changes

### **Week 2-3: Module A (Agency RBAC + Multi-Agency Support)**
- [ ] Create `agency_contacts` table (enables multi-agency support)
- [ ] Deploy 6 agency roles (AGENCY_OWNER, OPERATIONS_DIRECTOR, etc.)
- [ ] Backfill existing `agency_admin` users → AGENCY_OWNER
- [ ] **SCALABILITY:** Update all code to query `agency_contacts` instead of `profiles.agency_id`
- [ ] Add agency switcher UI (for users belonging to multiple agencies)
- [ ] Create `agencyRBAC.js` service (permission matrix)
- [ ] Add role badges to navigation UI
- [ ] Implement field redaction in financial pages
- [ ] Hide navigation items based on role
- [ ] Build role assignment UI (super admin assigns roles)
- [ ] Test with all 6 roles
- [ ] Test multi-agency user scenarios (1 user → 3 agencies with different roles)

### **Week 3-4: Module D (Backend Enforcement)**
- [ ] Create `permission_denials_log` table
- [ ] Create `agencyPermissions.js` middleware
- [ ] Create shared Edge Function guard (`_shared/agencyPermissions.ts`)
- [ ] Document all API endpoints in `API_PERMISSION_MATRIX.md`
- [ ] Add permission guards to critical endpoints
- [ ] Write automated permission test suite
- [ ] Deploy middleware to staging
- [ ] Run full test matrix (all roles × all endpoints)
- [ ] Deploy to production with monitoring

### **Post-MVP: Modules B & E**
- [ ] Module B: Build when adding drivers/coordinators
- [ ] Module E: Build when adding second super admin

---

## 🧪 TESTING STRATEGY

### **Manual Test Scenarios**

**Test 1: OPERATIONS_DIRECTOR Cannot See Charge Rates**
1. Log in as OPERATIONS_DIRECTOR
2. Navigate to Shift Detail page
3. ✅ Charge rate shows `***REDACTED***`
4. Try API call: `GET /api/shifts/:id`
5. ✅ Response excludes `charge_rate` field

**Test 2: FINANCE_MANAGER Can See All Financial Data**
1. Log in as FINANCE_MANAGER
2. View invoice details
3. ✅ All rates, margins, profits visible
4. Access CFO Dashboard
5. ✅ Full financial KPIs displayed

**Test 3: SHIFT_COORDINATOR Cannot Generate Invoices**
1. Log in as SHIFT_COORDINATOR
2. Try to navigate to `/generate-invoices`
3. ✅ Navigation link hidden
4. Try API call: `POST /api/invoices`
5. ✅ Returns 403 Forbidden

**Test 4: Bank Details Encrypted**
1. Insert new staff with bank_details
2. Query database: `SELECT bank_details_encrypted FROM staff`
3. ✅ Returns encrypted string (not plaintext)
4. Query as FINANCE_MANAGER via API
5. ✅ Returns decrypted bank_details

**Test 5: Audit Trail**
1. Update shift charge_rate from £15 → £18
2. Query `financial_changes_log` table
3. ✅ New row with old/new values
4. ✅ Changed_by, timestamp, IP recorded

### **Automated Test Suite**

Run: `npm test tests/permissions/agencyRBAC.test.js`

Tests:
- All 6 roles × All permissions = 100+ test cases
- Backend API endpoints with different roles
- RLS policy enforcement
- Field redaction logic
- Encryption/decryption

---

## 📊 SUCCESS METRICS

### **Security Metrics**
- ✅ 0 cross-agency data leaks
- ✅ 100% of sensitive fields encrypted or protected
- ✅ Financial audit log captures 100% of changes
- ✅ 0 permission bypass incidents

### **Adoption Metrics**
- ✅ 90%+ of agencies assign granular roles within 30 days
- ✅ <5% support requests related to permissions
- ✅ Dominion agency confirms satisfaction

### **Performance Metrics**
- ✅ Permission checks add <50ms to API response
- ✅ RLS queries execute in <200ms p95
- ✅ Database size increase <10% from audit tables

---

## 🔐 SECURITY AUDIT CHECKLIST

Before going live, verify:

- [ ] All financial fields (`charge_rate`, `pay_rate`, `margin`) protected by RLS
- [ ] Bank details and NI numbers encrypted at rest
- [ ] Backend API validates permissions (not just frontend)
- [ ] Permission denials logged for security monitoring
- [ ] Cross-agency data isolation tested
- [ ] Automated test suite passes 100%
- [ ] Emergency access procedures documented
- [ ] GDPR compliance requirements met

---

## 🚀 DEPLOYMENT SEQUENCE

### **Phase 1: Silent Deployment (Week 1)**
- Deploy tables with feature flags OFF
- Backfill existing users with safe defaults
- No user-facing changes yet
- Monitor database performance

### **Phase 2: Backend Enforcement (Week 2-3)**
- Enable RLS policies
- Add backend permission middleware
- Test with staging environment
- Audit API responses

### **Phase 3: UI Updates (Week 3-4)**
- Add role badges to navigation
- Implement field masking
- Update dashboards to respect permissions
- Beta test with Dominion agency

### **Phase 4: Admin Tools (Week 4-5)**
- Build role assignment UI
- Build self-service role request
- Documentation and training

### **Phase 5: Go Live (Week 5-6)**
- Enable for all agencies
- Send announcement email
- Monitor support requests
- Iterate based on feedback

---

## 🆘 TROUBLESHOOTING

### **Issue: User Can't See Financial Data**
**Check:**
1. What's their `agency_contacts.role`?
2. Does their role have `financial.view_charge_rate` permission?
3. Is RLS policy blocking query?
4. Check `permission_denials_log` for details

### **Issue: Encryption Not Working**
**Check:**
1. Is `app.bank_details_encryption_key` environment variable set?
2. Is pgcrypto extension enabled?
3. Are triggers firing on insert/update?
4. Check `staff.bank_details_encrypted` column populated

### **Issue: Permission Denied When It Shouldn't Be**
**Check:**
1. Is user's `agency_contacts.is_active = TRUE`?
2. Does permission matrix in `agencyRBAC.js` grant this permission?
3. Is RLS policy overly restrictive?
4. Check backend middleware logs

---

## 📞 SUPPORT & FEEDBACK

**Questions?**
- Review `MASTER_RBAC_PLAN.md` for high-level overview
- Check individual module specs for detailed implementation
- Test with staging environment before production

**Found Issues?**
- Document in `RBAC_ISSUES.md`
- Include: role, action, expected vs actual, steps to reproduce

---

## ✅ FINAL CHECKLIST (Before Marking Complete)

### **Tier 1 Modules (Pre-MVP)**
- [ ] Module C: Financial Hardening deployed and tested
- [ ] Module A: Agency RBAC deployed and tested
- [ ] Module D: Backend Enforcement deployed and tested
- [ ] All automated tests passing
- [ ] Dominion agency pilot test successful
- [ ] Security audit completed
- [ ] Documentation updated

### **Post-MVP Modules**
- [ ] Module B: Built when drivers/coordinators added
- [ ] Module E: Built when second super admin needed

---

**🎉 Ready for Agent Execution!**

Next step: Assign Tier 1 modules to AI agents for autonomous build (Modules C → A → D)
