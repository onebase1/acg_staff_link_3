import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateChadairaRole() {
  console.log('🔄 Updating Chadaira\'s role from care_worker to healthcare_assistant...');
  
  const { data, error } = await supabase
    .from('staff')
    .update({ role: 'healthcare_assistant' })
    .eq('email', 'g.basera5+chadaira@gmail.com')
    .select();
  
  if (error) {
    console.error('❌ Error updating role:', error);
    return;
  }
  
  console.log('✅ Role updated successfully:', data);
}

async function createTestShifts() {
  console.log('\n🔄 Creating test shifts for filtering validation...');
  
  // Get Chadaira's agency and a client
  const { data: staff } = await supabase
    .from('staff')
    .select('agency_id')
    .eq('email', 'g.basera5+chadaira@gmail.com')
    .single();
  
  if (!staff) {
    console.error('❌ Could not find Chadaira\'s staff record');
    return;
  }
  
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('agency_id', staff.agency_id)
    .limit(1)
    .single();
  
  if (!client) {
    console.error('❌ Could not find a client for this agency');
    return;
  }
  
  console.log('📋 Agency ID:', staff.agency_id);
  console.log('📋 Client ID:', client.id);
  
  // Delete existing test shifts
  await supabase
    .from('shifts')
    .delete()
    .like('notes', '%FILTERING TEST%');

  const today = new Date();

  // Helper function to create timestamp
  const createTimestamp = (daysFromNow, hour) => {
    const date = new Date(today.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  const shifts = [
    {
      agency_id: staff.agency_id,
      client_id: client.id,
      date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: createTimestamp(3, 9),
      end_time: createTimestamp(3, 17),
      role_required: 'healthcare_assistant',
      status: 'open',
      assigned_staff_id: null,
      marketplace_visible: false,
      pay_rate: 15.00,
      charge_rate: 22.50,
      urgency: 'normal',
      notes: 'FILTERING TEST - Healthcare Assistant Shift (SHOULD BE VISIBLE)'
    },
    {
      agency_id: staff.agency_id,
      client_id: client.id,
      date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: createTimestamp(4, 9),
      end_time: createTimestamp(4, 17),
      role_required: 'senior_care_worker',
      status: 'open',
      assigned_staff_id: null,
      marketplace_visible: false,
      pay_rate: 18.00,
      charge_rate: 27.00,
      urgency: 'normal',
      notes: 'FILTERING TEST - Senior Care Worker (SHOULD NOT BE VISIBLE)'
    },
    {
      agency_id: staff.agency_id,
      client_id: client.id,
      date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: createTimestamp(5, 9),
      end_time: createTimestamp(5, 17),
      role_required: 'nurse',
      status: 'open',
      assigned_staff_id: null,
      marketplace_visible: false,
      pay_rate: 25.00,
      charge_rate: 37.50,
      urgency: 'normal',
      notes: 'FILTERING TEST - Nurse Shift (SHOULD NOT BE VISIBLE)'
    },
    {
      agency_id: staff.agency_id,
      client_id: client.id,
      date: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      start_time: createTimestamp(6, 9),
      end_time: createTimestamp(6, 17),
      role_required: 'healthcare_assistant',
      status: 'open',
      assigned_staff_id: null,
      marketplace_visible: true,
      pay_rate: 16.00,
      charge_rate: 24.00,
      urgency: 'urgent',
      notes: 'FILTERING TEST - HCA Marketplace Visible (SHOULD BE VISIBLE - Admin Approved)'
    }
  ];
  
  const { data: created, error } = await supabase
    .from('shifts')
    .insert(shifts)
    .select();
  
  if (error) {
    console.error('❌ Error creating shifts:', error);
    return;
  }
  
  console.log(`✅ Created ${created.length} test shifts:`);
  created.forEach(s => {
    console.log(`  - ${s.date} | ${s.role_required} | marketplace_visible: ${s.marketplace_visible}`);
  });
}

async function main() {
  await updateChadairaRole();
  await createTestShifts();
  console.log('\n✅ All database updates complete!');
}

main().catch(console.error);

