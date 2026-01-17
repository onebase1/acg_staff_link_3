import pg from 'pg';

// Connection and Auth
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';
const agencyId = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16';

async function testReporting() {
    console.log('🧪 Debugging Reporting Flow...\n');

    // 1. Trigger the Edge Function
    console.log('📡 Triggering daily-agency-digest...');
    try {
        const response = await fetch('https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-agency-digest', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agency_id: agencyId,
                test_mode: false
            })
        });

        const result = await response.json();
        console.log('✅ Edge Function Response:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Trigger failed:', err.message);
    }
}

testReporting();
