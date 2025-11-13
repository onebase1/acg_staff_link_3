#!/bin/bash

# =============================================================================
# SUPABASE EDGE FUNCTIONS DEPLOYMENT SCRIPT
# =============================================================================
# Deploys all 44 converted functions to Supabase
# Run from project root: ./deploy-all-functions.sh
# =============================================================================

set -e  # Exit on error

echo "🚀 Starting deployment of all 44 Supabase Edge Functions..."
echo ""

# Project configuration
PROJECT_REF="rzzxxkppkiasuouuglaf"
SUPABASE_URL="https://rzzxxkppkiasuouuglaf.supabase.co"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function counter
DEPLOYED=0
FAILED=0
TOTAL=44

# Deploy function with error handling
deploy_function() {
    local func_name=$1
    echo -e "${BLUE}[$((DEPLOYED + FAILED + 1))/$TOTAL]${NC} Deploying: ${func_name}..."

    if supabase functions deploy "$func_name" --project-ref "$PROJECT_REF"; then
        echo -e "${GREEN}✅ ${func_name} deployed successfully${NC}"
        ((DEPLOYED++))
    else
        echo -e "${YELLOW}❌ ${func_name} deployment failed${NC}"
        ((FAILED++))
    fi
    echo ""
}

# =============================================================================
# COMMUNICATION FUNCTIONS (6)
# =============================================================================
echo "📧 Deploying Communication Functions..."
deploy_function "send-email"
deploy_function "send-sms"
deploy_function "send-whatsapp"
deploy_function "whatsapp-master-router"
deploy_function "incoming-sms-handler"
deploy_function "email-automation-engine"

# =============================================================================
# INVOICE & PAYMENT FUNCTIONS (3)
# =============================================================================
echo "💰 Deploying Invoice & Payment Functions..."
deploy_function "auto-invoice-generator"
deploy_function "send-invoice"
deploy_function "payment-reminder-engine"

# =============================================================================
# TIMESHEET FUNCTIONS (8)
# =============================================================================
echo "📋 Deploying Timesheet Functions..."
deploy_function "intelligent-timesheet-validator"
deploy_function "auto-timesheet-creator"
deploy_function "extract-timesheet-data"
deploy_function "scheduled-timesheet-processor"
deploy_function "post-shift-timesheet-reminder"
deploy_function "whatsapp-timesheet-handler"
deploy_function "auto-timesheet-approval-engine"
deploy_function "auto-approval-engine"

# =============================================================================
# SHIFT MANAGEMENT FUNCTIONS (10)
# =============================================================================
echo "📅 Deploying Shift Management Functions..."
deploy_function "shift-status-automation"
deploy_function "urgent-shift-escalation"
deploy_function "shift-reminder-engine"
deploy_function "ai-shift-matcher"
deploy_function "validate-shift-eligibility"
deploy_function "shift-verification-chain"
deploy_function "daily-shift-closure-engine"
deploy_function "no-show-detection-engine"
deploy_function "care-home-inbound-email"
deploy_function "generateShiftDescription"

# =============================================================================
# COMPLIANCE & VALIDATION FUNCTIONS (5)
# =============================================================================
echo "🛡️ Deploying Compliance & Validation Functions..."
deploy_function "geofence-validator"
deploy_function "compliance-monitor"
deploy_function "financial-data-validator"
deploy_function "validate-bulk-import"
deploy_function "extractDocumentDates"

# =============================================================================
# AUTOMATION ENGINES (7)
# =============================================================================
echo "⚙️ Deploying Automation Engines..."
deploy_function "smart-escalation-engine"
deploy_function "client-communication-automation"
deploy_function "staff-daily-digest-engine"
deploy_function "notification-digest-engine"
deploy_function "critical-change-notifier"
deploy_function "enhanced-whatsapp-offers"

# =============================================================================
# ONBOARDING FUNCTIONS (4)
# =============================================================================
echo "👋 Deploying Onboarding Functions..."
deploy_function "welcome-agency"
deploy_function "new-user-signup-handler"
deploy_function "incomplete-profile-reminder"
deploy_function "send-agency-admin-invite"

# =============================================================================
# UTILITY FUNCTIONS (2)
# =============================================================================
echo "🔧 Deploying Utility Functions..."
deploy_function "ping-test-1"
deploy_function "ping-test-2"

# =============================================================================
# DEPLOYMENT SUMMARY
# =============================================================================
echo ""
echo "========================================"
echo "📊 DEPLOYMENT SUMMARY"
echo "========================================"
echo -e "${GREEN}✅ Successfully deployed: $DEPLOYED${NC}"
echo -e "${YELLOW}❌ Failed: $FAILED${NC}"
echo "📦 Total: $TOTAL"
echo "========================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in Supabase dashboard"
    echo "2. Configure cron jobs for scheduled functions"
    echo "3. Update webhook URLs (Resend, Twilio)"
    echo "4. Test critical functions end-to-end"
else
    echo -e "${YELLOW}⚠️ Some functions failed to deploy. Review errors above.${NC}"
    exit 1
fi
