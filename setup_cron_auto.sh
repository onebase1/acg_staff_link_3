#!/bin/bash

# Supabase connection details
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo"
PROJECT_REF="rzzxxkppkiasuouuglaf"

echo "🚀 Setting up native pg_cron jobs..."
echo ""

# Function to execute SQL via Supabase Management API
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "⏳ $description..."
    
    # Try using the Supabase SQL endpoint (if available)
    curl -s -X POST "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/query" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql" | jq -Rs .)}" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ $description - SUCCESS"
        return 0
    else
        echo "⚠️  $description - Could not execute via API"
        return 1
    fi
}

# Execute each statement
execute_sql "CREATE EXTENSION IF NOT EXISTS pg_cron" "Enable pg_cron extension"
execute_sql "CREATE EXTENSION IF NOT EXISTS pg_net" "Enable pg_net extension"
execute_sql "GRANT USAGE ON SCHEMA cron TO postgres" "Grant cron permissions"

echo ""
echo "ℹ️  Note: Full cron job setup requires database-level access"
echo "📋 Please run the SQL script in Supabase Dashboard for complete setup"
echo ""
echo "👉 Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "👉 Copy contents of: CRON_SETUP_COPY_PASTE.sql"
echo "👉 Paste and click RUN"
echo ""
