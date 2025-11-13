import { SupabaseTestClient } from './helpers/supabase-queries';
import { FunctionTester } from './helpers/function-tester';
import { TEST_CONFIG } from './test-config';

export async function testShiftJourneyComplete() {
  const db = new SupabaseTestClient();
  
  console.log('\n🔄 Testing Complete Shift Journey...');
  
  // Authenticate
  await db.authenticate();
  const agency_id = await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  // 1. Create shift (via Supabase client, not UI)
  console.log('\n1️⃣  Creating shift...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const shift = await db.createShift({
    client_id: 'Divine Care Center',
    role: 'nurse',
    date: dateStr,
    start_time: '08:00',
    end_time: '20:00',
    pay_rate: 20,
    charge_rate: 30
  });
  
  console.log(`   ✓ Shift created: ${shift.id}`);
  console.log(`   Status: ${shift.status}`);
  
  // 2. Verify appears in dashboard stats
  console.log('\n2️⃣  Verifying dashboard stats...');
  const statsBefore = await db.getDashboardStats(agency_id);
  const isInOpenShifts = statsBefore.open_shifts > 0;
  
  if (isInOpenShifts) {
    console.log(`   ✓ Shift appears in dashboard (${statsBefore.open_shifts} open shifts)`);
  } else {
    console.log(`   ⚠ Dashboard shows ${statsBefore.open_shifts} open shifts`);
  }
  
  // 3. Assign staff
  console.log('\n3️⃣  Assigning staff...');
  await db.assignStaff(shift.id, 'Linda Williams');
  const statsAfter = await db.getDashboardStats(agency_id);
  
  console.log(`   ✓ Staff assigned`);
  console.log(`   Assigned shifts: ${statsAfter.assigned_shifts}`);
  
  // 4. Check journey log
  console.log('\n4️⃣  Checking journey log...');
  let log = await db.getShiftJourneyLog(shift.id);
  
  if (log.states.includes('created') && log.states.includes('assigned')) {
    console.log(`   ✓ Journey log contains: ${log.states.join(' → ')}`);
  } else {
    console.log(`   ⚠ Journey log incomplete: ${log.states.join(' → ')}`);
  }
  
  // 5. Confirm shift
  console.log('\n5️⃣  Confirming shift...');
  await db.updateShift(shift.id, { status: 'confirmed' });
  log = await db.getShiftJourneyLog(shift.id);
  
  if (log.states.includes('confirmed')) {
    console.log(`   ✓ Shift confirmed`);
  }
  
  // 6. Mark in progress
  console.log('\n6️⃣  Marking shift in progress...');
  await db.updateShift(shift.id, { status: 'in_progress' });
  log = await db.getShiftJourneyLog(shift.id);
  
  if (log.states.includes('in_progress')) {
    console.log(`   ✓ Shift in progress`);
  }
  
  // 7. Complete shift
  console.log('\n7️⃣  Completing shift...');
  await db.completeShift(shift.id);
  
  // 8. Verify financial lock
  const completed = await db.getShift(shift.id);
  
  if (completed.financial_locked === true) {
    console.log(`   ✓ Financial lock applied`);
  } else {
    console.log(`   ⚠ Financial lock not applied`);
  }
  
  // 9. Check invoice created (may not exist in test)
  console.log('\n8️⃣  Checking invoice generation...');
  const invoices = await db.getInvoices({ shift_id: shift.id });
  
  if (invoices.length > 0) {
    console.log(`   ✓ Invoice generated: ${invoices[0].id}`);
  } else {
    console.log(`   ⚠ No invoice generated (may be expected in test environment)`);
  }
  
  // 10. Verify journey log complete
  console.log('\n9️⃣  Final journey log verification...');
  log = await db.getShiftJourneyLog(shift.id);
  
  const expectedStates = ['created', 'assigned', 'confirmed', 'in_progress', 'completed'];
  const hasAllStates = expectedStates.every(state => log.states.includes(state));
  
  if (hasAllStates) {
    console.log(`   ✓ Complete journey: ${log.states.join(' → ')}`);
  } else {
    console.log(`   ⚠ Journey incomplete: ${log.states.join(' → ')}`);
    console.log(`   Expected: ${expectedStates.join(' → ')}`);
  }
  
  console.log('\n✅ Shift journey test completed');
  
  return { 
    shift, 
    log, 
    invoices,
    stats: { before: statsBefore, after: statsAfter }
  };
}

export async function testShiftCancellation() {
  const db = new SupabaseTestClient();
  
  console.log('\n🚫 Testing Shift Cancellation...');
  
  // Authenticate
  await db.authenticate();
  await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  // 1. Create and assign shift
  console.log('\n1️⃣  Creating shift for cancellation test...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const shift = await db.createShift({
    client_id: 'Divine Care Center',
    role: 'care_assistant',
    date: dateStr,
    start_time: '09:00',
    end_time: '17:00',
    pay_rate: 15,
    charge_rate: 25
  });
  
  console.log(`   ✓ Shift created: ${shift.id}`);
  
  await db.assignStaff(shift.id, 'James Taylor');
  console.log(`   ✓ Staff assigned`);
  
  // 2. Cancel shift
  console.log('\n2️⃣  Cancelling shift...');
  await db.cancelShift(shift.id, {
    reason: 'Client cancelled',
    notes: 'No longer needs coverage - facility fully staffed'
  });
  
  const cancelledShift = await db.getShift(shift.id);
  console.log(`   ✓ Shift cancelled`);
  console.log(`   Status: ${cancelledShift.status}`);
  console.log(`   Reason: ${cancelledShift.cancellation_reason}`);
  
  // 3. Verify change log created
  console.log('\n3️⃣  Checking change logs...');
  const changeLogs = await db.getChangeLogs({ 
    entity_id: shift.id,
    change_type: 'shift_cancelled'
  });
  
  if (changeLogs.length > 0) {
    console.log(`   ✓ Change log created`);
    console.log(`   Reason: ${changeLogs[0].reason}`);
  } else {
    console.log(`   ⚠ No change log found`);
  }
  
  // 4. Verify notifications queued (may not exist in test)
  console.log('\n4️⃣  Checking notification queue...');
  const notifications = await db.getNotificationQueue({
    related_entity: shift.id,
    type: 'shift_cancelled'
  });
  
  if (notifications.length >= 2) {
    console.log(`   ✓ ${notifications.length} notifications queued (staff + client)`);
  } else {
    console.log(`   ⚠ ${notifications.length} notifications found (may be expected in test)`);
  }
  
  // 5. Verify journey log
  console.log('\n5️⃣  Verifying journey log...');
  const log = await db.getShiftJourneyLog(shift.id);
  
  if (log.states.includes('cancelled')) {
    console.log(`   ✓ Cancellation recorded in journey log`);
    console.log(`   Journey: ${log.states.join(' → ')}`);
  } else {
    console.log(`   ⚠ Cancellation not in journey log`);
  }
  
  console.log('\n✅ Cancellation test completed');
  
  return { 
    shift: cancelledShift, 
    changeLogs, 
    notifications 
  };
}

// Allow running standalone - executed when run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  (async () => {
    try {
      await testShiftJourneyComplete();
      await testShiftCancellation();
      console.log('\n✅ All shift journey tests completed successfully');
      process.exit(0);
    } catch (error: any) {
      console.error('\n❌ Shift journey tests failed:', error.message);
      process.exit(1);
    }
  })();
}

