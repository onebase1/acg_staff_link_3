#!/usr/bin/env node
/**
 * Fix existing staff with empty/null availability
 * Sets them to 24/7 available by default for auto-assign
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_service_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const default24_7Availability = {
  monday: ['day', 'night'],
  tuesday: ['day', 'night'],
  wednesday: ['day', 'night'],
  thursday: ['day', 'night'],
  friday: ['day', 'night'],
  saturday: ['day', 'night'],
  sunday: ['day', 'night']
};

async function fixEmptyAvailability() {
  try {
    console.log('🔍 Fetching all staff records...');

    // Get all staff
    const { data: allStaff, error: fetchError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email, availability');

    if (fetchError) {
      console.error('❌ Error fetching staff:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Found ${allStaff.length} staff records`);

    // Check which ones need default availability
    const isAvailabilityEmpty = (avail) => {
      if (!avail || typeof avail !== 'object') return true;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      return days.every(day => !avail[day] || avail[day].length === 0);
    };

    const staffNeedingFix = allStaff.filter(s => isAvailabilityEmpty(s.availability));

    console.log(`\n🚀 ${staffNeedingFix.length} staff members need default 24/7 availability:\n`);

    if (staffNeedingFix.length === 0) {
      console.log('✅ All staff already have availability set!');
      return;
    }

    staffNeedingFix.forEach(s => {
      console.log(`  - ${s.first_name} ${s.last_name} (${s.email})`);
    });

    console.log('\n💾 Updating staff records...');

    // Update each one
    let successCount = 0;
    let errorCount = 0;

    for (const staff of staffNeedingFix) {
      const { error: updateError } = await supabase
        .from('staff')
        .update({ availability: default24_7Availability })
        .eq('id', staff.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${staff.first_name} ${staff.last_name}:`, updateError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Updated ${staff.first_name} ${staff.last_name} - now available 24/7`);
        successCount++;
      }
    }

    console.log('\n📈 SUMMARY:');
    console.log(`  ✅ Successfully updated: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📊 Total staff in system: ${allStaff.length}`);
    console.log(`  🎯 Staff ready for auto-assign: ${allStaff.length - errorCount}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

console.log('🚀 STAFFLINK AVAILABILITY FIX SCRIPT');
console.log('=====================================\n');
fixEmptyAvailability();
