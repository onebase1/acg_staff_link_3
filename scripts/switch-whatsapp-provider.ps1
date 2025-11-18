# 📱 Switch WhatsApp Provider: Twilio ↔ n8n
# Usage: 
#   .\scripts\switch-whatsapp-provider.ps1 -Provider n8n
#   .\scripts\switch-whatsapp-provider.ps1 -Provider twilio

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("n8n", "twilio")]
    [string]$Provider
)

Write-Host "🔄 Switching WhatsApp provider to: $Provider" -ForegroundColor Cyan

if ($Provider -eq "n8n") {
    Write-Host ""
    Write-Host "✅ Enabling n8n WhatsApp (FREE - WhatsApp Business Cloud API)" -ForegroundColor Green
    Write-Host ""
    
    # Set environment variable
    supabase secrets set USE_N8N_WHATSAPP=true
    
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure you've set up WhatsApp Business Cloud API (see WHATSAPP_N8N_MIGRATION_GUIDE.md)"
    Write-Host "2. Import n8n workflow from: n8n-workflows/whatsapp-sender-workflow.json"
    Write-Host "3. Set n8n webhook URL:"
    Write-Host "   supabase secrets set N8N_WHATSAPP_WEBHOOK_URL=https://n8n.dreampathai.co.uk/webhook/send-whatsapp"
    Write-Host ""
    Write-Host "4. Deploy the updated function:"
    Write-Host "   supabase functions deploy send-whatsapp"
    Write-Host ""
    
} elseif ($Provider -eq "twilio") {
    Write-Host ""
    Write-Host "✅ Enabling Twilio WhatsApp (PAID)" -ForegroundColor Green
    Write-Host ""
    
    # Set environment variable
    supabase secrets set USE_N8N_WHATSAPP=false
    
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure Twilio credentials are set:"
    Write-Host "   - TWILIO_ACCOUNT_SID"
    Write-Host "   - TWILIO_AUTH_TOKEN"
    Write-Host "   - TWILIO_WHATSAPP_NUMBER"
    Write-Host ""
    Write-Host "2. Deploy the updated function:"
    Write-Host "   supabase functions deploy send-whatsapp"
    Write-Host ""
}

Write-Host "✅ Provider switched to: $Provider" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Current WhatsApp configuration:" -ForegroundColor Cyan
supabase secrets list | Select-String -Pattern "WHATSAPP|TWILIO|N8N"

