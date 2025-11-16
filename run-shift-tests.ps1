# Shift Management Test Runner
# Run comprehensive Playwright tests for shift management

Write-Host "🚀 Starting Shift Management Tests..." -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
Write-Host "📋 Pre-flight checks..." -ForegroundColor Yellow
Write-Host "1. Checking if dev server is running on http://localhost:5173..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Dev server is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Dev server is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the dev server first:" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "2. Checking Playwright installation..."

# Check if Playwright is installed
if (Test-Path "node_modules/@playwright") {
    Write-Host "   ✅ Playwright is installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Playwright is NOT installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Playwright..." -ForegroundColor Yellow
    npm install @playwright/test
    npx playwright install
}

Write-Host ""
Write-Host "3. Creating test-results directory..."
if (-not (Test-Path "test-results")) {
    New-Item -ItemType Directory -Path "test-results" | Out-Null
    Write-Host "   ✅ Created test-results directory" -ForegroundColor Green
} else {
    Write-Host "   ✅ test-results directory exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧪 Running Shift Management Tests" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Run the tests
npx playwright test tests/ui/shift-management-complete.spec.ts --headed

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Tests Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📸 Screenshots saved to: test-results/" -ForegroundColor Yellow
Write-Host ""
Write-Host "To view the HTML report, run:" -ForegroundColor Yellow
Write-Host "   npx playwright show-report" -ForegroundColor Cyan
Write-Host ""

