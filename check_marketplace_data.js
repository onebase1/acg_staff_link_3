const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkData() {
  // Get Chadaira's staff record
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('email', 'g.basera5+chadaira@gmail.com')
    .single();
  
  console.log('=== CHADAIRA STAFF RECORD ===');
  console.log('Role:', staff.role);
  console.log('Agency ID:', staff.agency_id);
  console.log('Status:', staff.status);
  console.log('');
  
  // Get all open shifts
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, date, role_required, status, assigned_staff_id, marketplace_visible, agency_id')
    .eq('status', 'open')
    .is('assigned_staff_id', null)
    .order('date');
  
  console.log('=== OPEN UNASSIGNED SHIFTS ===');
  console.log('Total:', shifts.length);
  shifts.forEach(s => {
    const sameAgency = s.agency_id === staff.agency_id ? 'SAME' : 'DIFFERENT';
    console.log(`- ${s.date} | Role: ${s.role_required} | Marketplace: ${s.marketplace_visible} | Agency: ${sameAgency}`);
  });
  
  // Check if any shifts match Chadaira's role
  const matchingRoleShifts = shifts.filter(s => 
    s.role_required === staff.role && s.agency_id === staff.agency_id
  );
  console.log('');
  console.log('=== SHIFTS MATCHING CHADAIRA ROLE (care_worker) ===');
  console.log('Count:', matchingRoleShifts.length);
  
  // Check marketplace_visible shifts
  const marketplaceShifts = shifts.filter(s => 
    s.marketplace_visible === true && s.agency_id === staff.agency_id
  );
  console.log('');
  console.log('=== MARKETPLACE VISIBLE SHIFTS (ANY ROLE) ===');
  console.log('Count:', marketplaceShifts.length);
  marketplaceShifts.forEach(s => {
    console.log(`- ${s.date} | Role: ${s.role_required}`);
  });
}

checkData().catch(console.error);

