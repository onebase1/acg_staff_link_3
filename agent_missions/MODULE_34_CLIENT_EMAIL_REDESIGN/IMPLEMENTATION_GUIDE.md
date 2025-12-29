# Module 34: Email Simplification - Implementation Guide

**Status:** Ready for implementation
**Priority:** High - Privacy & Compliance
**Risk:** Low (simplifying existing code)

---

## 🎯 Objectives

1. **Remove phone numbers** from all client-facing emails (privacy/CQC compliance)
2. **Simplify templates** - Remove complex download buttons (PDF/CSV/ICS)
3. **Add profile links** - Only CQC-compliant profile viewing links
4. **Clean architecture** - Use template files instead of inline HTML

---

## 📦 Deliverables

### 1. Batch Confirmation Email
**When:** Client receives shift confirmations
**Template:** `batch_confirmation.html`
**Features:**
- Grouped by Date → Time → Role
- Staff names + profile links (NO phone numbers)
- Staff count badges
- Total hours summary
- NO download buttons

### 2. Weekly Summary Email
**When:** Every Monday (or on-demand)
**Template:** `weekly_summary.html`
**Features:**
- Simple chronological table (Mon-Sun)
- Columns: Date | Time | Role | Staff Count | Hours
- Summary totals at bottom
- NO costs/pricing
- NO download buttons
- NO staff names (just counts)

---

## 🔧 Files to Modify

### Edge Functions

#### 1. `supabase/functions/notification-digest-engine/index.ts`

**REMOVE:**
- Lines 340-378: Download URL generation code (PDF/CSV/ICS)
- Lines 358-378: Download buttons HTML
- Line 807: Staff phone numbers `(${s.phone})`

**MODIFY:**
- Line 337: Change `buildGroupedShiftHtml()` to use new simplified structure
- Line 807: Replace `• ${s.name} (${s.phone})` with:
  ```typescript
  • <strong>${s.name}</strong>
  ${s.profile_link ? `<a href="${s.profile_link}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">[📋 View Profile]</a>` : ''}
  ```

**ADD:**
- Import `loadTemplate` from `_shared/templateLoader.ts`
- Use template instead of inline HTML (lines 380-462)

#### 2. `supabase/functions/weekly-client-summary/index.ts`

**REMOVE:**
- Download URL generation (if present)
- Complex `buildMonthlyAlignmentEmail()` function (lines 197-296)

**REPLACE WITH:**
- Simple table row generation
- Use `loadTemplate('weekly_summary', variables)`

#### 3. `supabase/functions/daily-client-digest/index.ts`

**ADD:**
- Profile link generation for each staff member
- Include profile links in shift rows table

---

## 🗂️ Template Updates

### Copy New Templates to Production

```bash
# Copy new simplified templates
cp agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/batch_confirmation.html \
   supabase/functions/_shared/templates/

cp agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/weekly_summary.html \
   supabase/functions/_shared/templates/
```

### Remove Old Templates

```bash
# Archive old templates
mv supabase/functions/_shared/templates/batch_confirmation_full.html \
   agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/_archive/

mv supabase/functions/_shared/templates/weekly_summary_invoice_style.html \
   agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/_archive/
```

---

## 💻 Implementation Details

### Batch Confirmation Email

#### Template Variables Required:
```typescript
{
  client_name: string,
  shift_count: number,
  shift_count_plural: string, // 's' or ''
  date_range: string, // ' across 22-28 Dec' or ''
  role_summary_boxes: string, // Generated HTML
  total_hours: number,
  grouped_shifts_html: string, // Generated HTML
  agency_name: string,
  agency_email: string,
  preferences_url: string,
  current_year: string
}
```

#### Grouped Shifts HTML Generation:

```typescript
// Pseudo-code structure
function buildGroupedShiftsHtml(enrichedItems: ShiftItem[]): string {
  const grouped = groupShiftsByDateTimeRole(enrichedItems);
  let html = '';

  for (const [date, dateGroup] of grouped) {
    // Date header
    html += `<div style="background: #f9fafb; padding: 10px 15px; border-left: 4px solid #0284c7; margin-bottom: 10px; margin-top: 15px;">
      <strong style="color: #1f2937; font-size: 16px;">${dateGroup.dateFormatted}</strong>
    </div>`;

    for (const [timeKey, timeSlot] of dateGroup.timeSlots) {
      for (const [roleKey, roleGroup] of timeSlot.roles) {
        const icon = timeSlot.shiftType === 'Night' ? '🌙' : '🌞';
        const badgeColor = timeSlot.shiftType === 'Night' ? '#1e293b' : '#fef3c7';
        const badgeTextColor = timeSlot.shiftType === 'Night' ? '#e0f2fe' : '#92400e';

        html += `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #fefefe;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1; min-width: 150px;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                ${icon} ${timeSlot.shiftType} Shift • ${timeSlot.startTime} - ${timeSlot.endTime}
              </div>
              <div style="font-size: 13px; color: #6b7280;">${formatRoleName(roleGroup.role)}</div>
            </div>
            <div style="text-align: right; min-width: 80px;">
              <div style="display: inline-block; background: ${badgeColor}; color: ${badgeTextColor}; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                ${roleGroup.staff.length} Staff
              </div>
            </div>
          </div>

          <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981;">
            <div style="font-size: 13px; color: #065f46; font-weight: 600; margin-bottom: 6px;">👥 Assigned Staff:</div>
            <div style="font-size: 13px; color: #047857; line-height: 1.8;">
              ${roleGroup.staff.map(s => `
                • <strong>${s.name}</strong>
                ${s.profile_link ? `<a href="${s.profile_link}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">[📋 View Profile]</a>` : ''}
              `).join('<br>')}
            </div>
          </div>
        </div>`;
      }
    }
  }

  return html;
}
```

### Weekly Summary Email

#### Template Variables Required:
```typescript
{
  client_name: string,
  week_range: string, // '23-29 December 2025'
  total_shifts: number,
  total_hours: number,
  total_staff: number, // Unique staff count
  shift_rows: string, // Generated HTML
  agency_name: string,
  agency_email: string,
  agency_phone: string,
  preferences_url: string,
  current_year: string
}
```

#### Shift Rows HTML Generation:

```typescript
function buildWeeklySummaryRows(shifts: any[]): string {
  return shifts.map((shift, idx) => {
    const rowColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    const dateFormatted = new Date(shift.date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    return `<tr style="background: ${rowColor};">
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 13px;">${dateFormatted}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${shift.start_time} - ${shift.end_time}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${formatRoleName(shift.role)}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700; font-size: 13px;">${shift.staff_count}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600; font-size: 13px;">${shift.duration_hours}h</td>
    </tr>`;
  }).join('');
}
```

---

## ❌ Code to Remove

### From `notification-digest-engine/index.ts`:

```typescript
// REMOVE: Lines 340-355 - Download URL generation
try {
    const dates = queue.pending_items.map((i: ShiftItem) => i.date).sort();
    downloadUrls = await generateDownloadUrls(supabase, {
        agency_id: queue.agency_id,
        metadata: {
            date_from: dates[0],
            date_to: dates[dates.length - 1],
            notification_queue_id: queue.id
        }
    });
    console.log(`✅ [Digest Engine] Generated download URLs for queue ${queue.id}`);
} catch (err) {
    console.warn(`⚠️ [Digest Engine] Failed to generate download URLs:`, err);
}

// REMOVE: Lines 358-378 - Download buttons HTML
const downloadButtonsHtml = downloadUrls.pdf ? `
    <div style="background: #f0f9ff; border: 1px solid #0284c7; border-radius: 12px; padding: 20px; margin: 25px 0;">
        ...entire download buttons section...
    </div>
` : '';
```

### From `weekly-client-summary/index.ts`:

```typescript
// REMOVE: Entire buildMonthlyAlignmentEmail() function (lines 197-296)
// REPLACE WITH: Simple loadTemplate() call
```

---

## ✅ Testing Checklist

### Batch Confirmation Email
- [ ] No phone numbers visible in email body
- [ ] Profile links present for each staff member: `[📋 View Profile]`
- [ ] Profile links open `/staffprofilesimulation?id=[STAFF_ID]`
- [ ] Grouped correctly: Date → Time → Role
- [ ] Staff count badges show correct numbers
- [ ] Total hours calculated correctly
- [ ] NO download buttons present
- [ ] Mobile responsive (test on phone)

### Weekly Summary Email
- [ ] Table shows all shifts for the week (Mon-Sun)
- [ ] Staff column shows COUNT only (not names)
- [ ] Hours column shows per-shift duration
- [ ] Total row shows correct sums
- [ ] NO costs/pricing visible
- [ ] NO download buttons
- [ ] NO phone numbers
- [ ] Chronological order (Mon → Sun)

### Daily Digest Email
- [ ] Profile links added to staff names
- [ ] NO phone numbers visible

### General
- [ ] All emails use proper agency branding
- [ ] Preference links work
- [ ] Emails send successfully via Resend
- [ ] notification_log table updated correctly
- [ ] No JavaScript errors in Edge Function logs

---

## 🚀 Deployment Steps

### 1. Update Templates
```bash
cd supabase/functions/_shared/templates/

# Backup old templates
cp batch_confirmation_full.html ../../agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/_archive/
cp weekly_summary_invoice_style.html ../../agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/_archive/

# Copy new templates
cp ../../agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/batch_confirmation.html ./
cp ../../agent_missions/MODULE_34_CLIENT_EMAIL_REDESIGN/weekly_summary.html ./
```

### 2. Modify Edge Functions
- Edit `notification-digest-engine/index.ts`
- Edit `weekly-client-summary/index.ts`
- Edit `daily-client-digest/index.ts`

### 3. Deploy Functions
```bash
# Deploy updated functions
/c/Users/gbase/superbasecli/supabase functions deploy notification-digest-engine --no-verify-jwt
/c/Users/gbase/superbasecli/supabase functions deploy weekly-client-summary --no-verify-jwt
/c/Users/gbase/superbasecli/supabase functions deploy daily-client-digest --no-verify-jwt
```

### 4. Test in Production
```bash
# Manually trigger batch confirmation (use Agency Settings UI)
# Manually trigger weekly summary (use Agency Settings UI)
# Check emails in g.basera@yahoo.com or g.basera5+clienttest3@gmail.com
```

### 5. Monitor Logs
```bash
# Check Edge Function logs in Supabase Dashboard
# Check notification_log table for successful sends
# Check for any errors in Resend dashboard
```

---

## 📊 Expected Code Reduction

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| notification-digest-engine lines | ~850 | ~650 | -200 lines |
| weekly-client-summary lines | ~300 | ~180 | -120 lines |
| Template complexity | Inline HTML | External files | Much cleaner |
| Download code | ~150 lines | 0 lines | -150 lines |
| **Total reduction** | - | - | **~470 lines** |

---

## 🔐 Security & Privacy Improvements

1. ✅ **Phone numbers removed** from emails (CQC compliance)
2. ✅ **Profile links authenticated** via magic tokens (14-day expiry)
3. ✅ **Access tracking** in `magic_link_tokens` table
4. ✅ **Simpler codebase** = less attack surface
5. ✅ **Template-based** = easier to audit for sensitive data

---

## 📝 Notes

- Keep `generateStaffProfileLink()` function - it's used for profile links
- Keep `generateDownloadUrls()` function - may be needed for future admin features
- Archive old templates but don't delete (rollback safety)
- Test emails with real Richmond data (36+ shifts scenario)
- Coordinate deployment during low-traffic period (Monday morning)

---

## 🆘 Rollback Plan

If issues occur:

1. **Revert templates:**
   ```bash
   cp _archive/batch_confirmation_full.html supabase/functions/_shared/templates/
   cp _archive/weekly_summary_invoice_style.html supabase/functions/_shared/templates/
   ```

2. **Redeploy previous versions:**
   ```bash
   git checkout HEAD~1 supabase/functions/notification-digest-engine/
   git checkout HEAD~1 supabase/functions/weekly-client-summary/
   /c/Users/gbase/superbasecli/supabase functions deploy notification-digest-engine --no-verify-jwt
   /c/Users/gbase/superbasecli/supabase functions deploy weekly-client-summary --no-verify-jwt
   ```

3. **Monitor** for successful email sends

---

**Questions?** Refer to:
- `_TEMPLATE_PARTS_REFERENCE.md` - HTML structure examples
- `batch_confirmation.html` - Final batch email template
- `weekly_summary.html` - Final weekly email template
- User screenshots in mission folder - Expected visual results

