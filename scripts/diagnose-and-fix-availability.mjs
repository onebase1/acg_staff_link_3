#!/usr/bin/env node
/**
 * Diagnose and fix availability data issues
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const default24_7Availability = {
  monday: ['day', 'night'],
  tuesday: ['day', 'night'],
  wednesday: ['day', 'night'],
  thursday: ['day', 'night'],
  friday: ['day', 'night'],
  saturday: ['day', 'night'],
  sunday: ['day', 'night']
};

const isAvailabilityEmpty = (avail) => {
  if (!avail || typeof avail !== 'object') return true;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.every(day => {
    const dayValue = avail[day];
    return !dayValue || (Array.isArray(dayValue) && dayValue.length === 0);
  });
};

async function diagnoseAndFix() {
  try {
    console.log('🔍 STEP 1: Fetching all staff records...\n');

    const { data: allStaff, error: fetchError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email, availability');

    if (fetchError) {
      console.error('❌ Error fetching staff:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Found ${allStaff.length} total staff records\n`);

    // Categorize the data
    let nullAvailability = [];
    let emptyAvailability = [];
    let hasAvailability = [];

    allStaff.forEach(staff => {
      if (staff.availability === null) {
        nullAvailability.push(staff);
      } else if (isAvailabilityEmpty(staff.availability)) {
        emptyAvailability.push(staff);
      } else {
        hasAvailability.push(staff);
      }
    });

    console.log('📈 DIAGNOSIS:');
    console.log(`  ❌ NULL availability: ${nullAvailability.length} staff`);
    console.log(`  ⚠️  Empty availability (all days empty): ${emptyAvailability.length} staff`);
    console.log(`  ✅ Has availability set: ${hasAvailability.length} staff`);
    console.log();

    const needsFix = [...nullAvailability, ...emptyAvailability];

    if (needsFix.length === 0) {
      console.log('✨ All staff already have availability set! Nothing to fix.');
      return;
    }

    console.log(`🚀 STEP 2: Fixing ${needsFix.length} staff members...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const staff of needsFix) {
      const status = staff.availability === null ? 'NULL' : 'EMPTY';

      const { error: updateError } = await supabase
        .from('staff')
        .update({ availability: default24_7Availability })
        .eq('id', staff.id);

      if (updateError) {
        console.error(`  ❌ Failed ${staff.first_name} ${staff.last_name} (${status}):`, updateError.message);
        errorCount++;
        errors.push({ staff, error: updateError.message });
      } else {
        console.log(`  ✅ Fixed ${staff.first_name} ${staff.last_name} (${status}) - now available 24/7`);
        successCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY:');
    console.log('='.repeat(60));
    console.log(`  ✅ Successfully updated: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📈 Total staff in system: ${allStaff.length}`);
    console.log(`  🎯 Staff ready for auto-assign: ${hasAvailability.length + successCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      errors.forEach(({ staff, error }) => {
        console.log(`  - ${staff.first_name} ${staff.last_name}: ${error}`);
      });
    }

    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

console.log('🚀 STAFFLINK AVAILABILITY FIX SCRIPT');
console.log('=====================================\n');
diagnoseAndFix();
