# Hybrid Test Suite for Dominion Agency

This test suite uses a hybrid approach combining Playwright UI tests, direct Supabase queries, and Edge Function invocation for comprehensive, fast, and reliable testing.

## Architecture

### Test Strategy

1. **Playwright (20%)** - UI critical paths only
   - Login flow
   - Shift creation UI
   - Dashboard visual checks
   - Status update actions

2. **Direct Supabase Queries (50%)** - Data validation
   - Agency data verification
   - Shift journey validation
   - Analytics calculations
   - Data integrity checks

3. **Edge Function Invocation (20%)** - Notification system
   - Pre-shift reminders (24h, 2h)
   - Post-shift timesheet reminders (CRITICAL - was broken in Base44)
   - Reminder engine status

4. **Monitoring Script (10%)** - Orchestration
   - Runs all tests in sequence
   - Generates comprehensive report
   - Tracks issues and performance

## Prerequisites

1. **Environment Variables**
   Create a `.env` file with:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key (optional)
   ```

2. **Dominion Admin Account**
   - Email: `info@guest-glow.com`
   - Password: `Dominion#2025`
   - Agency: `Dominion Healthcare Services Ltd`

3. **Seeded Test Data**
   - At least 10 staff members
   - At least 6 clients
   - At least 15 shifts

## Installation

```bash
# Install dependencies (if not already installed)
npm install

# Install tsx for running TypeScript directly
npm install -D tsx
```

## Running Tests

### Run All Tests (Recommended)

```bash
# Run complete hybrid test suite
npm run test:hybrid

# Or directly with tsx
npx tsx tests/run-all-tests.ts
```

### Run Individual Test Suites

```bash
# Data validation only (fast - 10s)
npx tsx tests/data-validation.ts

# Shift journey tests (medium - 30s)
npx tsx tests/shift-journey.ts

# Notification tests (critical - 45s)
npx tsx tests/notifications.ts

# Analytics validation (fast - 20s)
npx tsx tests/analytics.ts

# Playwright UI tests (slow - 3 min)
npx playwright test tests/ui
```

### With Dev Server Running

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:hybrid
```

## Test Results

### Output

Tests will generate:
- **Console output** with detailed progress and results
- **TEST_REPORT.md** - Comprehensive markdown report
- **Playwright report** - For UI tests (if run)

### Sample Output

```
🚀 Starting Hybrid Test Suite for Dominion Agency Admin
════════════════════════════════════════════════════════════

📊 [1/5] Data Validation...
  ✅ Agency data: 10 staff, 6 clients, 15+ shifts
  ✅ Data integrity: No missing columns, no orphaned records
  ✅ All pages have data

🔄 [2/5] Shift Journey Tests...
  ✅ Complete journey: OPEN → ASSIGNED → COMPLETED
  ✅ Journey log: All transitions recorded
  ✅ Cancellation: Change logs created

📧 [3/5] Notification System Tests...
  ✅ Pre-shift 24h reminder: SMS + WhatsApp sent
  ✅ Pre-shift 2h reminder: SMS + WhatsApp sent
  🚨 CRITICAL: Post-shift reminders BROKEN (same as Base44)

📈 [4/5] Analytics Validation...
  ✅ Dashboard stats update correctly
  ✅ Revenue calculations accurate

🎭 [5/5] Playwright UI Tests...
  ✅ Login flow works
  ✅ Shift creation UI functional

════════════════════════════════════════════════════════════
✅ Tests completed in 4.5 minutes
📊 Results: 18/20 passed (90%)
🚨 1 CRITICAL issue found
📄 Report: TEST_REPORT.md
```

## Test Coverage

### 1. Data Validation (`tests/data-validation.ts`)

- ✅ Agency data exists (staff, clients, shifts)
- ✅ All tables have seeded data
- ✅ No missing columns (PGRST204 errors)
- ✅ No orphaned records
- ✅ Foreign key integrity

### 2. Shift Journey (`tests/shift-journey.ts`)

**Complete Journey:**
- ✅ Shift creation (OPEN)
- ✅ Staff assignment (ASSIGNED)
- ✅ Confirmation (CONFIRMED)
- ✅ In progress (IN_PROGRESS)
- ✅ Completion (COMPLETED)
- ✅ Financial lock
- ✅ Invoice generation
- ✅ Journey log completeness

**Cancellation:**
- ✅ Shift cancellation
- ✅ Change log creation
- ✅ Notification queuing
- ✅ Journey log update

### 3. Notifications (`tests/notifications.ts`)

**Pre-Shift Reminders:**
- ✅ 24h reminder (SMS + WhatsApp + Email)
- ✅ 2h reminder (SMS + WhatsApp)
- ✅ Reminder flags updated
- ✅ Timestamps recorded

**Post-Shift Reminders (CRITICAL):**
- ⚠️ Timesheet reminder (SMS + WhatsApp)
- ⚠️ This was BROKEN in Base44
- ✅ Test validates if fixed

**Reminder Engine:**
- ✅ Status check
- ✅ Cron schedule verification
- ✅ Last run timestamp

### 4. Analytics (`tests/analytics.ts`)

- ✅ Dashboard stats calculations
- ✅ Shift count updates (open/assigned/completed)
- ✅ Revenue calculations
- ✅ Cancellation impact on metrics
- ✅ Real-time updates

### 5. UI Tests (`tests/ui/critical-flows.spec.ts`)

- ✅ Login flow
- ✅ Dashboard loading
- ✅ Shift creation form
- ✅ Status update actions
- ✅ Sidebar navigation
- ✅ Page load performance
- ✅ Console error detection
- ✅ PGRST204 error detection

## Advantages Over Pure Playwright

| Aspect | Hybrid Approach | Pure Playwright |
|--------|----------------|-----------------|
| **Speed** | 4-5 minutes | 30+ minutes |
| **Reliability** | No timing issues | Flaky waits |
| **Coverage** | Edge Functions + DB | UI only |
| **Debugging** | Isolate layers | Hard to debug |
| **Maintenance** | Easy updates | Brittle selectors |
| **CI/CD Ready** | Fast enough | Too slow |

## Troubleshooting

### Authentication Fails

```bash
# Verify credentials
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx tsx tests/data-validation.ts
```

### Missing Seeded Data

```bash
# Run seed data generation
# (Refer to seed data documentation)
```

### Edge Functions Not Working

- Check if functions are deployed
- Verify function names match
- Check Supabase function logs

### Playwright Timeouts

```bash
# Run with headed mode for debugging
npx playwright test tests/ui --headed --slowmo=500
```

## File Structure

```
tests/
├── README.md                      # This file
├── test-config.ts                 # Configuration
├── helpers/
│   ├── supabase-queries.ts       # DB query helper
│   └── function-tester.ts        # Edge Function tester
├── ui/
│   └── critical-flows.spec.ts    # Playwright tests
├── data-validation.ts            # Data checks
├── shift-journey.ts              # Journey validation
├── notifications.ts              # Reminder tests (CRITICAL)
├── analytics.ts                  # Analytics validation
├── run-all-tests.ts             # Master orchestrator
└── generate-report.ts           # Report generator
```

## Contributing

When adding new tests:

1. Add to appropriate test file
2. Update `run-all-tests.ts` if new test category
3. Update this README
4. Ensure tests can run standalone
5. Add proper error handling

## Known Issues

1. **Post-Shift Reminders**: Currently broken (same as Base44)
   - Timesheet reminders via SMS/WhatsApp not working
   - Test will detect and report this

2. **Invoice Generation**: May not work in test environment
   - Tests will warn but not fail

3. **Notification Queue**: May be empty in test environment
   - Tests check but don't require

## Next Steps

After running tests:

1. Review `TEST_REPORT.md`
2. Fix any CRITICAL issues
3. Address HIGH priority issues
4. Consider MEDIUM issues
5. Run tests again to verify fixes








