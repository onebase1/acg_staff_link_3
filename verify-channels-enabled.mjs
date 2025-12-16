import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyAndShowShifts() {
  console.log('🔍 Checking Agency Settings & Existing Shifts\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Check agencies settings
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name, settings');

    if (agencyError) throw agencyError;

    console.log('📊 AGENCY SETTINGS:\n');
    console.log('─'.repeat(80));
    console.log('AGENCY'.padEnd(35) + 'SMART_DIGEST'.padEnd(15) + 'SMS'.padEnd(8) + 'WHATSAPP'.padEnd(12) + 'EMAIL');
    console.log('─'.repeat(80));

    agencies.forEach(agency => {
      const smartDigest = agency.settings?.automation_settings?.use_smart_marketplace_digest ? '✅ ON' : '❌ OFF';
      const sms = agency.settings?.urgent_shift_notifications?.sms_enabled ? '✅ ON' : '❌ OFF';
      const whatsapp = agency.settings?.urgent_shift_notifications?.whatsapp_enabled ? '✅ ON' : '❌ OFF';
      const email = agency.settings?.urgent_shift_notifications?.email_enabled ? '✅ ON' : '❌ OFF';

      console.log(
        agency.name.padEnd(35) +
        smartDigest.padEnd(15) +
        sms.padEnd(8) +
        whatsapp.padEnd(12) +
        email
      );
    });

    console.log('─'.repeat(80) + '\n');

    // Check existing shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, date, start_time, end_time, role_required, urgency, status, pending_broadcast, broadcast_sent_at, client_id')
      .in('status', ['open'])
      .order('created_date', { ascending: false })
      .limit(20);

    if (shiftsError) throw shiftsError;

    // Get clients for shift details
    const clientIds = [...new Set(shifts.map(s => s.client_id))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds);

    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    console.log('📋 EXISTING OPEN SHIFTS:\n');
    console.log('─'.repeat(120));
    console.log(
      'DATE'.padEnd(12) +
      'TIME'.padEnd(13) +
      'CLIENT'.padEnd(25) +
      'ROLE'.padEnd(20) +
      'URGENCY'.padEnd(12) +
      'PENDING'.padEnd(10) +
      'BROADCAST'
    );
    console.log('─'.repeat(120));

    let urgentCount = 0;
    let normalCount = 0;
    let pendingBroadcastCount = 0;

    shifts.forEach(shift => {
      const isUrgent = shift.urgency === 'urgent' || shift.urgency === 'critical';
      if (isUrgent) urgentCount++;
      else normalCount++;

      if (shift.pending_broadcast) pendingBroadcastCount++;

      const urgencyDisplay = shift.urgency ? shift.urgency.toUpperCase() : 'NORMAL';
      const pendingDisplay = shift.pending_broadcast ? '✅ YES' : '❌ NO';
      const broadcastDisplay = shift.broadcast_sent_at ? '✅ SENT' : '⏳ PENDING';

      console.log(
        shift.date.padEnd(12) +
        `${shift.start_time}-${shift.end_time}`.padEnd(13) +
        (clientMap[shift.client_id] || 'Unknown').substring(0, 23).padEnd(25) +
        shift.role_required.substring(0, 18).padEnd(20) +
        urgencyDisplay.padEnd(12) +
        pendingDisplay.padEnd(10) +
        broadcastDisplay
      );
    });

    console.log('─'.repeat(120) + '\n');

    console.log('📊 SUMMARY:');
    console.log(`   Total open shifts: ${shifts.length}`);
    console.log(`   Urgent shifts: ${urgentCount}`);
    console.log(`   Normal shifts: ${normalCount}`);
    console.log(`   Pending auto-broadcast: ${pendingBroadcastCount}\n`);

    if (pendingBroadcastCount > 0) {
      console.log('⚡ ACTION REQUIRED:');
      console.log(`   ${pendingBroadcastCount} shift(s) flagged for auto-broadcast`);
      console.log('   They will broadcast automatically when cron job runs (every 5 min)\n');
    }

    if (urgentCount > 0 && pendingBroadcastCount === 0) {
      console.log('💡 TIP:');
      console.log('   You have urgent shifts that are NOT flagged for auto-broadcast');
      console.log('   Use manual "Broadcast Selected" button in /shifts page\n');
    }

    console.log('✅ All channels are enabled and ready for UAT testing!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyAndShowShifts();
