const SUPABASE_URL = "https://rzzxxkppkiasuouuglaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo";

async function triggerReport() {
    console.log("Triggering Daily Agency Digest (Debug)...");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/daily-agency-digest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
            test_mode: false,
            agency_id: "c8e84c94-8233-4084-b4c3-63ad9dc81c16",
            report_date: "2026-01-17"
        })
    });

    const result = await response.json();
    console.log("Result:", JSON.stringify(result, null, 2));
}

triggerReport();
