import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
)

console.log('Fetching all agencies with their admins...\n')

// Fetch all agencies
const { data: agencies, error: agencyError } = await supabase
  .from('agencies')
  .select('*')
  .order('name')

if (agencyError) {
  console.error('Error fetching agencies:', agencyError)
  Deno.exit(1)
}

console.log(`Found ${agencies.length} agencies\n`)

// For each agency, fetch their admins
for (const agency of agencies) {
  console.log(`\n=== ${agency.name} ===`)
  console.log(`ID: ${agency.id}`)
  console.log(`Status: ${agency.status}`)
  console.log(`Contact: ${agency.email || agency.contact_email}`)

  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id, email, full_name, user_type, created_at')
    .eq('agency_id', agency.id)
    .eq('user_type', 'agency_admin')
    .order('created_at')

  if (adminError) {
    console.error('Error fetching admins:', adminError)
  } else if (admins.length === 0) {
    console.log('⚠️  NO ADMINS FOUND')
  } else {
    console.log(`\nAdmins (${admins.length}):`)
    admins.forEach((admin, idx) => {
      console.log(`  ${idx + 1}. ${admin.email}`)
      console.log(`     Name: ${admin.full_name || 'Not set'}`)
      console.log(`     User ID: ${admin.id}`)
      console.log(`     Created: ${new Date(admin.created_at).toLocaleDateString()}`)
    })
  }

  // Check pending invitations
  const { data: invites } = await supabase
    .from('agency_admin_invitations')
    .select('email, status, created_at')
    .eq('agency_id', agency.id)
    .eq('status', 'pending')

  if (invites && invites.length > 0) {
    console.log(`\nPending Invitations (${invites.length}):`)
    invites.forEach((invite, idx) => {
      console.log(`  ${idx + 1}. ${invite.email} (${new Date(invite.created_at).toLocaleDateString()})`)
    })
  }
}

console.log('\n\n=== SUMMARY ===')
console.log(`Total Agencies: ${agencies.length}`)
