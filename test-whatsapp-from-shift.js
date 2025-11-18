// Quick test script to verify WhatsApp is being called when shift is assigned
// Run this in browser console after assigning a shift

// Test 1: Direct Edge Function call
async function testDirectWhatsApp() {
  console.log('🧪 Testing direct WhatsApp Edge Function call...');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(
    'https://rzzxxkppkiasuouuglaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY'
  );
  
  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: {
      to: '+447557679989',
      message: '🧪 Test from browser console - shift assignment simulation'
    }
  });
  
  if (error) {
    console.error('❌ WhatsApp test failed:', error);
  } else {
    console.log('✅ WhatsApp test success:', data);
  }
  
  return { data, error };
}

// Test 2: Check if NotificationService is available
function checkNotificationService() {
  console.log('🔍 Checking NotificationService...');
  
  // Try to find NotificationService in window
  if (window.NotificationService) {
    console.log('✅ NotificationService found in window');
    return window.NotificationService;
  }
  
  console.log('⚠️ NotificationService not in window, checking modules...');
  return null;
}

// Test 3: Monitor network requests
function monitorWhatsAppCalls() {
  console.log('📡 Monitoring WhatsApp API calls...');
  console.log('Open Network tab and filter for "send-whatsapp"');
  console.log('Then assign a shift and watch for the request');
}

// Run tests
console.log('🚀 WhatsApp Diagnostic Tool Loaded');
console.log('');
console.log('Available commands:');
console.log('1. testDirectWhatsApp() - Test Edge Function directly');
console.log('2. checkNotificationService() - Check if service is loaded');
console.log('3. monitorWhatsAppCalls() - Instructions for monitoring');
console.log('');
console.log('💡 Quick test: Run testDirectWhatsApp()');

