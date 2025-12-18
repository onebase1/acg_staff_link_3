# MODULE 28: INTEGRATION TESTING & ROLLOUT

## 🎯 Mission Objective
End-to-end testing and production rollout checklist for Dominion Healthcare.

## 📊 Priority: P1 - HIGH
**Duration:** 2 hours

---

## 🧪 Test Scenarios

### Scenario 1: Admin Pre-Fills 100% → Staff Reviews

**Steps:**
1. Admin opens Staff page
2. Clicks "Edit" on imported staff (from MODULE 25)
3. Expands all collapsible sections
4. Fills ALL fields:
   - NI Number: AB123456C
   - Bank Details: Full details
   - Address Line 2
   - Emergency Contact
   - Occupational Health: Cleared
   - Skills: Care Skills, Manual Handling
   - Groups: Night Shift Team
5. Saves staff
6. Checks completion %: Should show 85-90%+
7. Clicks "Send Invite"
8. Staff receives email, signs up
9. Goes to ProfileSetup
10. Sees "Profile 85% complete" progress bar
11. Sees "Pre-filled by agency" badges
12. Reviews data, uploads photo
13. Completes profile → Status becomes 'active'

**Expected:** ✅ No errors, smooth flow

---

### Scenario 2: Multi-Role Assignment

**Steps:**
1. Create HCA staff member
2. Check qualified_roles: Should be `["hca", "care_worker", "support_worker"]`
3. Create shift with role="support_worker"
4. Open ShiftAssignmentModal
5. Verify HCA staff appears in eligible list
6. Assign HCA to support_worker shift
7. Verify assignment saves

**Expected:** ✅ HCA can work Support Worker shifts

---

### Scenario 3: Notification Gating

**Steps:**
1. Admin edits staff with user_id=NULL (not signed up yet)
2. Saves changes
3. Check staff email: Should NOT receive notification
4. Staff signs up, activates account
5. Admin edits same staff again
6. Check staff email: Should receive "Profile Updated" email

**Expected:** ✅ No spam before activation

---

### Scenario 4: Document Bulk Upload

**Steps:**
1. Admin clicks "Upload Docs" on staff
2. Selects 3 PDF files
3. Sets document types: DBS, Right to Work, ID
4. Sets expiry dates
5. Clicks "Upload"
6. Goes to ComplianceTracker
7. Verifies 3 documents with "Uploaded by agency" badge
8. Staff logs in
9. Sees documents in their compliance section
10. Can download and verify

**Expected:** ✅ Documents uploaded and visible

---

## 📋 Production Rollout Checklist

### Pre-Rollout
- [ ] All modules tested individually
- [ ] All 4 test scenarios passed
- [ ] Database migrations deployed
- [ ] Edge functions deployed
- [ ] Git commit with message: "feat: Admin profile pre-fill & multi-role system"
- [ ] Backup database before rollout

### Rollout Steps
1. [ ] Deploy migrations:
   ```bash
   cd C:\Users\gbase\superbasecli
   ./supabase.exe db push --project-ref rzzxxkppkiasuouuglaf
   ```

2. [ ] Deploy edge functions:
   ```bash
   ./supabase.exe functions deploy profile-change-notifier --project-ref rzzxxkppkiasuouuglaf
   ```

3. [ ] Run CSV import:
   ```bash
   cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
   $env:SUPABASE_SERVICE_ROLE_KEY="[key]"
   node scripts/importDominionStaff.mjs
   ```

4. [ ] Verify import report: Check `dominion_doc/IMPORT_REPORT.json`

5. [ ] Test admin login: Go to /Staff page

6. [ ] Test one full flow with real staff

### Post-Rollout Monitoring
- [ ] Check Supabase logs for errors
- [ ] Monitor email delivery (Resend dashboard)
- [ ] Check staff sign-up rate (first 24 hours)
- [ ] Verify no notification spam complaints

### Dominion Admin Handoff
- [ ] Provide admin credentials
- [ ] Demo: How to edit staff profiles
- [ ] Demo: How to upload documents
- [ ] Demo: How to send invites
- [ ] Demo: How to check completion %
- [ ] Provide support contact

---

## 🚨 Rollback Plan

If critical issues occur:

### 1. Rollback Database
```bash
cd C:\Users\gbase\superbasecli
./supabase.exe db reset
```

### 2. Rollback Code
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
git log --oneline -5
git revert [commit_hash]
git push
```

### 3. Rollback Edge Functions
```bash
./supabase.exe functions delete profile-change-notifier
```

### 4. Rollback CSV Import
```sql
DELETE FROM staff
WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'
  AND profile_update_source = 'csv_import'
  AND created_date > '2025-12-17';
```

---

## 📊 Success Metrics

**Day 1:**
- ✅ All 45 Dominion staff imported
- ✅ Admin successfully edits profiles
- ✅ No critical errors in logs
- ✅ Zero notification spam complaints

**Week 1:**
- ✅ At least 30 staff (67%) complete profiles
- ✅ Multi-role assignments working
- ✅ Document uploads successful
- ✅ Admin satisfaction: "This saves us hours!"

---

## 🎓 Documentation for Dominion Admin

Create quick reference guide:
- How to edit staff before invite
- How to upload documents
- How to track completion %
- How to interpret qualified roles
- Support contact for issues

---

**MODULE 28 COMPLETE! SYSTEM READY FOR PRODUCTION.**

## 🎉 FINAL SUMMARY

All 8 modules documented:
✅ MODULE 21: Admin Profile Pre-Fill Core
✅ MODULE 22: Smart Profile Pre-Fill Engine
✅ MODULE 23: Multi-Role Qualification Engine
✅ MODULE 24: Document Bulk Upload
✅ MODULE 25: CSV Import Dominion Staff
✅ MODULE 26: Admin Preflight UX Enhancements
✅ MODULE 27: Notification Engine Enhancement
✅ MODULE 28: Integration Testing & Rollout

**Next Steps:** Execute modules in order, test thoroughly, and roll out to production for Dominion Healthcare.
