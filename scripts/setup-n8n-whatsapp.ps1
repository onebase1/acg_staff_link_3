# 🚀 Setup n8n WhatsApp Integration
# This script helps you configure n8n as a FREE alternative to Twilio

Write-Host "📱 ACG StaffLink - n8n WhatsApp Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if n8n workflow exists
Write-Host "Step 1: Checking n8n workflow file..." -ForegroundColor Yellow
if (Test-Path "n8n-workflows/whatsapp-sender-workflow.json") {
    Write-Host "✅ Workflow file found!" -ForegroundColor Green
} else {
    Write-Host "❌ Workflow file not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Prompt for WhatsApp Business Cloud credentials
Write-Host ""
Write-Host "Step 2: WhatsApp Business Cloud API Setup" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to set up WhatsApp Business Cloud API first:" -ForegroundColor White
Write-Host "1. Go to https://developers.facebook.com/apps" -ForegroundColor White
Write-Host "2. Create a new app (Business type)" -ForegroundColor White
Write-Host "3. Add WhatsApp product" -ForegroundColor White
Write-Host "4. Get your credentials from WhatsApp → API Setup" -ForegroundColor White
Write-Host ""

$setupDone = Read-Host "Have you completed the WhatsApp Business Cloud setup? (y/n)"

if ($setupDone -ne "y") {
    Write-Host ""
    Write-Host "⚠️  Please complete the setup first. See WHATSAPP_N8N_MIGRATION_GUIDE.md for details." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# Step 3: Get n8n webhook URL
Write-Host ""
Write-Host "Step 3: n8n Webhook Configuration" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "After importing the workflow to n8n:" -ForegroundColor White
Write-Host "1. Open https://n8n.dreampathai.co.uk" -ForegroundColor White
Write-Host "2. Import the workflow from: n8n-workflows/whatsapp-sender-workflow.json" -ForegroundColor White
Write-Host "3. Configure WhatsApp Business Cloud credentials" -ForegroundColor White
Write-Host "4. Activate the workflow" -ForegroundColor White
Write-Host "5. Copy the Production Webhook URL" -ForegroundColor White
Write-Host ""

$webhookUrl = Read-Host "Enter your n8n webhook URL (e.g., https://n8n.dreampathai.co.uk/webhook/send-whatsapp)"

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-Host "❌ Webhook URL is required!" -ForegroundColor Red
    exit 1
}

# Step 4: Set Supabase secrets
Write-Host ""
Write-Host "Step 4: Configuring Supabase..." -ForegroundColor Yellow

try {
    # Set n8n webhook URL
    Write-Host "Setting N8N_WHATSAPP_WEBHOOK_URL..." -ForegroundColor White
    supabase secrets set N8N_WHATSAPP_WEBHOOK_URL=$webhookUrl
    
    # Enable n8n mode
    Write-Host "Enabling n8n WhatsApp mode..." -ForegroundColor White
    supabase secrets set USE_N8N_WHATSAPP=true
    
    Write-Host "✅ Supabase secrets configured!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to set Supabase secrets: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Deploy Edge Function
Write-Host ""
Write-Host "Step 5: Deploying send-whatsapp function..." -ForegroundColor Yellow

try {
    supabase functions deploy send-whatsapp
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to deploy function: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Test
Write-Host ""
Write-Host "Step 6: Testing WhatsApp Integration" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""

$testPhone = Read-Host "Enter a phone number to test (e.g., +44XXXXXXXXXX) or press Enter to skip"

if (-not [string]::IsNullOrWhiteSpace($testPhone)) {
    Write-Host "Sending test message..." -ForegroundColor White
    
    $testBody = @{
        to = $testPhone
        message = "🎉 Test message from ACG StaffLink via n8n! Your WhatsApp integration is working!"
    } | ConvertTo-Json
    
    try {
        supabase functions invoke send-whatsapp --body $testBody
        Write-Host "✅ Test message sent! Check your WhatsApp." -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Test failed: $_" -ForegroundColor Yellow
        Write-Host "This might be normal if you haven't verified your phone number in WhatsApp Business." -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ n8n webhook configured: $webhookUrl" -ForegroundColor White
Write-Host "✅ WhatsApp provider: n8n (FREE)" -ForegroundColor White
Write-Host "✅ send-whatsapp function deployed" -ForegroundColor White
Write-Host ""
Write-Host "📊 Cost Savings:" -ForegroundColor Cyan
Write-Host "   Twilio: ~$0.005/message" -ForegroundColor White
Write-Host "   n8n + WhatsApp Business Cloud: FREE (up to 1,000 conversations/month)" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test shift assignment notifications" -ForegroundColor White
Write-Host "2. Monitor n8n workflow executions" -ForegroundColor White
Write-Host "3. Check WhatsApp Business Cloud dashboard for usage" -ForegroundColor White
Write-Host ""
Write-Host "🔄 To switch back to Twilio:" -ForegroundColor Cyan
Write-Host "   .\scripts\switch-whatsapp-provider.ps1 -Provider twilio" -ForegroundColor White
Write-Host ""

