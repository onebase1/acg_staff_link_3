import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📥 DOWNLOAD SHIFT SCHEDULE
 *
 * Handles secure, time-limited download links for client shift schedules
 * Supports PDF (HTML), CSV, and ICS (calendar) formats
 *
 * FEATURES:
 * ✅ Token validation (30-day expiry)
 * ✅ Reusable tokens (no one-time limit for better UX)
 * ✅ Multiple export formats
 * ✅ No authentication required (magic link)
 * ✅ Agency branding included
 */

interface ShiftData {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    role_required: string;
    status: string;
    duration_hours?: number;
    location?: string;
    notes?: string;
    staff?: { first_name?: string; last_name?: string; phone?: string };
    client?: { name?: string; address?: string | { line1?: string; line2?: string; city?: string; postcode?: string; country?: string } };
}

/** Helper to get full name from staff object */
function getStaffName(staff?: { first_name?: string; last_name?: string }): string {
    if (!staff) return 'TBC';
    const name = [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim();
    return name || 'TBC';
}

/** Helper to format address (handles both string and object formats) */
function formatAddress(address: string | { line1?: string; line2?: string; city?: string; postcode?: string; country?: string } | undefined): string {
    if (!address) return '';
    if (typeof address === 'string') return address;
    // Handle object address
    const parts = [address.line1, address.line2, address.city, address.postcode].filter(Boolean);
    return parts.join(', ');
}

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        const format = url.searchParams.get('format') || 'pdf';

        if (!token) {
            return errorPage('Missing Token', 'No download token was provided. Please use the link from your email.');
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Validate token
        const { data: tokenData, error: tokenError } = await supabase
            .from('magic_link_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData) {
            console.error('❌ [Download] Invalid token:', token);
            return errorPage('Invalid Link', 'This download link is invalid or has been revoked.');
        }

        // Check expiration
        if (new Date(tokenData.expires_at) < new Date()) {
            console.error('❌ [Download] Expired token:', token);
            return errorPage('Link Expired', 'This download link has expired. Please request a new one from your agency.');
        }

        // Log download (don't mark as used - allow multiple downloads)
        await supabase
            .from('magic_link_tokens')
            .update({
                metadata: {
                    ...tokenData.metadata,
                    last_download_at: new Date().toISOString(),
                    download_count: (tokenData.metadata?.download_count || 0) + 1
                }
            })
            .eq('id', tokenData.id);

        // Fetch agency for branding
        const { data: agency } = await supabase
            .from('agencies')
            .select('name, contact_email, contact_phone, address, logo_url')
            .eq('id', tokenData.agency_id)
            .single();

        // Build query for shifts - handle different token types
        let shiftsQuery = supabase
            .from('shifts')
            .select(`
                id, date, start_time, end_time, role_required, status, duration_hours, location, notes,
                staff:assigned_staff_id(first_name, last_name, phone),
                client:client_id(name, address)
            `)
            .eq('agency_id', tokenData.agency_id)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        // Filter by booking_id if present
        if (tokenData.booking_id) {
            shiftsQuery = shiftsQuery.eq('booking_id', tokenData.booking_id);
        }
        // Filter by client_id if present
        if (tokenData.client_id) {
            shiftsQuery = shiftsQuery.eq('client_id', tokenData.client_id);
        }

        // If metadata has date range, filter by that
        if (tokenData.metadata?.date_from) {
            shiftsQuery = shiftsQuery.gte('date', tokenData.metadata.date_from);
        }
        if (tokenData.metadata?.date_to) {
            shiftsQuery = shiftsQuery.lte('date', tokenData.metadata.date_to);
        }

        const { data: shifts, error: shiftsError } = await shiftsQuery;

        if (shiftsError) {
            console.error('❌ [Download] Shifts query error:', shiftsError);
            return errorPage('Data Error', 'Unable to retrieve shift data. Please try again later.');
        }

        if (!shifts || shifts.length === 0) {
            return errorPage('No Shifts Found', 'No shifts were found for this schedule. The shifts may have been modified or deleted.');
        }

        const agencyName = agency?.name || 'Your Agency';
        const dateStr = new Date().toISOString().split('T')[0];

        // Generate file based on format
        const fmt = format.toLowerCase();
        const safeAgencyName = agencyName.replace(/[^a-z0-9]/gi, '_');

        if (fmt === 'pdf' || fmt === 'html') {
            const htmlResult = generateHTML(shifts as ShiftData[], agency, tokenData);
            return new Response(htmlResult.content, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Disposition': `inline; filename="${safeAgencyName}_shifts_${dateStr}.html"`
                }
            });
        }

        if (fmt === 'csv') {
            const csvResult = generateCSV(shifts as ShiftData[], agency);
            return new Response(csvResult.content, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${safeAgencyName}_shifts_${dateStr}.csv"`
                }
            });
        }

        if (fmt === 'ics') {
            const icsResult = generateICS(shifts as ShiftData[], agency);
            return new Response(icsResult.content, {
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${safeAgencyName}_shifts_${dateStr}.ics"`
                }
            });
        }

        return errorPage('Invalid Format', 'Please specify a valid format: pdf, csv, or ics.');

    } catch (error) {
        console.error('❌ [Download] Fatal error:', error);
        return errorPage('Server Error', 'An unexpected error occurred. Please try again later.');
    }
});

/** Generate user-friendly error page */
function errorPage(title: string, message: string): Response {
    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;max-width:400px;}
h1{color:#dc2626;margin-bottom:16px;}p{color:#4b5563;}</style></head>
<body><div class="card"><h1>❌ ${title}</h1><p>${message}</p></div></body></html>`;
    return new Response(html, { status: 400, headers: { 'Content-Type': 'text/html' } });
}

interface AgencyInfo {
    name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    logo_url?: string;
}

interface TokenInfo {
    metadata?: { date_from?: string; date_to?: string };
}

/** Generate printable HTML (serves as PDF alternative) */
function generateHTML(shifts: ShiftData[], agency: AgencyInfo | null, token: TokenInfo): { content: string } {
    const agencyName = agency?.name || 'Your Agency';
    const generatedAt = new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

    // Group shifts by date
    const shiftsByDate = new Map<string, ShiftData[]>();
    for (const shift of shifts) {
        const existing = shiftsByDate.get(shift.date) || [];
        existing.push(shift);
        shiftsByDate.set(shift.date, existing);
    }

    // Calculate totals
    const totalHours = shifts.reduce((sum, s) => sum + (s.duration_hours || 0), 0);

    // Build shift rows
    let tableRows = '';
    const sortedDates = Array.from(shiftsByDate.keys()).sort();

    for (const date of sortedDates) {
        const dateShifts = shiftsByDate.get(date) || [];
        const dateFormatted = new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

        for (const shift of dateShifts) {
            const isNight = parseInt(shift.start_time?.split(':')[0] || '9', 10) >= 18;
            tableRows += `
                <tr>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${dateFormatted}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${shift.start_time || ''} - ${shift.end_time || ''}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">
                        <span style="background:${isNight ? '#1e293b' : '#fef3c7'};color:${isNight ? '#e0f2fe' : '#92400e'};padding:2px 8px;border-radius:4px;font-size:12px;">
                            ${isNight ? '🌙 Night' : '🌞 Day'}
                        </span>
                    </td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${formatRole(shift.role_required)}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${getStaffName(shift.staff) === 'TBC' ? '<em>TBC</em>' : getStaffName(shift.staff)}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${shift.staff?.phone || '-'}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;">${shift.duration_hours || '-'}h</td>
                </tr>
            `;
        }
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Shift Schedule - ${agencyName}</title>
<style>
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
body { font-family: Arial, sans-serif; margin: 20px; color: #1f2937; }
h1 { color: #10b981; margin-bottom: 5px; }
.header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
.summary { background: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; }
th { background: #f3f4f6; padding: 12px 10px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; }
.footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
</style></head>
<body>
<div class="header">
    <h1>📅 Shift Schedule</h1>
    <p><strong>${agencyName}</strong></p>
    ${token.metadata?.date_from ? `<p>Period: ${token.metadata.date_from} to ${token.metadata.date_to || 'ongoing'}</p>` : ''}
</div>
<div class="summary">
    <strong>📊 Summary:</strong> ${shifts.length} shifts | ${totalHours} total hours
</div>
<table>
    <thead><tr>
        <th>Date</th><th>Time</th><th>Type</th><th>Role</th><th>Staff Name</th><th>Phone</th><th>Hours</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
</table>
<div class="footer">
    Generated on ${generatedAt} | Powered by ACG StaffLink
    <br>Contact: ${agency?.contact_email || 'support@acgstafflink.com'}
</div>
</body></html>`;

    return { content: html };
}

/** Generate CSV */
function generateCSV(shifts: ShiftData[], _agency: AgencyInfo | null): { content: string } {
    const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Shift Type', 'Role', 'Staff Name', 'Staff Phone', 'Hours', 'Status'];
    const rows = [headers.join(',')];

    for (const shift of shifts) {
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
        const isNight = parseInt(shift.start_time?.split(':')[0] || '9', 10) >= 18;

        rows.push([
            date.toLocaleDateString('en-GB'),
            dayName,
            shift.start_time || '',
            shift.end_time || '',
            isNight ? 'Night' : 'Day',
            formatRole(shift.role_required),
            getStaffName(shift.staff),
            shift.staff?.phone || '',
            String(shift.duration_hours || ''),
            shift.status || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
    }

    return { content: rows.join('\n') };
}

/** Generate ICS (iCalendar) */
function generateICS(shifts: ShiftData[], agency: AgencyInfo | null): { content: string } {
    const agencyName = agency?.name || 'ACG StaffLink';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//${agencyName}//Shift Schedule//EN`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${agencyName} Shifts`
    ];

    for (const shift of shifts) {
        const dateClean = shift.date.replace(/-/g, '');
        const startTime = (shift.start_time || '09:00').replace(':', '');
        const endTime = (shift.end_time || '17:00').replace(':', '');
        const dtstart = `${dateClean}T${startTime}00`;
        const dtend = `${dateClean}T${endTime}00`;
        const staffName = getStaffName(shift.staff);
        const role = formatRole(shift.role_required);
        const location = formatAddress(shift.client?.address) || shift.location || '';

        lines.push(
            'BEGIN:VEVENT',
            `UID:${shift.id}@acgstafflink.com`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${role} - ${staffName}`,
            `DESCRIPTION:Staff: ${staffName}\\nPhone: ${shift.staff?.phone || 'N/A'}\\nRole: ${role}`,
            `LOCATION:${location.replace(/,/g, '\\,')}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-PT1H',
            'ACTION:DISPLAY',
            'DESCRIPTION:Shift starting in 1 hour',
            'END:VALARM',
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');
    return { content: lines.join('\r\n') };
}

/** Format role code to display name */
function formatRole(role: string | undefined): string {
    if (!role) return 'Staff';
    const roleMap: Record<string, string> = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker',
        'nurse': 'Nurse'
    };
    return roleMap[role.toLowerCase()] || role;
}
