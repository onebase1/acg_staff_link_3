import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local or .env for keys
let envFile = '';
try {
  envFile = fs.readFileSync('.env.local', 'utf8');
} catch {
  envFile = fs.readFileSync('.env', 'utf8');
}

const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueryAll() {
  const currentAgency = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16';

  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, role')
    .eq('agency_id', currentAgency)
    .eq('status', 'active');

  console.log('Result All:', { count: data?.length, error, data });
  console.log('---------------------------');
}

async function run() {
  await testQueryAll();
}

run();
