/**
 * Backfill shift_type column for existing shifts
 * Determines day/night based on start_time hour
 * Day shift: 06:00-18:00, Night shift: 18:00-06:00
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU3NTU5NiwiZXhwIjoyMDQ2MTUxNTk2fQ.Ks_Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function backfillShiftType() {
  console.log('🔄 Starting shift_type backfill...\n');

  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .is('shift_type', null);

    if (countError) {
      console.error('❌ Error counting shifts:', countError);
      return;
    }

    console.log(`📊 Found ${totalCount} shifts without shift_type\n`);

    if (totalCount === 0) {
      console.log('✅ All shifts already have shift_type!');
      return;
    }

    // Process in batches
    const batchSize = 100;
    let processed = 0;
    let updated = 0;
    let errors = 0;

    while (processed < totalCount) {
      // Fetch batch
      const { data: shifts, error: fetchError } = await supabase
        .from('shifts')
        .select('id, start_time')
        .is('shift_type', null)
        .limit(batchSize);

      if (fetchError) {
        console.error('❌ Error fetching batch:', fetchError);
        break;
      }

      if (!shifts || shifts.length === 0) {
        break;
      }

      // Update each shift
      for (const shift of shifts) {
        try {
          const hour = new Date(shift.start_time).getHours();
          const shiftType = (hour >= 6 && hour < 18) ? 'day' : 'night';

          const { error: updateError } = await supabase
            .from('shifts')
            .update({ shift_type: shiftType })
            .eq('id', shift.id);

          if (updateError) {
            console.error(`❌ Error updating shift ${shift.id}:`, updateError.message);
            errors++;
          } else {
            updated++;
          }
        } catch (err) {
          console.error(`❌ Exception updating shift ${shift.id}:`, err.message);
          errors++;
        }

        processed++;

        // Progress indicator
        if (processed % 100 === 0) {
          const percent = ((processed / totalCount) * 100).toFixed(1);
          console.log(`⏳ Progress: ${processed}/${totalCount} (${percent}%) - Updated: ${updated}, Errors: ${errors}`);
        }
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`📊 Total processed: ${processed}`);
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run backfill
backfillShiftType();

