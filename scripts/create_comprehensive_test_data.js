import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Today is November 13, 2025
const TODAY = new Date('2025-11-13');

function createDate(daysOffset) {
  const date = new Date(TODAY);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function createTimestamp(daysOffset, hour) {
  const date = new Date(TODAY);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function createTestData() {
  console.log('🏗️  Creating comprehensive test data for Chadaira...\n');
  console.log(`📅 Today's date: ${TODAY.toISOString().split('T')[0]} (November 13, 2025)\n`);
  
  try {
    // Get Chadaira's details
    const { data: chadaira, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', 'g.basera5+chadaira@gmail.com')
      .single();
    
    if (staffError) {
      console.error('❌ Error fetching Chadaira:', staffError.message);
      return;
    }
    
    console.log('✅ Chadaira found:', {
      staff_id: chadaira.id,
      user_id: chadaira.user_id,
      role: chadaira.role,
      agency_id: chadaira.agency_id
    });
    
    // Get a client for the shifts
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('agency_id', chadaira.agency_id)
      .limit(1)
      .single();
    
    if (clientError) {
      console.error('❌ Error fetching client:', clientError.message);
      return;
    }
    
    console.log('✅ Client found:', client.name);
    
    // Test shifts to create
    const testShifts = [
      // PAST SHIFTS (before Nov 13)
      {
        date: createDate(-10), // Nov 3
        start_time: createTimestamp(-10, 9),
        end_time: createTimestamp(-10, 17),
        status: 'completed',
        assigned_staff_id: chadaira.id,
        description: 'Past completed shift',
        marketplace_visible: false
      },
      {
        date: createDate(-7), // Nov 6
        start_time: createTimestamp(-7, 14),
        end_time: createTimestamp(-7, 22),
        status: 'completed',
        assigned_staff_id: chadaira.id,
        description: 'Past evening shift',
        marketplace_visible: false
      },
      {
        date: createDate(-3), // Nov 10
        start_time: createTimestamp(-3, 7),
        end_time: createTimestamp(-3, 15),
        status: 'confirmed',
        assigned_staff_id: chadaira.id,
        description: 'Past confirmed shift',
        marketplace_visible: false
      },
      
      // CURRENT SHIFTS (Nov 13 - today)
      {
        date: createDate(0), // Nov 13 (today)
        start_time: createTimestamp(0, 9),
        end_time: createTimestamp(0, 17),
        status: 'assigned',
        assigned_staff_id: chadaira.id,
        description: 'Today - assigned shift',
        marketplace_visible: false
      },
      {
        date: createDate(0), // Nov 13 (today)
        start_time: createTimestamp(0, 18),
        end_time: createTimestamp(0, 22),
        status: 'confirmed',
        assigned_staff_id: chadaira.id,
        description: 'Today - evening confirmed shift',
        marketplace_visible: false
      },
      
      // FUTURE SHIFTS - Assigned to Chadaira
      {
        date: createDate(2), // Nov 15
        start_time: createTimestamp(2, 9),
        end_time: createTimestamp(2, 17),
        status: 'assigned',
        assigned_staff_id: chadaira.id,
        description: 'Future assigned shift',
        marketplace_visible: false
      },
      {
        date: createDate(5), // Nov 18
        start_time: createTimestamp(5, 14),
        end_time: createTimestamp(5, 22),
        status: 'confirmed',
        assigned_staff_id: chadaira.id,
        description: 'Future confirmed shift',
        marketplace_visible: false
      },
      
      // FUTURE SHIFTS - Available in marketplace
      {
        date: createDate(7), // Nov 20
        start_time: createTimestamp(7, 9),
        end_time: createTimestamp(7, 17),
        status: 'open',
        assigned_staff_id: null,
        description: 'Marketplace - available shift',
        marketplace_visible: true
      },
      {
        date: createDate(10), // Nov 23
        start_time: createTimestamp(10, 7),
        end_time: createTimestamp(10, 15),
        status: 'open',
        assigned_staff_id: null,
        description: 'Marketplace - early morning shift',
        marketplace_visible: true
      },
      {
        date: createDate(14), // Nov 27
        start_time: createTimestamp(14, 18),
        end_time: createTimestamp(14, 22),
        status: 'open',
        assigned_staff_id: null,
        description: 'Marketplace - evening shift',
        marketplace_visible: true
      }
    ];
    
    console.log(`\n📋 Creating ${testShifts.length} test shifts...\n`);
    
    const createdShifts = [];
    
    for (const shiftData of testShifts) {
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          agency_id: chadaira.agency_id,
          client_id: client.id,
          date: shiftData.date,
          start_time: shiftData.start_time,
          end_time: shiftData.end_time,
          role_required: 'healthcare_assistant',
          status: shiftData.status,
          assigned_staff_id: shiftData.assigned_staff_id,
          marketplace_visible: shiftData.marketplace_visible,
          pay_rate: 15.50,
          charge_rate: 22.00,
          notes: shiftData.description,
          urgency: 'normal'
        })
        .select()
        .single();
      
      if (shiftError) {
        console.error(`❌ Error creating shift for ${shiftData.date}:`, shiftError.message);
      } else {
        console.log(`✅ Created: ${shiftData.date} - ${shiftData.status} - ${shiftData.description}`);
        createdShifts.push(shift);
      }
    }
    
    console.log(`\n✅ Successfully created ${createdShifts.length} shifts!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestData().catch(console.error);

