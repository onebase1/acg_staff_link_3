/**
 * MODULE 1 & 3: AUTOMATED TEST DATA SEEDER
 * 
 * This script creates test users and data for UAT testing
 * Run: node scripts/seedTestUsers.js
 * 
 * Requirements:
 * - Supabase Service Role Key in .env
 * - Divine Care Center client exists
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const AGENCY_ID = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'; // Dominion
const CLIENT_ID = 'f679e93f-97d8-4697-908a-e165f22e322a'; // Divine Care Center
const STAFF_1_ID = 'c487d84c-f77b-4797-9e98-321ee8b49a87'; // Chadaira Basera
const STAFF_2_ID = 'ee761f6f-3945-4ad2-a7de-23b119626035'; // Liam Osei

const TEST_USERS = [
    {
        email: 'g.basera5+ops_manager@gmail.com',
        password: 'Broadband@123',
        role: 'OPERATIONS_MANAGER',
        firstName: 'John',
        lastName: 'Operations',
        jobTitle: 'Operations Manager',
        department: 'Operations',
        isPrimary: true,
    },
    {
        email: 'g.basera5+finance@gmail.com',
        password: 'Broadband@123',
        role: 'FINANCE_MANAGER',
        firstName: 'Sarah',
        lastName: 'Finance',
        jobTitle: 'Finance Manager',
        department: 'Finance',
        isPrimary: false,
    },
    {
        email: 'g.basera5+coordinator@gmail.com',
        password: 'Broadband@123',
        role: 'FACILITY_COORDINATOR',
        firstName: 'Mike',
        lastName: 'Coordinator',
        jobTitle: 'Facility Coordinator',
        department: 'Operations',
        isPrimary: false,
    },
    {
        email: 'g.basera5+viewonly@gmail.com',
        password: 'Broadband@123',
        role: 'VIEW_ONLY_CONTACT',
        firstName: 'View',
        lastName: 'Only',
        jobTitle: 'Observer',
        department: 'Management',
        isPrimary: false,
    },
];

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

async function createAuthUsers() {
    console.log('\n🔐 Creating Auth Users...\n');

    const createdUsers = [];

    for (const user of TEST_USERS) {
        try {
            // Check if user exists
            const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(user.email);

            if (existingUser.user) {
                console.log(`✅ User already exists: ${user.email}`);
                createdUsers.push({ ...user, authId: existingUser.user.id });
                continue;
            }

            // Create user
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    first_name: user.firstName,
                    last_name: user.lastName,
                },
            });

            if (error) throw error;

            console.log(`✅ Created user: ${user.email} (${data.user.id})`);
            createdUsers.push({ ...user, authId: data.user.id });

        } catch (error) {
            console.error(`❌ Failed to create ${user.email}:`, error.message);
        }
    }

    return createdUsers;
}

async function createProfiles(users) {
    console.log('\n👤 Creating Profiles...\n');

    for (const user of users) {
        try {
            const { error } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: user.authId,
                    role: 'client',
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    client_id: CLIENT_ID,
                });

            if (error) throw error;
            console.log(`✅ Profile created: ${user.email}`);
        } catch (error) {
            console.error(`❌ Failed to create profile for ${user.email}:`, error.message);
        }
    }
}

async function createClientContacts(users) {
    console.log('\n🏢 Creating Client Contacts (RBAC)...\n');

    for (const user of users) {
        try {
            const { error } = await supabaseAdmin
                .from('client_contacts')
                .upsert({
                    client_id: CLIENT_ID,
                    profile_id: user.authId,
                    role: user.role,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    phone_number: `+44 7700 90000${TEST_USERS.indexOf(user) + 1}`,
                    job_title: user.jobTitle,
                    department: user.department,
                    is_primary_contact: user.isPrimary,
                    is_active: true,
                    created_by: 'test_seed_script',
                }, {
                    onConflict: 'client_id,profile_id',
                });

            if (error) throw error;
            console.log(`✅ Client contact created: ${user.role} - ${user.email}`);
        } catch (error) {
            console.error(`❌ Failed to create client_contact for ${user.email}:`, error.message);
        }
    }
}

async function createTestShifts() {
    console.log('\n📅 Creating Test Shifts...\n');

    const shifts = [];

    // 5 completed shifts (2-6 days ago)
    for (let i = 1; i <= 5; i++) {
        const daysAgo = i + 1;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        shifts.push({
            agency_id: AGENCY_ID,
            client_id: CLIENT_ID,
            date: date.toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '20:00',
            role_required: 'healthcare_assistant',
            assigned_staff_id: i % 2 === 0 ? STAFF_1_ID : STAFF_2_ID,
            status: 'completed',
            rating_status: i <= 3 ? 'awaiting_rating' : 'rated',
            client_created: true,
        });
    }

    // 5 upcoming shifts (today + next 4 days)
    for (let i = 0; i <= 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        shifts.push({
            agency_id: AGENCY_ID,
            client_id: CLIENT_ID,
            date: date.toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '20:00',
            role_required: 'healthcare_assistant',
            assigned_staff_id: i % 2 === 0 ? STAFF_1_ID : STAFF_2_ID,
            status: i === 0 ? 'in_progress' : 'confirmed',
            rating_status: 'not_required',
            client_created: true,
        });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('shifts')
            .insert(shifts)
            .select();

        if (error) throw error;
        console.log(`✅ Created ${data.length} test shifts`);
        return data;
    } catch (error) {
        console.error('❌ Failed to create shifts:', error.message);
        return [];
    }
}

async function createSampleRatings(shifts) {
    console.log('\n⭐ Creating Sample Ratings...\n');

    // Find completed shifts that are rated
    const ratedShifts = shifts.filter(s => s.status === 'completed' && s.rating_status === 'rated').slice(0, 2);

    if (ratedShifts.length === 0) {
        console.log('⚠️ No rated shifts found to add ratings');
        return;
    }

    // Get Operations Manager contact_id
    const { data: contact } = await supabaseAdmin
        .from('client_contacts')
        .select('id')
        .eq('client_id', CLIENT_ID)
        .eq('role', 'OPERATIONS_MANAGER')
        .single();

    if (!contact) {
        console.log('⚠️ Operations Manager contact not found');
        return;
    }

    const ratings = [
        {
            client_id: CLIENT_ID,
            staff_id: STAFF_1_ID,
            shift_id: ratedShifts[0]?.id,
            contact_id: contact.id,
            professionalism_rating: 5,
            competence_rating: 4,
            communication_rating: 5,
            reliability_rating: 4,
            comments: 'Excellent performance! Very professional and competent.',
            anonymized: false,
        },
    ];

    if (ratedShifts.length > 1) {
        ratings.push({
            client_id: CLIENT_ID,
            staff_id: STAFF_2_ID,
            shift_id: ratedShifts[1]?.id,
            contact_id: contact.id,
            professionalism_rating: 4,
            competence_rating: 4,
            communication_rating: 4,
            reliability_rating: 4,
            comments: 'Great work! Reliable and communicative.',
            anonymized: false,
        });
    }

    try {
        const { error } = await supabaseAdmin
            .from('client_ratings')
            .insert(ratings);

        if (error) throw error;
        console.log(`✅ Created ${ratings.length} sample ratings`);
    } catch (error) {
        console.error('❌ Failed to create ratings:', error.message);
    }
}

async function createSampleNotifications() {
    console.log('\n🔔 Creating Sample Notifications...\n');

    // Get Operations Manager contact_id
    const { data: contact } = await supabaseAdmin
        .from('client_contacts')
        .select('id')
        .eq('client_id', CLIENT_ID)
        .eq('role', 'OPERATIONS_MANAGER')
        .single();

    if (!contact) {
        console.log('⚠️ Operations Manager contact not found');
        return;
    }

    // Get a shift for rating reminder
    const { data: shift } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('client_id', CLIENT_ID)
        .eq('status', 'completed')
        .eq('rating_status', 'awaiting_rating')
        .limit(1)
        .single();

    const notifications = [
        {
            client_id: CLIENT_ID,
            contact_id: contact.id,
            type: 'rating_reminder',
            title: '⭐ Rate Staff Performance',
            message: 'Your shift from 2 days ago has been completed. Please rate the staff member.',
            related_entity_id: shift?.id,
            related_entity_type: 'shift',
            priority: 'normal',
            channel: 'in_app',
        },
        {
            client_id: CLIENT_ID,
            contact_id: contact.id,
            type: 'shift_assigned',
            title: '📅 New Shift Assigned',
            message: 'A new shift has been scheduled for tomorrow.',
            priority: 'normal',
            channel: 'in_app',
        },
        {
            client_id: CLIENT_ID,
            contact_id: contact.id,
            type: 'payment_reminder',
            title: '💳 Payment Due Soon',
            message: 'Invoice #1234 is due in 3 days. Amount: £1,250.00',
            priority: 'high',
            channel: 'in_app',
        },
        {
            client_id: CLIENT_ID,
            contact_id: contact.id,
            type: 'compliance_warning',
            title: '⚠️ Compliance Alert',
            message: 'Staff certification expires in 7 days. Please renew.',
            priority: 'urgent',
            channel: 'in_app',
        },
    ];

    try {
        const { error } = await supabaseAdmin
            .from('client_notifications')
            .insert(notifications);

        if (error) throw error;
        console.log(`✅ Created ${notifications.length} sample notifications`);
    } catch (error) {
        console.error('❌ Failed to create notifications:', error.message);
    }
}

async function verifyData() {
    console.log('\n📊 Verifying Created Data...\n');

    // Count client contacts
    const { count: contactCount } = await supabaseAdmin
        .from('client_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', CLIENT_ID);

    // Count shifts
    const { count: shiftCount } = await supabaseAdmin
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', CLIENT_ID)
        .eq('client_created', true);

    // Count ratings
    const { count: ratingCount } = await supabaseAdmin
        .from('client_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', CLIENT_ID);

    // Count notifications
    const { count: notificationCount } = await supabaseAdmin
        .from('client_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', CLIENT_ID);

    console.log(`✅ Client Contacts: ${contactCount}`);
    console.log(`✅ Test Shifts: ${shiftCount}`);
    console.log(`✅ Ratings: ${ratingCount}`);
    console.log(`✅ Notifications: ${notificationCount}`);
}

async function main() {
    console.log('🚀 MODULE 1 & 3: TEST DATA SEEDER\n');
    console.log('Agency: Dominion Healthcare Services Ltd');
    console.log('Client: Divine Care Center');
    console.log('Staff: Chadaira Basera, Liam Osei\n');

    try {
        // Step 1: Create auth users
        const users = await createAuthUsers();

        if (users.length === 0) {
            console.error('\n❌ No users created. Exiting...');
            process.exit(1);
        }

        // Step 2: Create profiles
        await createProfiles(users);

        // Step 3: Create client contacts (RBAC)
        await createClientContacts(users);

        // Step 4: Create test shifts
        const shifts = await createTestShifts();

        // Step 5: Create sample ratings
        await createSampleRatings(shifts);

        // Step 6: Create sample notifications
        await createSampleNotifications();

        // Verify
        await verifyData();

        console.log('\n✅ TEST DATA SEEDING COMPLETE!\n');
        console.log('📋 TEST USER CREDENTIALS:');
        console.log('─'.repeat(60));
        users.forEach(user => {
            console.log(`${user.role.padEnd(25)} | ${user.email}`);
        });
        console.log('─'.repeat(60));
        console.log('Password (all users): Broadband@123\n');

    } catch (error) {
        console.error('\n❌ SEEDING FAILED:', error);
        process.exit(1);
    }
}

main();
