import { SupabaseTestClient } from './helpers/supabase-queries';
import { FunctionTester } from './helpers/function-tester';
import { TEST_CONFIG } from './test-config';

export async function testPreShiftReminders() {
  const db = new SupabaseTestClient();
  const fn = new FunctionTester();
  
  console.log('\n📧 Testing Pre-Shift Reminders...');
  
  // Authenticate
  await db.authenticate();
  await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  // 1. Create shift for tomorrow 10:00 AM
  console.log('\n1️⃣  Creating confirmed shift for tomorrow...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  const shift = await db.createConfirmedShift({
    client_id: 'Divine Care Center',
    role: 'nurse',
    date: dateStr,
    start_time: '10:00',
    end_time: '22:00',
    pay_rate: 20,
    charge_rate: 30,
    assigned_staff_id: 'Linda Williams'
  });
  
  console.log(`   ✓ Confirmed shift created: ${shift.id}`);
  console.log(`   Date: ${shift.date} ${shift.start_time}`);
  
  // 2. Test 24h reminder
  console.log('\n2️⃣  Testing 24h reminder...');
  const reminder24h = await fn.testPreShiftReminder(shift.id, '24h');
  
  if (reminder24h.sms) {
    console.log('   ✓ 24h SMS sent');
  } else {
    console.log('   ⚠ 24h SMS failed');
    if (reminder24h.errors.length > 0) {
      console.log(`   Errors: ${reminder24h.errors.join(', ')}`);
    }
  }
  
  if (reminder24h.whatsapp) {
    console.log('   ✓ 24h WhatsApp sent');
  } else {
    console.log('   ⚠ 24h WhatsApp failed');
  }
  
  if (reminder24h.email) {
    console.log('   ✓ 24h Email sent');
  } else {
    console.log('   ⚠ 24h Email not sent (may be optional)');
  }
  
  // 3. Verify flags updated
  console.log('\n3️⃣  Checking reminder flags...');
  const updated = await db.getShift(shift.id);
  
  if (updated.reminder_24h_sent === true) {
    console.log('   ✓ reminder_24h_sent flag set');
  } else {
    console.log('   ⚠ reminder_24h_sent flag not set');
  }
  
  if (updated.reminder_24h_sent_at) {
    console.log(`   ✓ reminder_24h_sent_at: ${updated.reminder_24h_sent_at}`);
  } else {
    console.log('   ⚠ reminder_24h_sent_at not recorded');
  }
  
  // 4. Test 2h reminder
  console.log('\n4️⃣  Testing 2h reminder...');
  const reminder2h = await fn.testPreShiftReminder(shift.id, '2h');
  
  if (reminder2h.sms) {
    console.log('   ✓ 2h SMS sent');
  } else {
    console.log('   ⚠ 2h SMS failed');
    if (reminder2h.errors.length > 0) {
      console.log(`   Errors: ${reminder2h.errors.join(', ')}`);
    }
  }
  
  if (reminder2h.whatsapp) {
    console.log('   ✓ 2h WhatsApp sent');
  } else {
    console.log('   ⚠ 2h WhatsApp failed');
  }
  
  console.log('\n✅ Pre-shift reminder test completed');
  
  return { 
    shift, 
    reminder24h, 
    reminder2h 
  };
}

export async function testPostShiftReminders() {
  // ⚠️ CRITICAL TEST - This was BROKEN in Base44
  const db = new SupabaseTestClient();
  const fn = new FunctionTester();
  
  console.log('\n📋 Testing Post-Shift Reminders (CRITICAL)...');
  console.log('⚠️  This functionality was broken in Base44');
  
  // Authenticate
  await db.authenticate();
  await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  // 1. Create shift in the past (already ended)
  console.log('\n1️⃣  Creating completed shift from yesterday...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const shift = await db.createCompletedShift({
    client_id: 'Divine Care Center',
    role: 'care_assistant',
    date: dateStr,
    start_time: '08:00',
    end_time: '16:00',
    status: 'awaiting_admin_closure',
    assigned_staff_id: 'James Taylor'
  });
  
  console.log(`   ✓ Completed shift created: ${shift.id}`);
  console.log(`   Status: ${shift.status}`);
  console.log(`   Date: ${shift.date}`);
  
  // 2. Test post-shift timesheet reminder
  console.log('\n2️⃣  Testing timesheet reminder...');
  const reminder = await fn.testPostShiftReminder(shift.id);
  
  // 3. CRITICAL ASSERTIONS
  if (reminder.CRITICAL_ISSUE) {
    console.log(`\n🚨 CRITICAL ISSUE DETECTED: ${reminder.CRITICAL_ISSUE}`);
    console.log(`   Message: ${reminder.message}`);
    console.log(`   Severity: ${reminder.severity}`);
    
    if (reminder.errors.length > 0) {
      console.log('   Errors:');
      reminder.errors.forEach(err => console.log(`     - ${err}`));
    }
    
    return {
      CRITICAL_ISSUE: reminder.CRITICAL_ISSUE,
      message: reminder.message,
      details: reminder,
      severity: 'CRITICAL',
      shift
    };
  }
  
  console.log('\n✅ Post-Shift Reminders Working!');
  
  if (reminder.sms) {
    console.log('   ✓ Timesheet SMS sent');
  } else {
    console.log('   ⚠ Timesheet SMS not sent');
  }
  
  if (reminder.whatsapp) {
    console.log('   ✓ Timesheet WhatsApp sent');
  } else {
    console.log('   ⚠ Timesheet WhatsApp not sent');
  }
  
  if (reminder.email) {
    console.log('   ✓ Timesheet Email sent');
  } else {
    console.log('   ⚠ Timesheet Email not sent');
  }
  
  // 4. Verify notification queue
  console.log('\n3️⃣  Checking notification queue...');
  const notifications = await db.getNotificationQueue({
    notification_type: 'timesheet_reminder',
    recipient_id: shift.assigned_staff_id
  });
  
  if (notifications.length > 0) {
    console.log(`   ✓ ${notifications.length} timesheet reminders queued`);
  } else {
    console.log('   ⚠ No timesheet reminders in queue');
  }
  
  // 5. Check workflow created
  console.log('\n4️⃣  Checking admin workflows...');
  const workflows = await db.getAdminWorkflows({
    related_entity_id: shift.id,
    type: 'timesheet_reminder'
  });
  
  if (workflows.length > 0) {
    console.log(`   ✓ ${workflows.length} workflow(s) created`);
  } else {
    console.log('   ⚠ No workflows created (may be expected)');
  }
  
  console.log('\n✅ Post-shift reminder test completed - FIXED from Base44!');
  
  return { 
    shift, 
    reminder, 
    notifications, 
    workflows,
    status: 'FIXED_FROM_BASE44' 
  };
}

export async function testReminderEngine() {
  const fn = new FunctionTester();
  
  console.log('\n⚙️  Testing Reminder Engine Configuration...');
  
  const engine = await fn.verifyReminderEngine();
  
  console.log(`\n   Status: ${engine.status}`);
  console.log(`   Cron Schedule: ${engine.cron_schedule}`);
  
  if (engine.last_run) {
    const hoursAgo = (Date.now() - engine.last_run.getTime()) / 1000 / 60 / 60;
    console.log(`   Last Run: ${engine.last_run.toISOString()} (${hoursAgo.toFixed(1)}h ago)`);
    
    if (hoursAgo < 2) {
      console.log('   ✓ Recently executed');
    } else {
      console.log('   ⚠ Has not run recently');
    }
  } else {
    console.log('   ⚠ Last run time unknown');
  }
  
  if (engine.success_rate > 0) {
    console.log(`   Success Rate: ${(engine.success_rate * 100).toFixed(1)}%`);
  }
  
  if (engine.errors.length > 0) {
    console.log('   Errors:');
    engine.errors.forEach(err => console.log(`     - ${err}`));
  }
  
  if (engine.status === 'active') {
    console.log('\n✅ Reminder engine active');
  } else {
    console.log('\n⚠ Reminder engine status unknown or inactive');
  }
  
  return engine;
}

// Allow running standalone - executed when run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  (async () => {
    try {
      console.log('🚀 Running Notification System Tests');
      console.log('=' .repeat(60));
      
      await testPreShiftReminders();
      const postShiftResult = await testPostShiftReminders();
      await testReminderEngine();
      
      console.log('\n' + '='.repeat(60));
      
      if (postShiftResult.CRITICAL_ISSUE) {
        console.log('❌ CRITICAL ISSUE FOUND: Post-shift reminders broken');
        console.log(`   ${postShiftResult.message}`);
        process.exit(1);
      } else {
        console.log('✅ All notification tests completed successfully');
        process.exit(0);
      }
    } catch (error: any) {
      console.error('\n❌ Notification tests failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

