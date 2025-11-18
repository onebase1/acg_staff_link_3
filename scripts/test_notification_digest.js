import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testNotificationDigest() {
  console.log('🧪 Testing notification-digest-engine...\n');

  try {
    // Check pending queues first
    const { data: queues, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_date', { ascending: false });

    if (queueError) {
      console.error('❌ Error fetching queues:', queueError);
      return;
    }

    console.log(`📊 Found ${queues?.length || 0} pending queue(s):\n`);
    queues?.forEach(q => {
      console.log(`  - ID: ${q.id}`);
      console.log(`    Email: ${q.recipient_email}`);
      console.log(`    Type: ${q.notification_type}`);
      console.log(`    Items: ${q.item_count}`);
      console.log(`    Status: ${q.status}`);
      console.log(`    Scheduled: ${q.scheduled_send_at}`);
      console.log(`    Error: ${q.error_message || 'None'}\n`);
    });

    // Invoke the digest engine
    console.log('🚀 Invoking notification-digest-engine...\n');

    const { data, error } = await supabase.functions.invoke('notification-digest-engine', {
      body: {}
    });

    if (error) {
      console.error('❌ Function invocation error:', error);
      return;
    }

    console.log('✅ Function response:', JSON.stringify(data, null, 2));

    // Check queue status after
    const { data: queuesAfter } = await supabase
      .from('notification_queue')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(5);

    console.log('\n📊 Queue status after invocation:\n');
    queuesAfter?.forEach(q => {
      console.log(`  - ID: ${q.id}`);
      console.log(`    Status: ${q.status}`);
      console.log(`    Sent at: ${q.sent_at || 'Not sent'}`);
      console.log(`    Error: ${q.error_message || 'None'}\n`);
    });

  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testNotificationDigest();

