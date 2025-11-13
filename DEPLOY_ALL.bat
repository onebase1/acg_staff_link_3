@echo off
setlocal enabledelayedexpansion

REM =============================================================================
REM SUPABASE EDGE FUNCTIONS DEPLOYMENT SCRIPT (Windows Batch)
REM =============================================================================
REM Deploys all 44 converted functions to Supabase
REM Run from project root: DEPLOY_ALL.bat
REM =============================================================================

cd /d C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3

set SUPABASE_CLI=C:\Users\gbase\superbasecli\supabase.exe
set PROJECT_REF=rzzxxkppkiasuouuglaf
set DEPLOYED=0
set FAILED=0
set TOTAL=44

echo.
echo ========================================
echo 🚀 DEPLOYING ALL 44 SUPABASE FUNCTIONS
echo ========================================
echo.

REM Communication Functions (6)
echo.
echo 📧 [1/6] Communication Functions...
call :deploy_function "send-email"
call :deploy_function "send-sms"
call :deploy_function "send-whatsapp"
call :deploy_function "whatsapp-master-router"
call :deploy_function "incoming-sms-handler"
call :deploy_function "email-automation-engine"

REM Invoice & Payment Functions (3)
echo.
echo 💰 [2/6] Invoice & Payment Functions...
call :deploy_function "auto-invoice-generator"
call :deploy_function "send-invoice"
call :deploy_function "payment-reminder-engine"

REM Timesheet Functions (8)
echo.
echo 📋 [3/6] Timesheet Functions...
call :deploy_function "intelligent-timesheet-validator"
call :deploy_function "auto-timesheet-creator"
call :deploy_function "extract-timesheet-data"
call :deploy_function "scheduled-timesheet-processor"
call :deploy_function "post-shift-timesheet-reminder"
call :deploy_function "whatsapp-timesheet-handler"
call :deploy_function "auto-timesheet-approval-engine"
call :deploy_function "auto-approval-engine"

REM Shift Management Functions (10)
echo.
echo 📅 [4/6] Shift Management Functions...
call :deploy_function "shift-status-automation"
call :deploy_function "urgent-shift-escalation"
call :deploy_function "shift-reminder-engine"
call :deploy_function "ai-shift-matcher"
call :deploy_function "validate-shift-eligibility"
call :deploy_function "shift-verification-chain"
call :deploy_function "daily-shift-closure-engine"
call :deploy_function "no-show-detection-engine"
call :deploy_function "care-home-inbound-email"
call :deploy_function "generateShiftDescription"

REM Compliance & Validation Functions (5)
echo.
echo 🛡️ [5/6] Compliance & Validation Functions...
call :deploy_function "geofence-validator"
call :deploy_function "compliance-monitor"
call :deploy_function "financial-data-validator"
call :deploy_function "validate-bulk-import"
call :deploy_function "extractDocumentDates"

REM Automation Engines (7)
echo.
echo ⚙️ [6/6] Automation Engines...
call :deploy_function "smart-escalation-engine"
call :deploy_function "client-communication-automation"
call :deploy_function "staff-daily-digest-engine"
call :deploy_function "notification-digest-engine"
call :deploy_function "critical-change-notifier"
call :deploy_function "enhanced-whatsapp-offers"

REM Onboarding Functions (4)
echo.
echo 👋 Onboarding Functions...
call :deploy_function "welcome-agency"
call :deploy_function "new-user-signup-handler"
call :deploy_function "incomplete-profile-reminder"
call :deploy_function "send-agency-admin-invite"

REM Utility Functions (2)
echo.
echo 🔧 Utility Functions...
call :deploy_function "ping-test-1"
call :deploy_function "ping-test-2"

REM Summary
echo.
echo ========================================
echo 📊 DEPLOYMENT SUMMARY
echo ========================================
echo ✅ Successfully deployed: %DEPLOYED%/%TOTAL%
echo ❌ Failed: %FAILED%/%TOTAL%
echo ========================================
echo.

if %FAILED% equ 0 (
    echo 🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!
    echo.
    echo Next steps:
    echo 1. Set environment variables in Supabase dashboard
    echo 2. Configure cron jobs for scheduled functions
    echo 3. Update webhook URLs ^(Resend, Twilio^)
    echo 4. Test critical functions end-to-end
) else (
    echo ⚠️ Some functions failed to deploy. Review errors above.
)

echo.
pause
goto :eof

:deploy_function
set func_name=%~1
set /a current=%DEPLOYED%+%FAILED%+1
echo [%current%/%TOTAL%] Deploying: %func_name%...
%SUPABASE_CLI% functions deploy %func_name% --project-ref %PROJECT_REF% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ %func_name% deployed
    set /a DEPLOYED+=1
) else (
    echo ❌ %func_name% failed
    set /a FAILED+=1
)
goto :eof
