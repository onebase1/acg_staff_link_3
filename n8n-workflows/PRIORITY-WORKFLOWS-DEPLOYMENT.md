# 🚀 Priority Workflows Deployment Guide

**Date:** 2025-11-17  
**Status:** Ready to Deploy  
**Workflows:** Daily Shift Reminders + Timesheet Reminders

---

## ✅ WORKFLOWS READY FOR UPLOAD

### **1. Daily Shift Reminders** ⭐ HIGH PRIORITY
**File:** `daily-shift-reminders.json`  
**Purpose:** Send WhatsApp reminders 24 hours before shift  
**Schedule:** Daily at 6 PM (18:00)  
**Template:** `shiftreminder`

**What it does:**
1. Runs every day at 6 PM
2. Queries shifts for tomorrow (status: confirmed/assigned)
3. Filters out staff who opted out (`opt_out_shift_reminders = true`)
4. Sends WhatsApp reminder with shift details
5. Logs notification to database

**Expected Message:**
```
🔔 SHIFT REMINDER

Hi {staff_name},

You have a shift tomorrow:
📅 {date}
⏰ 08:00 - 20:00
🏥 {client_name}
📍 {address}
💰 £{total_earnings}

View details: https://agilecaremanagement.netlify.app/staff
```

---

### **2. Timesheet Reminders** ⭐ HIGH PRIORITY
**File:** `timesheet-reminders.json`  
**Purpose:** Remind staff to submit timesheets after shift completion  
**Schedule:** Daily at 10 AM  
**Template:** `timesheetreminder`

**What it does:**
1. Runs every day at 10 AM
2. Queries completed shifts without timesheets (`timesheet_received = false`)
3. Sends WhatsApp reminder
4. Logs notification to database
5. Updates `timesheet_reminder_sent` flag

**Expected Message:**
```
📋 TIMESHEET REMINDER

Hi {staff_name},

Please submit your timesheet for:
📅 {date}
🏥 {client_name}

Submit here: https://agilecaremanagement.netlify.app/staff/timesheets
```

---

## 📋 DEPLOYMENT STEPS

### **Step 1: Upload Daily Shift Reminders**

1. Go to n8n: https://n8n.dreampathai.co.uk/
2. Click "Add workflow" → "Import from File"
3. Select: `n8n-workflows/daily-shift-reminders.json`
4. Click "Import"
5. **DO NOT ACTIVATE YET** (verify configuration first)

---

### **Step 2: Verify Configuration**

**Check these nodes:**

**Node 1: Schedule Trigger**
- ✅ Cron: `0 18 * * *` (6 PM daily)
- ✅ Timezone: Your local timezone

**Node 2: Get Tomorrow's Shifts**
- ✅ Supabase credential: `ACG-Supabase`
- ✅ Filter: `date=eq.{{ $now.plus({days: 1}).toFormat('yyyy-MM-dd') }}`
- ✅ Select: `*,clients(name,address),staff(first_name,last_name,phone,opt_out_shift_reminders)`

**Node 3: Format Reminders**
- ✅ Code extracts time as "08:00" (not raw timestamp)
- ✅ Filters out opted-out staff

**Node 4: Send Reminder**
- ✅ WhatsApp credential configured
- ✅ Phone Number ID: `683816761472557`
- ✅ Template: `shiftreminder`
- ✅ 6 parameters configured

**Node 5: Log Reminder**
- ✅ Supabase credential: `ACG-Supabase`
- ✅ Table: `notifications`

---

### **Step 3: Upload Timesheet Reminders**

1. Click "Add workflow" → "Import from File"
2. Select: `n8n-workflows/timesheet-reminders.json`
3. Click "Import"
4. **DO NOT ACTIVATE YET**

---

### **Step 4: Verify Timesheet Configuration**

**Node 1: Schedule Trigger**
- ✅ Cron: `0 10 * * *` (10 AM daily)

**Node 2: Get Completed Shifts**
- ✅ Filter: `date=lt.{{ $now.toFormat('yyyy-MM-dd') }}&timesheet_received=eq.false`

**Node 3: Send Timesheet Reminder**
- ✅ Template: `timesheetreminder`
- ✅ 4 parameters configured
- ✅ URL: `https://agilecaremanagement.netlify.app/staff/timesheets`

**Node 4: Mark Reminder Sent**
- ✅ Updates `timesheet_reminder_sent = true`
- ✅ Updates `timesheet_reminder_sent_at = now()`

---

### **Step 5: Test Before Activating**

**Test Daily Shift Reminders:**
1. Click "Execute Workflow" button (manual test)
2. Check if it finds tomorrow's shifts
3. Verify WhatsApp message format
4. Check `notifications` table for log entry

**Test Timesheet Reminders:**
1. Click "Execute Workflow" button
2. Check if it finds completed shifts without timesheets
3. Verify WhatsApp message format
4. Check `timesheet_reminder_sent` flag updated

---

### **Step 6: Activate Workflows**

Once testing is successful:

1. **Daily Shift Reminders:**
   - Toggle "Active" switch to ON
   - Verify status shows "Active"
   - Next run: Today at 6 PM

2. **Timesheet Reminders:**
   - Toggle "Active" switch to ON
   - Verify status shows "Active"
   - Next run: Tomorrow at 10 AM

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Both workflows uploaded to n8n
- [ ] All credentials configured correctly
- [ ] Manual test executed successfully
- [ ] WhatsApp messages showing correct time format (08:00-20:00)
- [ ] Notifications logged to database
- [ ] Workflows activated
- [ ] Monitor first scheduled run

---

## 🔍 MONITORING

**Check these after first run:**

1. **n8n Executions Tab:**
   - Status: Success (green)
   - No errors in execution log

2. **Supabase `notifications` Table:**
   - New entries created
   - `status = 'sent'`
   - `message_id` populated

3. **WhatsApp Messages:**
   - Staff received messages
   - Time format correct (08:00-20:00)
   - Links working

4. **Shifts Table:**
   - `timesheet_reminder_sent` updated (for timesheet workflow)
   - `timesheet_reminder_sent_at` timestamp correct

---

## 🚨 TROUBLESHOOTING

**Issue: No shifts found**
- Check database has shifts for tomorrow (shift reminders)
- Check database has completed shifts without timesheets (timesheet reminders)

**Issue: WhatsApp not sending**
- Verify WhatsApp credential configured
- Check Phone Number ID: `683816761472557`
- Verify template exists in Meta: `shiftreminder` / `timesheetreminder`

**Issue: Time showing as timestamp**
- This should be fixed in the updated JSON files
- If still showing raw timestamp, check Code node formatting

**Issue: Notifications not logging**
- Verify Supabase credential configured
- Check `notifications` table exists
- Verify RLS policies allow insert

---

## 📊 EXPECTED IMPACT

**Daily Shift Reminders:**
- ✅ 30-50% reduction in no-shows
- ✅ Better staff preparedness
- ✅ Fewer last-minute cancellations

**Timesheet Reminders:**
- ✅ 40-60% faster timesheet submission
- ✅ Reduced admin chasing time
- ✅ Faster invoicing cycle

---

**Ready to deploy!** 🚀

