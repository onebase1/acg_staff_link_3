# JavaScript Template Functions for n8n

This document contains all JavaScript code needed for n8n Function nodes to build HTML emails.

---

## Table of Contents

1. [Batch Confirmation Email](#batch-confirmation-email)
2. [Daily Digest Email](#daily-digest-email)
3. [Weekly Summary Email](#weekly-summary-email)
4. [Shared Helper Functions](#shared-helper-functions)

---

## Batch Confirmation Email

### Complete Function for n8n

```javascript
// ============================================================================
// BATCH CONFIRMATION EMAIL BUILDER
// ============================================================================
// Use this in a Function node after fetching shift data from database

// Input: Shift data from PostgreSQL query
// Expected: $input.all() returns array of shift objects with:
//   - date, start_time, end_time, role_required, duration_hours
//   - first_name, last_name, staff_id
//   - client_name, client_email, client_id, agency_id

const shifts = $input.all().map(item => item.json);

// Extract client and agency info (from first shift)
const firstShift = shifts[0];
const clientName = firstShift.client_name;
const clientEmail = firstShift.client_email;
const clientId = firstShift.client_id;
const agencyId = firstShift.agency_id;
const agencyName = firstShift.agency_name || 'ACG StaffLink';
const agencyEmail = firstShift.agency_email || 'support@acgstafflink.com';

// Group shifts by Date → Time → Role
const grouped = groupShiftsByDateTimeRole(shifts);

// Calculate totals
const totalShifts = shifts.length;
const totalHours = shifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
const roleCounts = getRoleCounts(shifts);
const dateRange = getDateRange(shifts);

// Build HTML sections
const roleSummaryBoxes = buildRoleSummaryBoxes(roleCounts);
const groupedShiftsHtml = buildGroupedShiftHtml(grouped);

// Build complete HTML email
const currentYear = new Date().getFullYear();
const shiftCountPlural = totalShifts !== 1 ? 's' : '';
const dateRangeText = dateRange ? ` on ${dateRange}` : '';

const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
</head>

<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- HEADER -->
        <div style="background-color: #10b981; padding: 30px 20px; text-align: center;" bgcolor="#10b981">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 32px;">✅</span>
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Shifts Confirmed</h1>
            </div>
        </div>

        <!-- CONTENT -->
        <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                Dear ${clientName},
            </p>

            <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                We're pleased to confirm that <strong>${totalShifts} shift${shiftCountPlural}</strong> have been successfully filled for your facility${dateRangeText}.
            </p>

            <!-- SUMMARY BOX -->
            <div style="background-color: #d1fae5; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
                <div style="font-size: 18px; color: #065f46; font-weight: bold; margin-bottom: 8px;">
                    📊 Coverage Summary
                </div>
                <div style="display: flex; justify-content: center; gap: 30px; margin-top: 12px; flex-wrap: wrap;">
                    ${roleSummaryBoxes}
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #059669;">${totalHours}h</div>
                        <div style="font-size: 12px; color: #047857;">Total Hours</div>
                    </div>
                </div>
            </div>

            <!-- DETAILED SCHEDULE -->
            <h2 style="color: #1f2937; font-size: 18px; margin: 30px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                📅 Detailed Schedule
            </h2>

            ${groupedShiftsHtml}

            <!-- FOOTER NOTE -->
            <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>📍 Location:</strong> ${clientName}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>🔔 Reminder:</strong> Staff will arrive 10-15 minutes before shift start
                </div>
                <div style="font-size: 14px; color: #6b7280;">
                    <strong>📞 Questions?</strong> Contact ${agencyName} at
                    <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a>
                </div>
            </div>
        </div>

        <!-- FOOTER -->
        <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 13px;">© ${currentYear} ${agencyName}. All rights reserved.</p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
                Need help? Contact us at <a href="mailto:${agencyEmail}" style="color: #06b6d4; text-decoration: none;">${agencyEmail}</a>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b;">
                Powered by ACG StaffLink
            </p>
        </div>

    </div>
</body>
</html>`;

// Return data for webhook call
return {
    html_content: html,
    subject: `Shift Confirmation - ${clientName}`,
    client_email: clientEmail,
    client_name: clientName,
    client_id: clientId,
    agency_id: agencyId
};

// ============================================================================
// HELPER FUNCTIONS (include in same Function node)
// ============================================================================

function groupShiftsByDateTimeRole(shifts) {
    const grouped = new Map();

    for (const shift of shifts) {
        const dateKey = shift.date;
        const dateFormatted = new Date(shift.date).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, {
                date: dateKey,
                dateFormatted: dateFormatted,
                timeSlots: new Map()
            });
        }

        const dateGroup = grouped.get(dateKey);
        const timeKey = `${shift.start_time}-${shift.end_time}`;
        const shiftType = isNightShift(shift.start_time) ? 'Night' : 'Day';

        if (!dateGroup.timeSlots.has(timeKey)) {
            dateGroup.timeSlots.set(timeKey, {
                startTime: shift.start_time,
                endTime: shift.end_time,
                shiftType: shiftType,
                roles: new Map()
            });
        }

        const timeSlot = dateGroup.timeSlots.get(timeKey);
        const roleKey = shift.role_required || 'Staff';

        if (!timeSlot.roles.has(roleKey)) {
            timeSlot.roles.set(roleKey, {
                role: roleKey,
                staff: []
            });
        }

        const staffName = shift.first_name && shift.last_name
            ? `${shift.first_name} ${shift.last_name}`
            : 'TBC';

        timeSlot.roles.get(roleKey).staff.push({
            name: staffName,
            staff_id: shift.staff_id,
            profile_link: shift.staff_id ? `https://acgstafflink.com/staff/${shift.staff_id}` : null
        });
    }

    return grouped;
}

function isNightShift(startTime) {
    if (!startTime) return false;
    const hour = parseInt(startTime.split(':')[0], 10);
    return hour >= 18 || hour < 6;
}

function getDateRange(shifts) {
    if (!shifts || shifts.length === 0) return '';

    const dates = shifts.map(s => new Date(s.date)).sort((a, b) => a - b);
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    if (firstDate.getTime() === lastDate.getTime()) {
        return firstDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    const formatDate = (d) => d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
    });
    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
}

function getRoleCounts(shifts) {
    const counts = {};
    for (const shift of shifts) {
        const role = formatRoleName(shift.role_required || 'Staff');
        counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
}

function buildRoleSummaryBoxes(roleCounts) {
    return Object.entries(roleCounts).map(([role, count]) => `
        <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${count}</div>
            <div style="font-size: 12px; color: #047857;">${role} Shifts</div>
        </div>
    `).join('');
}

function formatRoleName(role) {
    const roleMap = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker'
    };
    return roleMap[role.toLowerCase()] || role;
}

function buildGroupedShiftHtml(grouped) {
    let html = '';

    // Sort dates
    const sortedDates = Array.from(grouped.entries()).sort((a, b) =>
        new Date(a[0]) - new Date(b[0])
    );

    for (const [_, dateGroup] of sortedDates) {
        // Date header
        html += `
            <div style="background: #f9fafb; padding: 10px 15px; border-left: 4px solid #0284c7; margin-bottom: 10px; margin-top: 15px;">
                <strong style="color: #1f2937; font-size: 16px;">${dateGroup.dateFormatted}</strong>
            </div>
        `;

        // Time slots
        for (const [_, timeSlot] of dateGroup.timeSlots) {
            const shiftIcon = timeSlot.shiftType === 'Night' ? '🌙' : '🌞';
            const badgeColor = timeSlot.shiftType === 'Night' ? '#1e293b' : '#fef3c7';
            const badgeTextColor = timeSlot.shiftType === 'Night' ? '#e0f2fe' : '#92400e';

            // Role sections within time slot
            for (const [_, roleGroup] of timeSlot.roles) {
                const staffCount = roleGroup.staff.length;

                html += `
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #fefefe;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                            <div style="flex: 1; min-width: 150px;">
                                <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                                    ${shiftIcon} ${timeSlot.shiftType} Shift • ${timeSlot.startTime} - ${timeSlot.endTime}
                                </div>
                                <div style="font-size: 13px; color: #6b7280;">${formatRoleName(roleGroup.role)}</div>
                            </div>
                            <div style="text-align: right; min-width: 80px;">
                                <div style="display: inline-block; background: ${badgeColor}; color: ${badgeTextColor}; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                                    ${staffCount} Staff
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981;">
                            <div style="font-size: 13px; color: #065f46; font-weight: 600; margin-bottom: 6px;">👥 Assigned Staff:</div>
                            <div style="font-size: 13px; color: #047857; line-height: 1.6;">
                                ${roleGroup.staff.map(s => `
                                    <div style="margin-bottom: 8px;">
                                        • <strong>${s.name}</strong>
                                        ${s.profile_link ? `
                                            <a href="${s.profile_link}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">
                                                [📋 View Profile]
                                            </a>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    return html;
}
```

---

## Daily Digest Email

### Complete Function for n8n

```javascript
// ============================================================================
// DAILY DIGEST EMAIL BUILDER
// ============================================================================
// Use this in a Function node after fetching tomorrow's shifts

// Input: Tomorrow's shifts from PostgreSQL query
// Expected: $input.all() returns array of shift objects
const shifts = $input.all().map(item => item.json);

// Client data from loop
const client = $node['Loop Over Clients'].json;
const clientName = client.name;
const clientEmail = client.email;
const clientId = client.id;
const agencyId = client.agency_id;
const agencyName = client.agency_name || 'ACG StaffLink';
const agencyEmail = client.agency_email || 'support@acgstafflink.com';
const agencyPhone = client.agency_phone || '';

// Calculate tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowFormatted = tomorrow.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});

// Sort shifts by start time
shifts.sort((a, b) => a.start_time.localeCompare(b.start_time));

// Build shift rows
const shiftRows = shifts.map(shift => {
    const staffName = shift.first_name && shift.last_name
        ? `${shift.first_name} ${shift.last_name}`
        : 'TBC';
    const role = formatRoleName(shift.role_required || 'Staff');
    const statusBadge = shift.status === 'confirmed'
        ? '<span style="color: #10b981;">✓ Confirmed</span>'
        : '<span style="color: #6b7280;">Pending</span>';

    return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 15px; font-size: 13px; color: #1f2937;">
                ${shift.start_time} - ${shift.end_time}
            </td>
            <td style="padding: 12px 15px; font-size: 13px; color: #1f2937;">
                ${role}
            </td>
            <td style="padding: 12px 15px; font-size: 13px; color: #1f2937;">
                <strong>${staffName}</strong>
            </td>
            <td style="padding: 12px 15px; text-align: right; font-size: 13px;">
                ${statusBadge}
            </td>
        </tr>
    `;
}).join('');

const currentYear = new Date().getFullYear();
const portalUrl = `https://acgstafflink.com/client-portal/${clientId}`;

const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
</head>

<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

        <!-- HEADER -->
        <div style="background-color: #6366f1; padding: 30px 20px; text-align: center;" bgcolor="#6366f1">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 32px;">🕒</span>
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Tomorrow's Schedule</h1>
            </div>
        </div>

        <!-- CONTENT -->
        <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                Dear ${clientName},
            </p>

            <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                Here is a summary of your scheduled staff for tomorrow, <strong>${tomorrowFormatted}</strong>. All staff
                have confirmed their attendance and have been sent automated reminders.
            </p>

            <!-- SHIFT TABLE -->
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                                Time</th>
                            <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                                Role</th>
                            <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                                Staff Member</th>
                            <th style="padding: 12px 15px; text-align: right; border-bottom: 2px solid #e5e7eb; font-size: 14px; color: #4b5563;">
                                Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shiftRows}
                    </tbody>
                </table>
            </div>

            <!-- QUICK ACTIONS -->
            <div style="background: #f0f9ff; border: 2px solid #6366f1; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <p style="margin: 0 0 15px 0; font-size: 15px; color: #1e1b4b; font-weight: bold;">
                    Need to make a change or book more staff?
                </p>
                <a href="${portalUrl}"
                    style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                    Go to Client Portal
                </a>
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>📍 Location:</strong> ${clientName}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>🔔 Policy:</strong> All staff are instructed to arrive 10-15 minutes prior to shift start for handover.
                </div>
                <div style="font-size: 14px; color: #6b7280;">
                    <strong>📞 Support:</strong> Contact ${agencyName} at ${agencyEmail} ${agencyPhone ? `or ${agencyPhone}` : ''}
                </div>
            </div>
        </div>

        <!-- FOOTER -->
        <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 13px;">© ${currentYear} ${agencyName}. All rights reserved.</p>
            <p style="margin: 15px 0 0 0; font-size: 10px; color: #64748b; line-height: 1.4;">
                This is an automated digest sent to ${clientName} contact person.<br>
                Sent by ${agencyName} • Powered by ACG StaffLink
            </p>
        </div>

    </div>
</body>
</html>`;

return {
    html_content: html,
    subject: `Tomorrow's Staff Schedule - ${clientName}`,
    client_email: clientEmail,
    client_name: clientName,
    client_id: clientId,
    agency_id: agencyId
};

// ============================================================================
// HELPER FUNCTION
// ============================================================================

function formatRoleName(role) {
    const roleMap = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker'
    };
    return roleMap[role.toLowerCase()] || role;
}
```

---

## Weekly Summary Email

### Complete Function for n8n

```javascript
// ============================================================================
// WEEKLY SUMMARY EMAIL BUILDER
// ============================================================================
// Use this in a Function node after calling get_weekly_summary_data() RPC

// Input: Summary data from RPC function
const summaryData = $input.all().map(item => item.json);

// Client data from loop
const client = $node['Loop Over Clients'].json;
const dateRange = $node['Function - Calculate Date Range'].json;

const clientName = client.name;
const clientEmail = client.email;
const clientId = client.id;
const agencyId = client.agency_id;
const agencyName = client.agency_name || 'ACG StaffLink';
const agencyEmail = client.agency_email || 'support@acgstafflink.com';
const agencyPhone = client.agency_phone || '';

// Format week range
const weekRange = `${formatDate(new Date(dateRange.start_date))} - ${formatDate(new Date(dateRange.end_date))}`;

// Calculate totals
const totalShifts = summaryData.reduce((sum, row) => sum + (row.shift_count || 0), 0);
const totalHours = summaryData.reduce((sum, row) => sum + (row.total_hours || 0), 0);
const uniqueStaff = new Set(summaryData.map(row => row.staff_id).filter(Boolean)).size;

// For MTD (Month-to-Date), we'll use same data for now
// In production, you'd query additional data for full month
const totalShiftsMTD = totalShifts;
const totalHoursMTD = totalHours;
const totalStaffMTD = uniqueStaff;

// Build shift rows
const shiftRows = summaryData.map(row => {
    const date = formatDateShort(new Date(row.shift_date));
    const role = formatRoleName(row.role);
    const staffCount = row.shift_count || 0;
    const hours = row.total_hours || 0;

    return `
        <tr>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #1f2937;">
                ${date}
            </td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #1f2937;">
                ${row.time_slot || 'N/A'}
            </td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #1f2937;">
                ${role}
            </td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; font-size: 13px; font-weight: bold; color: #0284c7;">
                ${staffCount}
            </td>
            <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-size: 13px; color: #1f2937;">
                ${hours.toFixed(1)}h
            </td>
        </tr>
    `;
}).join('');

const currentYear = new Date().getFullYear();

const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
</head>

<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">

        <!-- HEADER -->
        <div style="background-color: #0284c7; padding: 30px 20px; text-align: center;" bgcolor="#0284c7">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 32px;">📅</span>
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Weekly Schedule Summary</h1>
            </div>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">${weekRange}</p>
        </div>

        <!-- CONTENT -->
        <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                Dear ${clientName},
            </p>

            <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                Here's your weekly staffing summary for the week of ${weekRange}.
            </p>

            <!-- SUMMARY STATS -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0; margin-bottom: 25px; overflow: hidden;">
                <!-- Weekly Row -->
                <div style="background: #f0f9ff; padding: 15px; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-size: 11px; color: #0369a1; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; margin-bottom: 10px; text-align: center;">
                        Weekly Summary</div>
                    <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${totalShifts}</div>
                            <div style="font-size: 10px; color: #64748b;">Shifts</div>
                        </div>
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${totalHours.toFixed(1)}h</div>
                            <div style="font-size: 10px; color: #64748b;">Hours</div>
                        </div>
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${uniqueStaff}</div>
                            <div style="font-size: 10px; color: #64748b;">Staff</div>
                        </div>
                    </div>
                </div>
                <!-- MTD Row -->
                <div style="background: #fdf2f8; padding: 15px;">
                    <div style="font-size: 11px; color: #9d174d; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; margin-bottom: 10px; text-align: center;">
                        Month-to-Date (MTD) Summary</div>
                    <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #be185d;">${totalShiftsMTD}</div>
                            <div style="font-size: 10px; color: #64748b;">Total Shifts</div>
                        </div>
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #be185d;">${totalHoursMTD.toFixed(1)}h</div>
                            <div style="font-size: 10px; color: #64748b;">Total Hours</div>
                        </div>
                        <div style="text-align: center; flex: 1; min-width: 80px;">
                            <div style="font-size: 20px; font-weight: bold; color: #be185d;">${totalStaffMTD}</div>
                            <div style="font-size: 10px; color: #64748b;">Unique Staff</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SCHEDULE TABLE -->
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #1e293b; color: #ffffff;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #334155;">Date</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #334155;">Time</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #334155;">Role</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #334155;">Staff</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #334155;">Hours</th>
                    </tr>
                </thead>
                <tbody>
                    ${shiftRows}
                </tbody>
                <!-- TOTAL ROW -->
                <tfoot>
                    <tr style="background: #0284c7; color: #ffffff; font-weight: bold;">
                        <td colspan="3" style="padding: 12px; border: 1px solid #0369a1; text-align: right;">Total:</td>
                        <td style="padding: 12px; border: 1px solid #0369a1; text-align: center; font-size: 16px;">
                            ${uniqueStaff}</td>
                        <td style="padding: 12px; border: 1px solid #0369a1; text-align: right; font-size: 16px;">
                            ${totalHours.toFixed(1)}h</td>
                    </tr>
                </tfoot>
            </table>

            <!-- FOOTER NOTE -->
            <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>📍 Location:</strong> ${clientName}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    <strong>📞 Support:</strong> Contact ${agencyName} at
                    <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a>
                    ${agencyPhone ? ` or ${agencyPhone}` : ''}
                </div>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                Questions? Contact ${agencyName} at <a href="mailto:${agencyEmail}"
                    style="color: #0284c7; text-decoration: none;">${agencyEmail}</a>
            </p>
        </div>

        <!-- FOOTER -->
        <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 13px;">© ${currentYear} ${agencyName}. All rights reserved.</p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
                Need help? Contact us at <a href="mailto:${agencyEmail}"
                    style="color: #06b6d4; text-decoration: none;">${agencyEmail}</a>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 10px; color: #64748b;">
                Powered by ACG StaffLink
            </p>
        </div>

    </div>
</body>
</html>`;

return {
    html_content: html,
    subject: `Weekly Summary - ${clientName} (${weekRange})`,
    client_email: clientEmail,
    client_name: clientName,
    client_id: clientId,
    agency_id: agencyId
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateShort(date) {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function formatRoleName(role) {
    const roleMap = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker'
    };
    return roleMap[role.toLowerCase()] || role;
}
```

---

## Shared Helper Functions

These functions are used across multiple templates and can be included in any Function node.

### formatRoleName

```javascript
function formatRoleName(role) {
    const roleMap = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker',
        'nurse': 'RN',
        'carer': 'Carer',
        'hca': 'HCA'
    };
    if (!role) return 'Staff';
    return roleMap[role.toLowerCase()] || role;
}
```

### isNightShift

```javascript
function isNightShift(startTime) {
    if (!startTime) return false;
    const hour = parseInt(startTime.split(':')[0], 10);
    return hour >= 18 || hour < 6; // Night if start >= 6pm or < 6am
}
```

### formatDate

```javascript
function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}
```

### formatDateShort

```javascript
function formatDateShort(date) {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}
```

### calculateTomorrowDate

```javascript
function calculateTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
}
```

### calculateWeekRange

```javascript
function calculateWeekRange() {
    const today = new Date();

    // Get last Monday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);

    // Get last Sunday
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    return {
        start_date: lastMonday.toISOString().split('T')[0],
        end_date: lastSunday.toISOString().split('T')[0]
    };
}
```

---

## Usage Notes

### In n8n Function Nodes

1. **Access Input Data**: Use `$input.all()` or `$input.first()`
2. **Access Other Node Data**: Use `$node['Node Name'].json`
3. **Return Data**: Always return an object with required fields
4. **Testing**: Use n8n's built-in function tester before deploying

### Variable Injection

All variables use JavaScript template literals:
- `${variable}` - Direct injection
- `${variable || 'default'}` - With fallback
- `${variable ? 'yes' : 'no'}` - Conditional

### Error Handling

Add try-catch blocks for production:

```javascript
try {
    // Your template building code
    return { html_content: html, subject: subject };
} catch (error) {
    return {
        error: true,
        message: error.message,
        stack: error.stack
    };
}
```

### Performance Tips

1. **Cache formatted dates** - Don't format the same date multiple times
2. **Use Map for lookups** - Faster than array.find()
3. **Limit HTML string concatenation** - Use array.join() for large lists
4. **Pre-calculate totals** - Don't recalculate in loops

---

## Testing Templates

### Sample Input Data

**For Batch Confirmations**:
```json
[
  {
    "date": "2025-01-15",
    "start_time": "07:00",
    "end_time": "19:00",
    "role_required": "healthcare_assistant",
    "duration_hours": 12,
    "first_name": "John",
    "last_name": "Doe",
    "staff_id": "uuid-here",
    "client_name": "Test Care Home",
    "client_email": "test@example.com",
    "agency_id": "agency-uuid"
  }
]
```

**For Daily Digest**:
```json
[
  {
    "start_time": "07:00",
    "end_time": "19:00",
    "role_required": "healthcare_assistant",
    "first_name": "Jane",
    "last_name": "Smith",
    "status": "confirmed"
  }
]
```

**For Weekly Summary**:
```json
[
  {
    "shift_date": "2025-01-06",
    "time_slot": "07:00 - 19:00",
    "role": "healthcare_assistant",
    "shift_count": 3,
    "total_hours": 36.0
  }
]
```

---

## Version History

- **v1.0** (2025-12-31): Initial implementation for n8n workflows
- Based on Supabase Edge Function templates from Module 34
