# 📸 Deploy WhatsApp Timesheet Upload Handler
# PowerShell deployment script for Windows

Write-Host "🚀 Deploying WhatsApp Timesheet Upload Handler..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy the new timesheet upload handler
Write-Host "📦 Step 1: Deploying whatsapp-timesheet-upload-handler..." -ForegroundColor Yellow
supabase functions deploy whatsapp-timesheet-upload-handler

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy whatsapp-timesheet-upload-handler" -ForegroundColor Red
    exit 1
}

Write-Host "✅ whatsapp-timesheet-upload-handler deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Redeploy the updated incoming handler
Write-Host "📦 Step 2: Redeploying incoming-whatsapp-handler..." -ForegroundColor Yellow
supabase functions deploy incoming-whatsapp-handler

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy incoming-whatsapp-handler" -ForegroundColor Red
    exit 1
}

Write-Host "✅ incoming-whatsapp-handler deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Verify deployments
Write-Host "🔍 Step 3: Verifying deployments..." -ForegroundColor Yellow
supabase functions list

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Import n8n workflow: n8n-workflows/whatsapp-timesheet-upload-integration.json"
Write-Host "2. Configure WhatsApp webhook to point to n8n"
Write-Host "3. Test by sending a timesheet image via WhatsApp"
Write-Host ""
Write-Host "📖 Full documentation: TIMESHEET_UPLOAD_HANDLER_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""

