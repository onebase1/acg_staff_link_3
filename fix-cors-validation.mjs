#!/usr/bin/env node
/**
 * Fix CORS issue in validate-bulk-import Edge Function
 * Adds CORS headers to enable browser requests
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = './supabase/functions/validate-bulk-import/index.ts';

console.log('🔧 Fixing CORS in validate-bulk-import Edge Function\n');

try {
  // Read the file
  let content = readFileSync(filePath, 'utf8');
  console.log('📄 Read file successfully');

  // Check if CORS is already added
  if (content.includes('corsHeaders')) {
    console.log('✅ CORS headers already present');
    process.exit(0);
  }

  // Add CORS headers definition after the imports
  const corsHeadersDef = `
// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
`;

  // Insert CORS headers after the comment block and before serve()
  content = content.replace(
    /(\*\/\n\n)(serve\(async \(req\) => {)/,
    `$1${corsHeadersDef}\n$2\n  // Handle CORS preflight requests\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: corsHeaders });\n  }\n`
  );

  // Replace all headers objects to include CORS
  content = content.replace(
    /{ status: (\d+), headers: { "Content-Type": "application\/json" } }/g,
    '{ status: $1, headers: { ...corsHeaders, "Content-Type": "application/json" } }'
  );

  content = content.replace(
    /{ headers: { "Content-Type": "application\/json" } }/g,
    '{ headers: { ...corsHeaders, "Content-Type": "application/json" } }'
  );

  // Write the updated file
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ Added CORS headers to all responses\n');

  console.log('📝 Changes made:');
  console.log('  1. Added corsHeaders constant');
  console.log('  2. Added OPTIONS preflight handler');
  console.log('  3. Updated all Response objects to include CORS headers\n');

  console.log('🚀 Next step: Deploy the function');
  console.log('   Run: cd /c/Users/gbase/superbasecli && ./supabase functions deploy validate-bulk-import --project-ref rzzxxkppkiasuouuglaf\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
