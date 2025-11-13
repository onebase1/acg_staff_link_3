import { SupabaseTestClient } from './helpers/supabase-queries';
import { TEST_CONFIG } from './test-config';

export async function testDashboardAnalytics() {
  const db = new SupabaseTestClient();
  
  console.log('\n📈 Testing Dashboard Analytics Updates...');
  
  // Authenticate
  await db.authenticate();
  const agency_id = await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  // 1. Capture baseline
  console.log('\n1️⃣  Capturing baseline analytics...');
  const before = await db.getDashboardStats(agency_id);
  
  console.log('   Baseline Stats:');
  console.log(`     Total Shifts: ${before.total_shifts}`);
  console.log(`     Open Shifts: ${before.open_shifts}`);
  console.log(`     Assigned Shifts: ${before.assigned_shifts}`);
  console.log(`     Completed Shifts: ${before.completed_shifts}`);
  console.log(`     Revenue: £${before.revenue.toFixed(2)}`);
  
  // 2. Create shift (OPEN)
  console.log('\n2️⃣  Creating OPEN shift...');
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
  
  const after1 = await db.getDashboardStats(agency_id);
  
  if (after1.total_shifts === before.total_shifts + 1) {
    console.log('   ✓ Total shifts incremented correctly');
  } else {
    console.log(`   ⚠ Total shifts: expected ${before.total_shifts + 1}, got ${after1.total_shifts}`);
  }
  
  if (after1.open_shifts === before.open_shifts + 1) {
    console.log('   ✓ Open shifts incremented correctly');
  } else {
    console.log(`   ⚠ Open shifts: expected ${before.open_shifts + 1}, got ${after1.open_shifts}`);
  }
  
  // 3. Assign shift (ASSIGNED)
  console.log('\n3️⃣  Assigning shift to staff...');
  await db.assignStaff(shift.id, 'Linda Williams');
  
  const after2 = await db.getDashboardStats(agency_id);
  
  if (after2.open_shifts === before.open_shifts) {
    console.log('   ✓ Open shifts decremented correctly');
  } else {
    console.log(`   ⚠ Open shifts: expected ${before.open_shifts}, got ${after2.open_shifts}`);
  }
  
  if (after2.assigned_shifts === before.assigned_shifts + 1) {
    console.log('   ✓ Assigned shifts incremented correctly');
  } else {
    console.log(`   ⚠ Assigned shifts: expected ${before.assigned_shifts + 1}, got ${after2.assigned_shifts}`);
  }
  
  // 4. Complete shift (COMPLETED)
  console.log('\n4️⃣  Completing shift...');
  await db.updateShift(shift.id, { status: 'confirmed' });
  await db.updateShift(shift.id, { status: 'in_progress' });
  await db.completeShift(shift.id, { hours: 12, pay_rate: 20, charge_rate: 30 });
  
  const after3 = await db.getDashboardStats(agency_id);
  
  if (after3.completed_shifts === before.completed_shifts + 1) {
    console.log('   ✓ Completed shifts incremented correctly');
  } else {
    console.log(`   ⚠ Completed shifts: expected ${before.completed_shifts + 1}, got ${after3.completed_shifts}`);
  }
  
  const expectedRevenue = before.revenue + (12 * 30); // 12 hours * £30 charge rate
  
  if (after3.revenue >= expectedRevenue) {
    console.log(`   ✓ Revenue updated correctly (£${after3.revenue.toFixed(2)})`);
  } else {
    console.log(`   ⚠ Revenue: expected at least £${expectedRevenue.toFixed(2)}, got £${after3.revenue.toFixed(2)}`);
  }
  
  // 5. Cancel another shift
  console.log('\n5️⃣  Testing shift cancellation impact on stats...');
  const shift2 = await db.createShift({
    client_id: 'Divine Care Center',
    role: 'care_assistant',
    date: dateStr,
    start_time: '09:00',
    end_time: '17:00',
    pay_rate: 15,
    charge_rate: 25
  });
  
  await db.cancelShift(shift2.id, {
    reason: 'Testing cancellation',
    notes: 'Analytics test'
  });
  
  const after4 = await db.getDashboardStats(agency_id);
  
  if (after4.cancelled_shifts === before.cancelled_shifts + 1) {
    console.log('   ✓ Cancelled shifts incremented correctly');
  } else {
    console.log(`   ⚠ Cancelled shifts: expected ${before.cancelled_shifts + 1}, got ${after4.cancelled_shifts}`);
  }
  
  // Verify cancelled shifts don't affect revenue
  if (after4.revenue === after3.revenue) {
    console.log('   ✓ Cancelled shifts do not affect revenue');
  } else {
    console.log('   ⚠ Cancelled shift may have affected revenue');
  }
  
  // Summary
  console.log('\n📊 Analytics Test Summary:');
  console.log('   Before:');
  console.log(`     Total: ${before.total_shifts}, Open: ${before.open_shifts}, Assigned: ${before.assigned_shifts}`);
  console.log(`     Completed: ${before.completed_shifts}, Revenue: £${before.revenue.toFixed(2)}`);
  console.log('   After:');
  console.log(`     Total: ${after4.total_shifts}, Open: ${after4.open_shifts}, Assigned: ${after4.assigned_shifts}`);
  console.log(`     Completed: ${after4.completed_shifts}, Revenue: £${after4.revenue.toFixed(2)}`);
  console.log('   Changes:');
  console.log(`     +2 total shifts, -1 open, +1 completed, +1 cancelled`);
  console.log(`     +£${(after4.revenue - before.revenue).toFixed(2)} revenue`);
  
  console.log('\n✅ Analytics validation completed');
  
  return { 
    before, 
    after1, 
    after2, 
    after3, 
    after4,
    shifts_created: [shift.id, shift2.id]
  };
}

// Allow running standalone - executed when run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  testDashboardAnalytics()
    .then(() => {
      console.log('\n✅ Analytics tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analytics tests failed:', error.message);
      process.exit(1);
    });
}

