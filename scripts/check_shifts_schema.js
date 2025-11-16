import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  // Get one shift to see all columns
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Shifts table columns:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('⚠️ No shifts found in database');
  }
}

checkSchema().catch(console.error);

