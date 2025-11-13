# Pipeline Test Suite Report

**Generated**: 11/11/2025, 11:28:13  
**Duration**: 11.6s  
**Status**: ❌ FAILED  

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 44 |
| ✅ Passed | 8 |
| ❌ Failed | 36 |
| ⏭️  Skipped | 0 |
| Success Rate | 18.2% |

## Pipeline Results

### 1. ❌ Shift Journey Pipeline

**Status**: FAILED  
**Tests Passed**: 4/16  
**Duration**: 3.8s  
**Failed At**: sj-001  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| sj-001 | Receive care home email | ❌ FAIL | 0.45s |
| sj-002 | AI parses email | ❌ FAIL | 0.05s |
| sj-003 | Create shift record | ✅ PASS | 0.41s |
| sj-004 | Assign staff to shift | ❌ FAIL | 0.44s |
| sj-005 | Send shift assignment notification | ❌ FAIL | 1.36s |
| sj-006 | Create draft timesheet | ❌ FAIL | 0.23s |
| sj-007 | Send 24h reminder | ✅ PASS | 0.07s |
| sj-008 | Send 2h reminder | ✅ PASS | 0.09s |
| sj-009 | GPS clock-in | ❌ FAIL | 0.00s |
| sj-010 | Upload timesheet document | ❌ FAIL | 0.00s |
| sj-011 | AI OCR extraction | ❌ FAIL | 0.07s |
| sj-012 | Auto-approve timesheet | ❌ FAIL | 0.00s |
| sj-013 | Mark shift completed | ✅ PASS | 0.47s |
| sj-014 | Generate invoice | ❌ FAIL | 0.15s |
| sj-015 | Send invoice to client | ❌ FAIL | 0.00s |
| sj-016 | Payment reminder | ❌ FAIL | 0.00s |

**Error**: Edge Function returned a non-2xx status code (status: unknown)

### 2. ❌ Automation Pipeline

**Status**: FAILED  
**Tests Passed**: 0/6  
**Duration**: 0.9s  
**Failed At**: auto-001  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| auto-001 | Daily shift closure engine | ❌ FAIL | 0.25s |
| auto-002 | No-show detection | ❌ FAIL | 0.40s |
| auto-003 | Compliance expiry reminders | ❌ FAIL | 0.05s |
| auto-004 | Notification batching | ❌ FAIL | 0.06s |
| auto-005 | Timesheet batch processor | ❌ FAIL | 0.07s |
| auto-006 | Staff daily digest | ❌ FAIL | 0.06s |

**Error**: Edge Function returned a non-2xx status code (status: unknown)

### 3. ❌ Financial Integrity Pipeline

**Status**: FAILED  
**Tests Passed**: 1/6  
**Duration**: 1.0s  
**Failed At**: fin-002  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| fin-001 | Financial lock enforcement | ✅ PASS | 0.05s |
| fin-002 | Immutable invoice snapshot | ❌ FAIL | 0.11s |
| fin-003 | Change log creation | ❌ FAIL | 0.72s |
| fin-004 | Invoice amendment workflow | ❌ FAIL | 0.06s |
| fin-005 | Rate card validation | ❌ FAIL | 0.05s |
| fin-006 | Work location validation | ❌ FAIL | 0.05s |

**Error**: undefined

### 4. ❌ Communication Pipeline

**Status**: FAILED  
**Tests Passed**: 0/6  
**Duration**: 4.1s  
**Failed At**: comm-001  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| comm-001 | Send email (Resend) | ❌ FAIL | 1.28s |
| comm-002 | Send SMS (Twilio) | ❌ FAIL | 1.28s |
| comm-003 | Send WhatsApp (Twilio) | ❌ FAIL | 1.40s |
| comm-004 | WhatsApp bot response | ❌ FAIL | 0.06s |
| comm-005 | Email batching | ❌ FAIL | 0.06s |
| comm-006 | Multi-channel fallback | ❌ FAIL | 0.06s |

**Error**: Edge Function returned a non-2xx status code (status: unknown)

### 5. ❌ Data & Analytics Pipeline

**Status**: FAILED  
**Tests Passed**: 3/5  
**Duration**: 0.4s  
**Failed At**: data-003  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| data-001 | Shift journey log | ✅ PASS | 0.06s |
| data-002 | Performance metrics | ✅ PASS | 0.13s |
| data-003 | Timesheet analytics | ❌ FAIL | 0.05s |
| data-004 | CSV export | ❌ FAIL | 0.05s |
| data-005 | CFO dashboard | ✅ PASS | 0.14s |

**Error**: undefined

### 6. ❌ External Integrations

**Status**: FAILED  
**Tests Passed**: 0/5  
**Duration**: 0.7s  
**Failed At**: int-001  

#### Test Results

| Test ID | Action | Status | Duration |
|---------|--------|--------|----------|
| int-001 | OpenAI API (InvokeLLM) | ❌ FAIL | 0.06s |
| int-002 | Resend API health | ❌ FAIL | 0.24s |
| int-003 | Twilio API health | ❌ FAIL | 0.23s |
| int-004 | Base44 file storage | ❌ FAIL | 0.06s |
| int-005 | Resend webhook config | ❌ FAIL | 0.06s |

**Error**: Edge Function returned a non-2xx status code (status: unknown)

## Verdict

❌ **SYSTEM NOT PRODUCTION READY**

One or more pipelines failed. Review the failures above and implement fixes before deploying to production.

### Action Items

- **Shift Journey Pipeline**: Fix sj-001 - Receive care home email
  - Error: Edge Function returned a non-2xx status code (status: unknown)
- **Automation Pipeline**: Fix auto-001 - Daily shift closure engine
  - Error: Edge Function returned a non-2xx status code (status: unknown)
- **Financial Integrity Pipeline**: Fix fin-002 - Immutable invoice snapshot
  - Error: undefined
- **Communication Pipeline**: Fix comm-001 - Send email (Resend)
  - Error: Edge Function returned a non-2xx status code (status: unknown)
- **Data & Analytics Pipeline**: Fix data-003 - Timesheet analytics
  - Error: undefined
- **External Integrations**: Fix int-001 - OpenAI API (InvokeLLM)
  - Error: Edge Function returned a non-2xx status code (status: unknown)
