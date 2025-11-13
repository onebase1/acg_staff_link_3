# Quick Start Guide - Hybrid Test Suite

## 🚀 Run Your First Test in 2 Minutes

### Prerequisites Check

1. ✅ Dev server is running (or will run in Terminal 1)
2. ✅ Dominion admin account exists: `info@guest-glow.com`
3. ✅ Seeded data in database (10 staff, 6 clients, 15+ shifts)
4. ✅ Environment variables set in `.env`

### Step 1: Start Dev Server (if not running)

```bash
# Terminal 1
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### Step 2: Run Hybrid Test Suite

```bash
# Terminal 2
npm run test:hybrid
```

This will:
- ✅ Test database integrity (10s)
- ✅ Test shift journey lifecycle (30s)
- ✅ Test notification system **including critical post-shift reminders** (45s)
- ✅ Test analytics calculations (20s)
- ✅ Generate comprehensive report

**Total Time**: ~2 minutes (vs 30+ minutes with pure Playwright)

### Step 3: Review Results

Check console output:

```
🚀 Starting Hybrid Test Suite for Dominion Agency Admin
════════════════════════════════════════════════════════════

📊 [1/5] Data Validation...
  ✅ Agency data: 10 staff, 6 clients, 15+ shifts
  
🔄 [2/5] Shift Journey Tests...
  ✅ Complete journey: OPEN → ASSIGNED → COMPLETED
  
📧 [3/5] Notification System Tests...
  ✅ Pre-shift reminders working
  🚨 CRITICAL: Post-shift reminders?
  
📈 [4/5] Analytics Validation...
  ✅ Stats update correctly

════════════════════════════════════════════════════════════
✅ Tests completed
📄 Report: TEST_REPORT.md
```

### Step 4: Open Detailed Report

```bash
# Open in your editor
code TEST_REPORT.md
```

The report includes:
- Executive summary (pass/fail rates)
- Critical issues (if any)
- Data validation details
- Shift journey results
- Notification system status
- Analytics validation
- Recommendations

---

## 🎯 Test Individual Components

### Test Only Data Integrity (Fast - 10s)

```bash
npm run test:data
```

Perfect for: Verifying database schema, checking for PGRST204 errors

### Test Only Notifications (Critical - 45s)

```bash
npm run test:notifications
```

Perfect for: Checking if post-shift reminders work (was broken in Base44)

### Test Only Analytics (Fast - 20s)

```bash
npm run test:analytics
```

Perfect for: Verifying dashboard stats update correctly

### Test Only UI (Slow - 3 min)

```bash
npm run test:ui
```

Perfect for: Visual testing, login flow, shift creation UI

---

## 🔍 What Each Test Checks

### Data Validation
- ✅ Dominion agency exists
- ✅ Has 10+ staff members
- ✅ Has 6+ clients
- ✅ Has 15+ shifts
- ✅ No missing columns (PGRST204)
- ✅ No orphaned records

### Shift Journey
- ✅ Create shift (OPEN status)
- ✅ Assign staff (ASSIGNED status)
- ✅ Confirm shift (CONFIRMED status)
- ✅ Mark in progress (IN_PROGRESS status)
- ✅ Complete shift (COMPLETED status)
- ✅ Financial lock applied
- ✅ Journey log complete
- ✅ Cancellation flow works

### Notifications (CRITICAL)
- ✅ 24h reminder (SMS + WhatsApp)
- ✅ 2h reminder (SMS + WhatsApp)
- 🚨 **Post-shift timesheet reminder** (was broken in Base44)
  - SMS delivery
  - WhatsApp delivery
  - Email delivery
- ✅ Reminder flags updated
- ✅ Reminder engine active

### Analytics
- ✅ Open shifts count updates
- ✅ Assigned shifts count updates
- ✅ Completed shifts count updates
- ✅ Revenue calculated correctly (hours × charge rate)
- ✅ Cancelled shifts don't affect revenue

---

## 🚨 Common Issues & Fixes

### Issue: Authentication Failed

**Error**: `Authentication failed: Invalid credentials`

**Fix**:
```bash
# Verify .env file exists with correct values
cat .env | grep SUPABASE

# Should show:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-key-here
```

### Issue: No Seeded Data

**Error**: `Staff count low: expected 10+, got 0`

**Fix**: Run seed data generation first (refer to seed data docs)

### Issue: Edge Functions Not Found

**Error**: `Function not found: sendSMS`

**Fix**: 
1. Check Supabase dashboard → Edge Functions
2. Verify functions are deployed
3. Check function names match exactly

### Issue: PGRST204 Errors

**Error**: `PGRST204: column "reminder_24h_sent" does not exist`

**Fix**: Database schema migration needed (already done if you ran migrations)

---

## 📊 Interpreting Results

### All Green ✅
```
📊 Results: 20/20 passed (100%)
```
**Action**: Great! All systems operational.

### With Warnings ⚠️
```
📊 Results: 18/20 passed (90%)
⚠️  2 warnings
```
**Action**: Review TEST_REPORT.md for details. Warnings are informational.

### With Critical Issues 🚨
```
📊 Results: 15/20 passed (75%)
🚨 1 CRITICAL issue found
```
**Action**: 
1. Open TEST_REPORT.md
2. Look for "Critical Issues" section
3. Fix critical issues first
4. Re-run tests

---

## 🎓 Understanding Test Output

### Symbols Meaning

- ✅ **Test Passed**: Feature working correctly
- ⚠️ **Warning**: Works but needs attention
- ❌ **Failed**: Feature broken, needs fix
- 🚨 **Critical**: Urgent issue, blocks functionality

### Time Estimates

- **Data Validation**: 10 seconds
- **Shift Journey**: 30 seconds
- **Notifications**: 45 seconds
- **Analytics**: 20 seconds
- **UI Tests**: 3 minutes (optional)

**Total (hybrid)**: ~2 minutes (without UI)  
**Total (with UI)**: ~5 minutes  

---

## 💡 Pro Tips

1. **Run hybrid tests frequently** (2 min) for quick validation
2. **Run UI tests separately** (3 min) when testing visual changes
3. **Focus on critical tests** (notifications) after notification changes
4. **Check TEST_REPORT.md** for detailed analysis and recommendations

---

## 🔗 More Information

- **Full Documentation**: `tests/README.md`
- **Implementation Details**: `HYBRID_TEST_SUITE_IMPLEMENTATION.md`
- **Test Files**: `tests/` directory

---

## ✅ Next Steps After First Run

1. ✅ Review `TEST_REPORT.md`
2. ✅ Fix any CRITICAL issues
3. ✅ Address HIGH priority issues
4. ✅ Run tests again to verify fixes
5. ✅ Integrate into CI/CD pipeline (fast enough!)

---

**Ready? Let's go! 🚀**

```bash
npm run test:hybrid
```





