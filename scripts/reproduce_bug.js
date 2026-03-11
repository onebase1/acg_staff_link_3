
function testAvailability() {
    const shift = {
        id: '209fd4e5-6b2e-4c14-bbbe-fd827d3b08e4',
        agency_id: 'c8e84c94-8233-4084-b4c3-63ad9dc81c16',
        role_required: 'healthcare_assistant',
        date: '2026-03-10',
        start_time: '08:00',
        end_time: '20:00'
    };

    // Mock staffMember with null availability
    const staffMember = {
        id: 'some-id',
        availability: null
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shiftDateObj = new Date(shift.date);
    const dayOfWeek = dayNames[shiftDateObj.getDay()];

    let shiftBand = 'day';
    const hour = parseInt(shift.start_time.split(':')[0]);
    if (hour >= 18 || hour < 6) shiftBand = 'night';

    const availability = staffMember.availability?.[dayOfWeek];
    let isAvailable = false;

    if (typeof availability === 'boolean') {
        isAvailable = availability;
    } else if (Array.isArray(availability)) {
        isAvailable = availability.includes(shiftBand) || availability.includes('both');
    } else if (typeof availability === 'string') {
        isAvailable = ['both', 'true', shiftBand].includes(availability.toLowerCase());
    }

    console.log(`Day: ${dayOfWeek}, Band: ${shiftBand}`);
    console.log(`Is Available (null check): ${isAvailable}`);

    // Test case for fallback logic
    const currentUserProfile = { agency_id: 'dummy-id' };
    const currentAgency = currentUserProfile.agency_id || shift.agency_id;
    console.log(`Current Agency used: ${currentAgency} (Expect shift agency: ${shift.agency_id})`);
}

testAvailability();
