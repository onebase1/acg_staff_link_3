# Pipeline Test Suite - Critical Path Validation

## Overview

The Pipeline Test Suite is a comprehensive end-to-end testing system that validates all critical paths in the Dominion agency application. Unlike the hybrid test suite which tests components in isolation, this suite runs **sequential pipeline tests** where each step must succeed for the next to run.

## Key Concept

> **If ALL 44 tests pass across 6 pipelines → System is production ready**

The test suite implements a **fail-fast strategy**: if any test fails, the pipeline stops immediately, preventing false positives from tests that depend on earlier steps.

## Architecture

### Components

1. **CSV Parser** (`csv-parser.ts`): Reads `critical_path_testing_matrix.csv` and converts it to test definitions
2. **Test Registry** (`test-registry.ts`): Maps each test ID to executable function
3. **Pipeline Executor** (`pipeline-executor.ts`): Runs tests sequentially with fail-fast logic
4. **Test Context** (`types.ts`): Shared state between tests in a pipeline
5. **Reporter** (`reporter.ts`): Generates console, JSON, and Markdown reports
6. **CLI** (`cli.ts`): Command-line interface with filtering options

### Test Implementations

- `implementations/shift-journey.ts` - 16 tests (sj-001 through sj-016)
- `implementations/automation.ts` - 6 tests (auto-001 through auto-006)
- `implementations/financial-integrity.ts` - 6 tests (fin-001 through fin-006)
- `implementations/communication.ts` - 6 tests (comm-001 through comm-006)
- `implementations/data-analytics.ts` - 5 tests (data-001 through data-005)
- `implementations/integrations.ts` - 5 tests (int-001 through int-005)

## Usage

### Run All Pipelines

```bash
npm run test:pipelines
```

This executes all 44 tests across 6 pipelines sequentially.

### Run Specific Pipeline

```bash
# Shift Journey (16 tests)
npm run test:pipeline:shift-journey

# Automation (6 tests)
npm run test:pipeline:automation

# Financial Integrity (6 tests)
npm run test:pipeline:financial

# Communication (6 tests)
npm run test:pipeline:communication

# Data & Analytics (5 tests)
npm run test:pipeline:analytics

# External Integrations (5 tests)
npm run test:pipeline:integrations
```

### Advanced Options

```bash
# Verbose output with detailed logs
npm run test:pipelines -- --verbose

# Stop at specific test
npm run test:pipelines -- --stop-at=sj-010

# Skip specific tests
npm run test:pipelines -- --skip=auto-002,comm-004

# CI mode (strict error handling)
npm run test:pipelines -- --ci

# Help
npm run test:pipelines -- --help
```

## Test Pipelines

### 1. Shift Journey Pipeline (16 tests)

Tests the complete shift lifecycle from email request to payment:

- sj-001: Email webhook receipt ⚠️ **CRITICAL - System entry point**
- sj-002: AI email parsing with confidence scoring
- sj-003: Create shift record in database
- sj-004: Assign staff to shift
- sj-005: Send assignment notification
- sj-006: Create draft timesheet
- sj-007: Send 24h reminder
- sj-008: Send 2h reminder
- sj-009: GPS clock-in validation
- sj-010: Upload timesheet document
- sj-011: AI OCR extraction
- sj-012: Auto-approve timesheet
- sj-013: Mark shift completed
- sj-014: Generate invoice
- sj-015: Send invoice to client
- sj-016: Payment reminder

### 2. Automation Pipeline (6 tests)

Tests background automation engines:

- auto-001: Daily shift closure engine
- auto-002: No-show detection ⚠️ **Prevents revenue loss**
- auto-003: Compliance expiry reminders
- auto-004: Notification batching (5-min queue)
- auto-005: Timesheet batch processor
- auto-006: Staff daily digest

### 3. Financial Integrity Pipeline (6 tests)

Tests financial controls and audit trails:

- fin-001: Financial lock enforcement
- fin-002: Immutable invoice snapshot
- fin-003: Change log creation ⚠️ **Compliance requirement**
- fin-004: Invoice amendment workflow
- fin-005: Rate card validation
- fin-006: Work location validation

### 4. Communication Pipeline (6 tests)

Tests multi-channel notification system:

- comm-001: Send email (Resend API)
- comm-002: Send SMS (Twilio API)
- comm-003: Send WhatsApp (Twilio API)
- comm-004: WhatsApp bot response
- comm-005: Email batching
- comm-006: Multi-channel fallback

### 5. Data & Analytics Pipeline (5 tests)

Tests data integrity and reporting:

- data-001: Shift journey log audit trail
- data-002: Performance metrics calculation
- data-003: Timesheet analytics
- data-004: CSV export functionality
- data-005: CFO dashboard accuracy

### 6. External Integrations Pipeline (5 tests)

Tests third-party API connectivity:

- int-001: OpenAI API (InvokeLLM)
- int-002: Resend API health
- int-003: Twilio API health
- int-004: Base44 file storage
- int-005: Resend webhook config

## Reports

After running tests, three reports are generated:

### 1. Console Output

Real-time progress with pass/fail indicators:

```
🚀 Pipeline Test Suite - Critical Path Validation
═══════════════════════════════════════════════════════════

Pipeline 1/6: Shift Journey Pipeline
  ✅ sj-001: Receive care home email (2.3s)
  ✅ sj-002: AI parses email - confidence: 0.94 (3.1s)
  ✅ sj-003: Create shift record (0.8s)
  ...
  ✅ Pipeline 1: PASSED (16/16 tests in 27.4s)
```

### 2. JSON Report

Machine-readable report at `PIPELINE_TEST_REPORT.json`:

```json
{
  "timestamp": "2025-11-11T...",
  "duration": 45.2,
  "status": "PASSED",
  "pipelines": [...],
  "summary": {
    "totalTests": 44,
    "passed": 44,
    "failed": 0,
    "skipped": 0
  }
}
```

### 3. Markdown Report

Human-readable report at `PIPELINE_TEST_REPORT.md` with:
- Executive summary
- Detailed test results
- Failure analysis
- Action items

## Fail-Fast Strategy

The suite implements fail-fast logic at two levels:

### 1. Within a Pipeline

If test sj-003 fails, tests sj-004 through sj-016 are skipped.

**Rationale**: If shift creation fails, there's no point testing shift assignment.

### 2. Between Pipelines (Optional)

If Shift Journey pipeline fails, remaining pipelines can be skipped.

**Rationale**: Focus on fixing the first failure before running more tests.

## Success Criteria

System is **production ready** when:

```
✅ Shift Journey Pipeline: 16/16 tests passed
✅ Automation Pipeline: 6/6 tests passed
✅ Financial Integrity Pipeline: 6/6 tests passed
✅ Communication Pipeline: 6/6 tests passed
✅ Data & Analytics Pipeline: 5/5 tests passed
✅ External Integrations Pipeline: 5/5 tests passed

🎉 ALL 44 TESTS PASSED - SYSTEM PRODUCTION READY
```

## Comparison with Hybrid Suite

| Aspect | Hybrid Suite | Pipeline Suite |
|--------|-------------|----------------|
| **Goal** | Component testing | End-to-end validation |
| **Execution** | Parallel/isolated | Sequential pipelines |
| **Failure** | Test fails, others continue | Pipeline fails, stop immediately |
| **Coverage** | ~17% of critical paths | 100% of critical paths |
| **Verdict** | "Some things work" | "System works" or "System broken" |
| **Use Case** | Development/debugging | Pre-production validation |
| **Speed** | ~2 minutes | ~5-10 minutes |

## Implementation Status

### Core Infrastructure

✅ CSV Parser - Parse test definitions from CSV
✅ Test Registry - Map test IDs to functions  
✅ Pipeline Executor - Sequential execution with fail-fast  
✅ Test Context - Shared state between tests  
✅ Reporter - Console, JSON, and Markdown reports  
✅ CLI - Command-line interface with options  

### Test Implementations

🟨 Shift Journey: 4/16 implemented (sj-003, sj-004, sj-007, sj-008, sj-013)  
🟨 Automation: 0/6 implemented (placeholders)  
🟨 Financial Integrity: 1/6 implemented (fin-001)  
🟨 Communication: 3/6 implemented (comm-001, comm-002, comm-003)  
🟨 Data & Analytics: 2/5 implemented (data-001, data-002)  
🟨 Communication: 2/5 implemented (int-002, int-003)  

**Note**: Not yet implemented tests will fail with "Test not yet implemented" error. This is intentional - tests should be implemented as features are completed.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Pipeline Tests

on:
  pull_request:
    branches: [main]
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Run dev server
        run: npm run dev &
      
      - name: Run pipeline tests
        run: npm run test:pipelines -- --ci
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: |
            PIPELINE_TEST_REPORT.json
            PIPELINE_TEST_REPORT.md
```

### Pre-Deployment Check

```bash
#!/bin/bash
# deploy.sh

echo "Running pipeline tests before deployment..."
npm run test:pipelines

if [ $? -eq 0 ]; then
  echo "✅ All tests passed - Deploying to production"
  # Your deployment commands here
else
  echo "❌ Tests failed - Blocking deployment"
  exit 1
fi
```

## Development Workflow

1. **After implementing a feature**: Run relevant pipeline
   ```bash
   npm run test:pipeline:shift-journey
   ```

2. **Before committing**: Run all pipelines
   ```bash
   npm run test:pipelines
   ```

3. **Before deploying**: Run pipelines in CI
   ```bash
   npm run test:pipelines -- --ci
   ```

## Troubleshooting

### All tests failing with "Test not yet implemented"

This is expected! Implement tests as you build features. Start with critical tests like `sj-001` (email webhook).

### Authentication errors

Ensure `.env` file has:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Dev server not running

Pipeline tests require the dev server to be running:
```bash
npm run dev  # Terminal 1
npm run test:pipelines  # Terminal 2
```

### Need to debug a specific test

Use verbose mode and stop at the test:
```bash
npm run test:pipelines -- --verbose --stop-at=sj-010
```

## Contributing

When implementing a new test:

1. Locate the implementation file (e.g., `implementations/shift-journey.ts`)
2. Find the test function (e.g., `testEmailWebhookReceipt`)
3. Replace `throw new Error('Test not yet implemented')` with actual test logic
4. Return `TestResult` with `passed: true/false`
5. Run the specific pipeline to verify
6. Update this README if test coverage changes

## Support

For questions or issues:
- Check `critical_path_testing_matrix.csv` for test specifications
- Review existing implemented tests for patterns
- Refer to hybrid suite (`tests/helpers/`) for reusable logic

---

**Remember**: When all 44 tests pass, your system is production ready! 🎉





