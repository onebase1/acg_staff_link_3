#!/bin/bash

# Deploy all 44 functions to Supabase
# Run: chmod +x deploy-functions.sh && ./deploy-functions.sh

SUPABASE_CLI="/c/Users/gbase/superbasecli/supabase"
PROJECT_REF="rzzxxkppkiasuouuglaf"
DEPLOYED=0
FAILED=0

# List of all 44 functions
FUNCTIONS=(
    "send-email"
    "send-sms"
    "send-whatsapp"
    "whatsapp-master-router"
    "incoming-sms-handler"
    "email-automation-engine"
    "auto-invoice-generator"
    "send-invoice"
    "payment-reminder-engine"
    "intelligent-timesheet-validator"
    "auto-timesheet-creator"
    "extract-timesheet-data"
    "scheduled-timesheet-processor"
    "post-shift-timesheet-reminder"
    "whatsapp-timesheet-handler"
    "auto-timesheet-approval-engine"
    "auto-approval-engine"
    "shift-status-automation"
    "urgent-shift-escalation"
    "shift-reminder-engine"
    "ai-shift-matcher"
    "validate-shift-eligibility"
    "shift-verification-chain"
    "daily-shift-closure-engine"
    "no-show-detection-engine"
    "care-home-inbound-email"
    "generateShiftDescription"
    "geofence-validator"
    "compliance-monitor"
    "financial-data-validator"
    "validate-bulk-import"
    "extractDocumentDates"
    "smart-escalation-engine"
    "client-communication-automation"
    "staff-daily-digest-engine"
    "notification-digest-engine"
    "critical-change-notifier"
    "enhanced-whatsapp-offers"
    "welcome-agency"
    "new-user-signup-handler"
    "incomplete-profile-reminder"
    "send-agency-admin-invite"
    "ping-test-1"
    "ping-test-2"
)

echo "🚀 Deploying all 44 functions to Supabase..."
echo ""

for i in "${!FUNCTIONS[@]}"; do
    func="${FUNCTIONS[$i]}"
    num=$((i + 1))
    echo "[$num/44] Deploying: $func..."

    if $SUPABASE_CLI functions deploy "$func" --project-ref "$PROJECT_REF" >/dev/null 2>&1; then
        echo "  ✅ $func deployed successfully"
        ((DEPLOYED++))
    else
        echo "  ❌ $func failed to deploy"
        ((FAILED++))
    fi
done

echo ""
echo "========================================="
echo "📊 DEPLOYMENT SUMMARY"
echo "========================================="
echo "✅ Successfully deployed: $DEPLOYED/44"
echo "❌ Failed: $FAILED/44"
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!"
else
    echo "⚠️  Some functions failed. Rerun failed deployments manually."
fi
