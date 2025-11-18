# Pipeline Test Suite - Quick Start Guide

## 30-Second Start

```bash
# 1. Ensure dev server is running
npm run dev

# 2. Run all pipeline tests
npm run test:pipelines
```

## What is This?

A comprehensive test suite that validates **44 critical paths** across **6 pipelines**. When all tests pass, your system is production ready.

## Prerequisites

1. **Dev server running**:
   ```bash
   npm run dev  # Terminal 1
   ```

2. **Environment variables** (`.env`):
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Seeded database** with Dominion agency data

## Quick Commands

```bash
# Run everything (5-10 minutes)
npm run test:pipelines

# Run specific pipeline (1-2 minutes each)
npm run test:pipeline:shift-journey      # Most critical
npm run test:pipeline:automation         # Background jobs
npm run test:pipeline:financial          # Financial controls
npm run test:pipeline:communication      # SMS/Email/WhatsApp
npm run test:pipeline:analytics          # Data & reporting
npm run test:pipeline:integrations       # External APIs

# Verbose output (shows details)
npm run test:pipelines -- --verbose

# Stop at specific test (for debugging)
npm run test:pipelines -- --stop-at=sj-010
```

## Understanding Results

### ✅ All Passed (Production Ready)

```
PIPELINE SUITE RESULT: ✅ PASSED

Pipelines Summary:
  ✅ Shift Journey: 16/16 (100%)
  ✅ Automation: 6/6 (100%)
  ✅ Financial Integrity: 6/6 (100%)
  ✅ Communication: 6/6 (100%)
  ✅ Data & Analytics: 5/5 (100%)
  ✅ External Integrations: 5/5 (100%)

Overall: 44/44 tests passed (100%)

🎉 ALL TESTS PASSED - SYSTEM PRODUCTION READY
```

**Action**: Deploy to production!

### ❌ Some Failed (Not Ready)

```
PIPELINE SUITE RESULT: ❌ FAILED

Pipeline 1/6: Shift Journey Pipeline
  ✅ sj-001: Receive care home email (2.3s)
  ❌ sj-002: AI parses email FAILED
      Error: OpenAI API key not configured
  ⏭️  sj-003-016: Skipped (fail fast)
  ❌ Pipeline 1: FAILED (1/16 tests)

⚠️  SYSTEM NOT PRODUCTION READY
Critical failure detected in Shift Journey Pipeline (sj-002)
```

**Action**: Fix the error and re-run.

## Reports Generated

After each run, three reports are created:

1. **Console** - Real-time output
2. **`PIPELINE_TEST_REPORT.json`** - Machine-readable
3. **`PIPELINE_TEST_REPORT.md`** - Human-readable with details

## Typical Development Workflow

### 1. Implementing a Feature

```bash
# Example: Implementing email webhook
npm run test:pipeline:shift-journey -- --stop-at=sj-001
```

Fix until `sj-001` passes, then move to `sj-002`.

### 2. Before Committing

```bash
npm run test:pipelines
```

Ensure nothing broke.

### 3. Before Deploying

```bash
npm run test:pipelines -- --ci
```

Verify all critical paths work.

## Common Issues

### Issue: "Test not yet implemented"

**Cause**: Test function exists but is not implemented yet.

**Fix**: Implement the test or skip it:
```bash
npm run test:pipelines -- --skip=sj-001
```

### Issue: "VITE_SUPABASE_URL is not set"

**Cause**: Missing `.env` file or variables.

**Fix**: Create `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```

### Issue: "Failed to authenticate"

**Cause**: Invalid Supabase credentials or Dominion agency doesn't exist.

**Fix**: 
1. Verify `.env` credentials
2. Ensure Dominion agency exists with `info@guest-glow.com` / `Dominion#2025`

### Issue: "No shift ID available in context"

**Cause**: Earlier test in pipeline failed to create shift.

**Fix**: Run with `--verbose` to see which test failed:
```bash
npm run test:pipelines -- --verbose
```

## What Gets Tested?

### Shift Journey (16 tests)
Email → Parse → Create → Assign → Notify → Timesheet → Invoice → Payment

### Automation (6 tests)
Daily closures, no-show detection, compliance alerts, batching

### Financial Integrity (6 tests)
Locks, immutability, audit trails, validations

### Communication (6 tests)
Email, SMS, WhatsApp, batching, fallbacks

### Data & Analytics (5 tests)
Journey logs, metrics, exports, dashboards

### External Integrations (5 tests)
OpenAI, Resend, Twilio, Base44, webhooks

## Next Steps

1. **Read full docs**: `tests/pipeline/README.md`
2. **Review CSV**: `critical_path_testing_matrix.csv`
3. **Implement tests**: Start with `sj-001` (email webhook)
4. **Run tests**: `npm run test:pipelines`
5. **Deploy when green**: All 44 tests pass = production ready!

## Philosophy

> **Sequential, fail-fast, comprehensive**

Unlike unit tests that run in isolation, pipeline tests:
- Run in order (test 2 needs test 1's data)
- Fail fast (if step 3 fails, skip 4-16)
- Validate end-to-end flows (not just components)

When all pipelines pass → System works as a whole → Production ready ✅

---

**Questions?** Check `tests/pipeline/README.md` for detailed documentation.






