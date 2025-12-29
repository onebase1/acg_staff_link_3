import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Updating magic_link_tokens constraint to allow "profile" download type...\n');

// Execute the migration SQL
const { data, error } = await supabase.rpc('exec_sql', {
  sql: `
    ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_download_type_check;
    ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_download_type_check
    CHECK (download_type IN ('pdf', 'csv', 'ics', 'profile'));
  `
});

if (error) {
  console.error('❌ Failed to update constraint:', error.message);
  console.log('\nTrying alternative approach using direct SQL...\n');

  // Try using the Postgres API directly (this requires service role)
  const sql = `
    DO $$
    BEGIN
        ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_download_type_check;
        ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_download_type_check
        CHECK (download_type IN ('pdf', 'csv', 'ics', 'profile'));
    END $$;
  `;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    console.error('❌ HTTP Error:', response.status, response.statusText);
    console.log('\n⚠️  Manual Fix Required:');
    console.log('Run this SQL in the Supabase SQL Editor:\n');
    console.log(sql);
  } else {
    console.log('✅ Constraint updated successfully!');
  }
} else {
  console.log('✅ Constraint updated successfully!');
  console.log('The magic_link_tokens table now accepts "profile" as a download_type.');
}
