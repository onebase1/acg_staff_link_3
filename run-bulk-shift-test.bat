@echo off
echo ========================================
echo BULK SHIFT CREATION - PLAYWRIGHT TEST
echo ========================================
echo.
echo This will run the end-to-end test for bulk shift creation
echo.
echo Prerequisites:
echo 1. Dev server must be running on http://localhost:5173
echo 2. Database must be accessible
echo 3. Test user must exist: info@guest-glow.com
echo.
pause
echo.
echo Running test...
echo.

npx playwright test tests/bulk-shift-creation.spec.js --headed --project=chromium

echo.
echo ========================================
echo TEST COMPLETE
echo ========================================
pause

