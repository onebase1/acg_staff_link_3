# Template Parts Reference

This document shows the dynamic HTML structure that the Edge Function should generate.

## Grouped Shifts HTML Structure

The `{{grouped_shifts_html}}` variable in `batch_confirmation.html` should be dynamically generated with this structure:

### Example Output:

```html
<!-- DATE HEADER -->
<div style="background: #f9fafb; padding: 10px 15px; border-left: 4px solid #0284c7; margin-bottom: 10px; margin-top: 15px;">
    <strong style="color: #1f2937; font-size: 16px;">Monday 23 December</strong>
</div>

<!-- SHIFT CARD: Time Slot + Role -->
<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #fefefe;">
    <!-- Header Row -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 150px;">
            <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                🌞 Day Shift • 08:00 - 20:00
            </div>
            <div style="font-size: 13px; color: #6b7280;">Healthcare Assistant</div>
        </div>
        <div style="text-align: right; min-width: 80px;">
            <div style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                3 Staff
            </div>
        </div>
    </div>

    <!-- Staff List -->
    <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid: #10b981;">
        <div style="font-size: 13px; color: #065f46; font-weight: 600; margin-bottom: 6px;">👥 Assigned Staff:</div>
        <div style="font-size: 13px; color: #047857; line-height: 1.8;">
            • <strong>Sarah Jones</strong>
            <a href="{{profile_link_1}}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">[📋 View Profile]</a><br>

            • <strong>Mike Smith</strong>
            <a href="{{profile_link_2}}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">[📋 View Profile]</a><br>

            • <strong>Emma Wilson</strong>
            <a href="{{profile_link_3}}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">[📋 View Profile]</a>
        </div>
    </div>
</div>

<!-- Repeat for Night Shift, different role, etc. -->
```

## Role Summary Boxes

The `{{role_summary_boxes}}` variable should generate:

```html
<div style="text-align: center;">
    <div style="font-size: 24px; font-weight: bold; color: #059669;">15</div>
    <div style="font-size: 12px; color: #047857;">HCA Shifts</div>
</div>
<div style="text-align: center;">
    <div style="font-size: 24px; font-weight: bold; color: #059669;">8</div>
    <div style="font-size: 12px; color: #047857;">RN Shifts</div>
</div>
```

## Weekly Summary Shift Rows

The `{{shift_rows}}` variable in `weekly_summary.html` should generate simple table rows:

```html
<!-- Example row - even background -->
<tr style="background: #ffffff;">
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 13px;">Mon 23 Dec</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">08:00 - 20:00</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">Healthcare Assistant</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700; font-size: 13px;">3</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600; font-size: 13px;">36h</td>
</tr>

<!-- Example row - odd background -->
<tr style="background: #f9fafb;">
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 13px;">Mon 23 Dec</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">20:00 - 08:00</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">Registered Nurse</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700; font-size: 13px;">2</td>
    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600; font-size: 13px;">24h</td>
</tr>
```

**Rules for Weekly Summary Rows:**
- Alternate row colors: `#ffffff` and `#f9fafb`
- Date format: "Mon 23 Dec" (short weekday, day, month)
- Staff column shows **count only** (not names)
- Hours column shows duration per shift (not cumulative)
- NO profile links in weekly summary (it's a high-level overview)
- Sort chronologically (Monday to Sunday)

---

## Key Rules for Batch Confirmation

1. **NO phone numbers** - Only staff names + profile links
2. **Group by**: Date → Time Slot → Role
3. **Day/Night badges**: Use sun 🌞 for day, moon 🌙 for night
4. **Badge colors**:
   - Day shift: `background: #fef3c7; color: #92400e` (yellow)
   - Night shift: `background: #1e293b; color: #e0f2fe` (dark blue)
5. **Profile links**: Generated via `generateStaffProfileLink()` from `_shared/magic-tokens.ts`
6. **Date format**: "Monday 23 December" (full weekday and month name)
7. **Mobile responsive**: Use flexbox with wrap for small screens

