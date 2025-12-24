# MODULE 35: Implementation Checklist

## Phase 1: Backend (45 mins) 🔧

### Edge Function Creation
- [ ] Create `supabase/functions/staff-decline-shift/index.ts`
- [ ] Implement Step 1: Validation (shift exists, staff owns shift, not started)
- [ ] Implement Step 2: Fetch related data (staff, client, agency)
- [ ] Implement Step 3: Send unassignment notification
- [ ] Implement Step 4: Update shift status to 'open'
- [ ] Implement Step 5: Clean up orphaned timesheets
- [ ] Implement Step 6: Delete booking record
- [ ] Implement Step 7: Conditional automation
  - [ ] <24h: Set urgency='high', trigger urgent broadcast
  - [ ] >24h: Check agency settings, trigger auto-assign OR marketplace
- [ ] Implement Step 8: Notify agency admin
- [ ] Add CORS headers
- [ ] Test locally with `supabase functions serve`

### Database Permissions
- [ ] Create migration: `20251224_staff_self_decline_permissions.sql`
- [ ] Add RLS policy: "Staff can decline their own assigned shifts"
- [ ] Add RLS policy: "Staff can delete their own draft timesheets"
- [ ] Add RLS policy: "Staff can delete their own bookings"
- [ ] Test policies with `psql` or Supabase Studio
- [ ] Deploy migration: `supabase db push`

---

## Phase 2: Frontend (30 mins) 💻

### UI Components
- [ ] Open `src/pages/MyShifts.jsx` (or `StaffPortal.jsx`)
- [ ] Import required icons: `XCircle` from lucide-react
- [ ] Add "Decline Shift" button to shift cards
  - [ ] Show only for status='assigned' OR status='confirmed'
  - [ ] Disable for status='completed', 'cancelled'
  - [ ] Add destructive variant styling
- [ ] Add `handleDeclineShift` function
  - [ ] Calculate `hoursUntilShift`
  - [ ] Show appropriate warning message (urgent vs normal)
  - [ ] Add optional reason prompt
  - [ ] Call `staff-decline-shift` edge function
  - [ ] Handle success/error responses
  - [ ] Invalidate queries to refresh UI

### User Experience
- [ ] Test warning messages display correctly
- [ ] Test button disabled states
- [ ] Test loading states during API call
- [ ] Test success toast notification
- [ ] Test error handling

---

## Phase 3: Integration & Testing (15 mins) 🧪

### Integration Tests
- [ ] Deploy edge function: `supabase functions deploy staff-decline-shift`
- [ ] Test full flow in development environment
- [ ] Verify notifications sent (Email + SMS + WhatsApp)
- [ ] Verify shift status changes correctly
- [ ] Verify orphaned data cleaned up

### Test Scenarios
- [ ] **Test 1**: Decline shift >24h before (auto-assign enabled)
  - Expected: Shift status='open', auto-assignment triggered
- [ ] **Test 2**: Decline shift >24h before (marketplace enabled)
  - Expected: Shift added to marketplace
- [ ] **Test 3**: Decline shift <24h before
  - Expected: Urgency='high', urgent broadcast sent, marketplace visible
- [ ] **Test 4**: Try to decline with submitted timesheet
  - Expected: Error message, decline blocked
- [ ] **Test 5**: Try to decline shift assigned to someone else
  - Expected: 403 Unauthorized error
- [ ] **Test 6**: Try to decline past shift
  - Expected: Error message, decline blocked

### Edge Cases
- [ ] Staff declines shift that was just completed (race condition)
- [ ] Multiple staff try to pick up same declined shift simultaneously
- [ ] Network timeout during decline operation
- [ ] Edge function fails but database already updated (rollback needed?)

---

## Phase 4: Documentation & Deployment (10 mins) 📚

### Documentation
- [ ] Update `MASTER_MODULE_INDEX.md` with MODULE_35 entry
- [ ] Add user guide section: "How to Decline a Shift"
- [ ] Add admin guide section: "Managing Declined Shifts"
- [ ] Document edge function in functions list

### Deployment
- [ ] Review all changes with git diff
- [ ] Create feature branch: `feature/module-35-staff-self-decline`
- [ ] Commit changes with descriptive message
- [ ] Push to remote
- [ ] Create pull request
- [ ] Deploy to production after approval

---

## Rollback Plan 🔄

If issues occur in production:

1. **Immediate**: Disable frontend button
   ```jsx
   // Temporarily hide decline button
   {false && (shift.status === 'confirmed' || shift.status === 'assigned') && (
     <Button>Decline Shift</Button>
   )}
   ```

2. **Database**: Revert RLS policies
   ```sql
   DROP POLICY "Staff can decline their own assigned shifts" ON shifts;
   DROP POLICY "Staff can delete their own draft timesheets" ON timesheets;
   DROP POLICY "Staff can delete their own bookings" ON bookings;
   ```

3. **Edge Function**: Undeploy function
   ```bash
   # Function will return 404, frontend will show error
   ```

---

## Performance Considerations ⚡

- [ ] Edge function response time <2 seconds
- [ ] Notification delivery <30 seconds
- [ ] UI doesn't block during API call (async)
- [ ] Database queries optimized with indexes

---

## Security Checklist 🔒

- [ ] RLS policies prevent unauthorized declines
- [ ] Edge function validates staff_id matches shift assignment
- [ ] Cannot decline shifts belonging to other staff
- [ ] Cannot decline already-submitted timesheets
- [ ] Audit trail captured in shift_journey_log

---

## Known Limitations ⚠️

1. **No penalty system yet**: Staff can decline without consequence (Future: MODULE_36)
2. **No preferred replacement**: Cannot suggest who should replace them (Future enhancement)
3. **No decline window cutoff**: Can decline up to shift start (consider adding 4h cutoff)

---

## Success Criteria ✅

- [ ] Staff can decline shifts from Staff Portal
- [ ] Multi-channel notifications sent successfully
- [ ] Shift auto-reassigned or added to marketplace
- [ ] Orphaned data cleaned up automatically
- [ ] Zero security vulnerabilities
- [ ] All 6 test cases pass
- [ ] Documentation complete

---

**Next Steps After Completion:**

1. Monitor decline rates for first 2 weeks
2. Gather staff feedback on UX
3. Consider adding reliability scoring (MODULE_36)
4. Add admin dashboard for decline analytics

---

**Estimated Total Time:** 90 minutes

- Backend: 45 mins
- Frontend: 30 mins
- Testing: 15 mins
- Docs: 10 mins (included in phases above)
