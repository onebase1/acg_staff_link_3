/**
 * 🧪 TEST CONVERSATIONAL WHATSAPP AI
 * 
 * Tests the incoming-whatsapp-handler Edge Function
 * Simulates incoming WhatsApp messages from staff
 */

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const testMessages = [
    {
        name: "Test 1: What's my shifts this week?",
        from: "+447557679989",
        message: "What's my shifts this week?",
        profileName: "Chadaira Basera"
    },
    {
        name: "Test 2: Am I working today?",
        from: "+447557679989",
        message: "Am I working today?",
        profileName: "Chadaira Basera"
    },
    {
        name: "Test 3: How do I submit timesheet?",
        from: "+447557679989",
        message: "How do I submit my timesheet?",
        profileName: "Chadaira Basera"
    },
    {
        name: "Test 4: Show my schedule",
        from: "+447557679989",
        message: "Show my schedule",
        profileName: "Chadaira Basera"
    }
];

async function testConversationalWhatsApp(test) {
    console.log(`\n🧪 ${test.name}`);
    console.log(`📱 From: ${test.from}`);
    console.log(`💬 Message: "${test.message}"`);
    console.log('⏳ Sending...\n');

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/incoming-whatsapp-handler`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                from: test.from,
                message: test.message,
                profileName: test.profileName
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS!');
            console.log('📤 AI Response:');
            console.log('─────────────────────────────────────');
            console.log(data.response);
            console.log('─────────────────────────────────────');
        } else {
            console.log('❌ FAILED!');
            console.log('Error:', data.error || 'Unknown error');
        }

    } catch (error) {
        console.log('❌ NETWORK ERROR!');
        console.log('Error:', error.message);
    }
}

async function runAllTests() {
    console.log('🚀 TESTING CONVERSATIONAL WHATSAPP AI');
    console.log('=====================================\n');

    for (const test of testMessages) {
        await testConversationalWhatsApp(test);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between tests
    }

    console.log('\n✅ ALL TESTS COMPLETE!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Check if WhatsApp messages were sent to +447557679989');
    console.log('2. Verify AI responses are accurate and well-formatted');
    console.log('3. Test from actual WhatsApp (send message to your WhatsApp Business number)');
}

// Run tests
runAllTests();

