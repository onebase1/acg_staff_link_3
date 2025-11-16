@echo off
REM ============================================================================
REM Deploy Simplified Signup Migration
REM ============================================================================
REM
REM This script deploys the database trigger that enables:
REM - Automatic staff record linking
REM - Email-based role detection
REM - Security fixes (prevents self-assigned admin roles)
REM
REM ============================================================================

echo.
echo ========================================
echo   Deploying Simplified Signup Migration
echo ========================================
echo.

cd /d "C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3"

echo [1/3] Checking Supabase CLI...
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI not found!
    echo Please install from: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo [2/3] Deploying migration...
echo.
echo You will be prompted for your database password.
echo (Find it in Supabase Dashboard > Settings > Database)
echo.

supabase db push --linked

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Possible causes:
    echo - Wrong database password
    echo - Network connection issue
    echo - Project not linked
    echo.
    echo Try:
    echo 1. Check password in Supabase Dashboard
    echo 2. Run: supabase link --project-ref rzzxxkppkiasuouuglaf
    echo 3. Try deployment again
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying trigger installation...
supabase db query "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'link_staff_on_signup';"

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Could not verify trigger installation
    echo Please check manually in Supabase Dashboard
    echo.
) else (
    echo.
    echo ========================================
    echo   DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo The simplified signup flow is now active.
    echo.
    echo Next steps:
    echo 1. Review: SIMPLIFIED_SIGNUP_DEPLOYMENT_SUMMARY.md
    echo 2. Test: Follow test cases in deployment summary
    echo 3. Monitor: Check for orphaned staff records (should be 0)
    echo.
)

pause
