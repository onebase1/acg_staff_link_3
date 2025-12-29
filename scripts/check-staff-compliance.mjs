import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY';

const supabase = createClient(supabaseUrl, supabaseKey);

const staffId = '9dab5124-4e0c-4114-b1b1-3eb57a9c8dcc';

console.log('\n🔍 Step 1: Checking Profiles Table...\n');

// Check if this ID exists in profiles table
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', staffId)
  .maybeSingle();

if (profileError) {
  console.error('❌ Error fetching profile:', profileError);
} else if (profile) {
  console.log('✅ Profile Found:');
  console.log(JSON.stringify(profile, null, 2));
  console.log('');
} else {
  console.log('❌ No profile found with this ID');
}

console.log('\n🔍 Step 2: Checking Staff Table...\n');

// First, search for staff with name Theresa Atomi
const { data: searchResults, error: searchError } = await supabase
  .from('staff')
  .select('id, first_name, last_name, email, agency_id, date_of_birth, role')
  .ilike('first_name', '%theresa%');

if (searchError) {
  console.error('❌ Error searching for staff:', searchError);
} else if (searchResults && searchResults.length > 0) {
  console.log(`🔍 Found ${searchResults.length} staff member(s) with name Theresa:\n`);
  searchResults.forEach(s => {
    console.log(`   ID: ${s.id}`);
    console.log(`   Name: ${s.first_name} ${s.last_name}`);
    console.log(`   Email: ${s.email}`);
    console.log('');
  });
}

// Get staff record by ID
const { data: staff, error: staffError } = await supabase
  .from('staff')
  .select('id, first_name, last_name, email, agency_id, date_of_birth, role')
  .eq('id', staffId)
  .maybeSingle();

if (staffError) {
  console.error('❌ Error fetching staff:', staffError);
  process.exit(1);
}

if (!staff && profile) {
  // Try to find staff record by email or user_id
  console.log(`⚠️  No staff record with ID: ${staffId}`);
  const profileEmail = profile.email || 'no_email@example.com';
  console.log(`   Searching for staff record linked to profile...\n`);

  const { data: linkedStaff, error: linkedError } = await supabase
    .from('staff')
    .select('*')
    .or(`email.eq.${profileEmail},user_id.eq.${profile.id}`);

  if (linkedError) {
    console.error('❌ Error searching for linked staff:', linkedError);
  } else if (linkedStaff && linkedStaff.length > 0) {
    console.log(`✅ Found ${linkedStaff.length} staff record(s) linked to this profile:\n`);
    linkedStaff.forEach(s => {
      console.log(`   Staff ID: ${s.id}`);
      console.log(`   Name: ${s.first_name} ${s.last_name}`);
      console.log(`   Email: ${s.email}`);
      console.log(`   User ID: ${s.user_id}`);
      console.log('');
    });

    console.log('\n🔧 DIAGNOSIS:');
    console.log('   The problem is that StaffProfileSimulation is using the PROFILE ID as the STAFF ID');
    console.log('   These are two different tables and should have different IDs!');
    console.log(`   Profile ID: ${staffId}`);
    console.log(`   Staff ID should be: ${linkedStaff[0].id}`);
    console.log('\n   The URL should be: /staffprofilesimulation?id=' + linkedStaff[0].id);
    process.exit(0);
  } else {
    console.log('❌ No staff record linked to this profile');
    console.log('\n🔧 DIAGNOSIS:');
    console.log('   This user has a PROFILE but no STAFF record!');
    console.log('   Solution: Create a staff record for this user');
    process.exit(0);
  }
}

if (!staff && !profile) {
  console.error(`❌ Neither staff nor profile found with ID: ${staffId}`);
  process.exit(0);
}

console.log('✅ Staff Record Found:');
console.log(`   Name: ${staff.first_name} ${staff.last_name}`);
console.log(`   Email: ${staff.email}`);
console.log(`   Role: ${staff.role}`);
console.log(`   DOB: ${staff.date_of_birth}`);

console.log('\n🔍 Checking Compliance Documents...\n');

// Get all compliance records
const { data: compliance, error: complianceError } = await supabase
  .from('compliance')
  .select('*')
  .eq('staff_id', staffId)
  .order('created_date', { ascending: false });

if (complianceError) {
  console.error('❌ Error fetching compliance:', complianceError);
  process.exit(1);
}

if (!compliance || compliance.length === 0) {
  console.log('⚠️  NO COMPLIANCE RECORDS FOUND!');
  console.log('   This explains why StaffProfileSimulation shows "Pending"');
  process.exit(0);
}

console.log(`✅ Found ${compliance.length} compliance document(s):\n`);

compliance.forEach((doc, index) => {
  console.log(`${index + 1}. ${doc.document_name || '(Unnamed)'}`);
  console.log(`   Type: ${doc.document_type}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Issue Date: ${doc.issue_date || 'N/A'}`);
  console.log(`   Expiry Date: ${doc.expiry_date || 'N/A'}`);
  console.log(`   Reference Number: ${doc.reference_number || 'N/A'}`);
  console.log(`   Created: ${doc.created_date}`);
  console.log('');
});

// Check specific required documents
console.log('\n📋 Required Documents Check:\n');

const dbsDoc = compliance.find(d => d.document_type === 'dbs_check');
const idDoc = compliance.find(d => d.document_type === 'id_verification');
const rightToWorkDoc = compliance.find(d => d.document_type === 'right_to_work');

console.log(`DBS Check: ${dbsDoc ? '✅ Found' : '❌ Missing'}`);
if (dbsDoc) {
  console.log(`   Status: ${dbsDoc.status}`);
  console.log(`   Issue Date: ${dbsDoc.issue_date || '⚠️  MISSING'}`);
  console.log(`   Reference Number: ${dbsDoc.reference_number || '⚠️  MISSING'}`);
}

console.log(`\nID Verification: ${idDoc ? '✅ Found' : '❌ Missing'}`);
if (idDoc) {
  console.log(`   Status: ${idDoc.status}`);
}

console.log(`\nRight to Work: ${rightToWorkDoc ? '✅ Found' : '❌ Missing'}`);
if (rightToWorkDoc) {
  console.log(`   Status: ${rightToWorkDoc.status}`);
}

// Summary
console.log('\n📊 Summary:\n');
const verified = compliance.filter(d => d.status === 'verified').length;
const pending = compliance.filter(d => d.status === 'pending').length;
const total = compliance.length;

console.log(`Total Documents: ${total}`);
console.log(`Verified: ${verified}`);
console.log(`Pending: ${pending}`);
console.log(`\nCompliance Percentage: ${Math.round((verified / total) * 100)}%`);

console.log('\n🔍 Diagnosis:\n');

if (!dbsDoc) {
  console.log('❌ ISSUE: No DBS document found');
  console.log('   Solution: Upload a DBS document with document_type="dbs_check"');
} else if (!dbsDoc.issue_date || !dbsDoc.reference_number) {
  console.log('⚠️  ISSUE: DBS document exists but missing critical fields');
  console.log(`   Missing: ${!dbsDoc.issue_date ? 'issue_date ' : ''}${!dbsDoc.reference_number ? 'reference_number' : ''}`);
  console.log('   Solution: Edit the DBS document to add missing fields');
} else {
  console.log('✅ DBS document appears complete');
}

console.log('\n✅ Analysis Complete\n');
