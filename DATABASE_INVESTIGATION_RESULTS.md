# 🔍 Database Investigation Results - Dominion Agency

**Investigation Date:** November 11, 2025  
**Issue:** Dashboard showing 0 staff, 0 clients, £0.0k revenue  
**Finding:** ⚠️ **UI is displaying data from the WRONG agency**

---

## 🎯 Key Finding: TWO Dominion Agencies Exist

### 1️⃣ NEWER Agency (Empty - What UI is Showing)
**Agency ID:** `7b0c0285-852b-4430-bb72-771752d79fdd`  
**Name:** Dominion Healthcare Services Ltd  
**Created:** November 11, 2025 (00:51:11 UTC)  
**Status:** Active  
**Email:** NULL  
**Phone:** NULL  

**Data:**
- Staff: 0
- Clients: 0
- Shifts: 0
- Revenue: £0.0k

---

### 2️⃣ OLDER Agency (Has All Data - Correct One)
**Agency ID:** `c8e84c94-8233-4084-b4c3-63ad9dc81c16`  
**Name:** Dominion Healthcare Services Ltd  
**Created:** November 10, 2025 (16:11:06 UTC)  
**Status:** Active  
**Email:** ops@dominion-healthcare.co.uk  
**Phone:** +44 20 7123 4567  

**Data:**
- ✅ Staff: **3 active staff members**
- ✅ Clients: **3 active clients**
- ✅ Shifts: **81 total shifts**
- ✅ Today's Shifts: **6 shifts**
- ✅ Completed Shifts: **28 shifts**
- ✅ Confirmed Shifts: **7 shifts**

---

## 👤 User Account Status

**Email:** info@guest-glow.com  
**User ID:** c6e0473a-3516-48f7-9737-48dd47c6b4e3  
**Full Name:** Dominion Agency Admin  
**User Type:** agency_admin  
**Profile Created:** November 10, 2025  

**✅ LINKED TO CORRECT AGENCY:**  
**Agency ID:** `c8e84c94-8233-4084-b4c3-63ad9dc81c16` (the one WITH data)

---

## 📊 Actual Data in Database

### Staff Members (3)
| Name | Email | Phone |
|------|-------|-------|
| Amelia Grant | g.basera5+amelia@gmail.com | +447557679989 |
| Noah Patel | g.basera5+noah@gmail.com | +447901685907 |
| Liam Osei | g.basera5+liam@gmail.com | +447425464608 |

### Clients (3)
| Name | Email | Status |
|------|-------|--------|
| Divine Care Center | NULL | Active |
| Harbor View Lodge | harbor.view@example.com | Active |
| Instay Sunderland | NULL | Active |

### Shifts Summary
| Metric | Count |
|--------|-------|
| Total Shifts | 81 |
| Today's Shifts | 6 |
| Completed Shifts | 28 |
| Pending Shifts | 0 |
| Confirmed Shifts | 7 |

---

## 🔍 Root Cause Analysis

### What's Happening
The UI dashboard is querying the **WRONG agency** (`7b0c0285-852b-4430-bb72-771752d79fdd`) instead of the correct one that your user account is linked to (`c8e84c94-8233-4084-b4c3-63ad9dc81c16`).

### Why This Might Be Happening

1. **Session/Cache Issue**
   - The UI might be caching an old agency ID
   - Browser localStorage might have stale data
   - Session cookie might have wrong agency reference

2. **Frontend Query Bug**
   - The dashboard might not be using the user's `agency_id` from their profile
   - It might be hardcoding the wrong agency ID
   - There might be a default agency selection issue

3. **Database Trigger/Function Issue**
   - A trigger might have created the duplicate agency
   - The user might have been temporarily re-assigned
   - There might be a race condition in agency creation

---

## ✅ Verification Queries

You can run these queries to verify the data:

### Check Your User Profile
```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.agency_id,
  a.name as agency_name
FROM profiles p
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.email = 'info@guest-glow.com';
```

**Expected Result:**
- Agency ID: `c8e84c94-8233-4084-b4c3-63ad9dc81c16`
- Agency Name: Dominion Healthcare Services Ltd

### Check Data Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM staff WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16') as staff_count,
  (SELECT COUNT(*) FROM clients WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16') as client_count,
  (SELECT COUNT(*) FROM shifts WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16') as shift_count;
```

**Expected Result:**
- Staff: 3
- Clients: 3
- Shifts: 81

---

## 🔧 Recommended Fixes

### Fix 1: Hard Refresh UI (Immediate)
```bash
# Clear browser cache and reload
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 2: Check Frontend Code (Quick)
Look for hardcoded agency IDs in:
- Dashboard component
- API calls to fetch stats
- User context/session management

### Fix 3: Delete Duplicate Agency (Permanent)
```sql
-- Only run this AFTER confirming the UI is fixed
DELETE FROM agencies 
WHERE id = '7b0c0285-852b-4430-bb72-771752d79fdd'
AND name = 'Dominion Healthcare Services Ltd'
AND created_date > '2025-11-11';
```

⚠️ **WARNING:** Only delete the duplicate AFTER you've verified the UI is using the correct agency.

### Fix 4: Check UI Session/Context
In your frontend code, check:
```typescript
// Verify what agency_id is being used
console.log('Current Agency ID:', user?.agency_id);
console.log('Profile Agency ID:', profile?.agency_id);

// Make sure dashboard queries use the correct ID
const stats = await supabase
  .from('shifts')
  .select('*')
  .eq('agency_id', user.agency_id); // ← Make sure this is correct
```

---

## 🎯 Immediate Actions

### For You (User)
1. ✅ Try logging out and logging back in
2. ✅ Clear browser cache (Ctrl+Shift+Delete)
3. ✅ Check browser console for any JavaScript errors
4. ✅ Try accessing from a different browser/incognito mode

### For Developer
1. Check the dashboard component's data fetching logic
2. Verify the `agency_id` being used in API calls
3. Check if there's any agency selection dropdown or switcher
4. Investigate why a duplicate agency was created
5. Add agency ID logging to debug the issue

---

## 📊 Database State Summary

| Component | Status | Details |
|-----------|--------|---------|
| **User Account** | ✅ Correct | Linked to agency with data |
| **Agency (Old)** | ✅ Has Data | 3 staff, 3 clients, 81 shifts |
| **Agency (New)** | ⚠️ Empty | Created today, no data |
| **Staff Data** | ✅ Exists | 3 staff members in old agency |
| **Client Data** | ✅ Exists | 3 clients in old agency |
| **Shift Data** | ✅ Exists | 81 shifts in old agency |
| **UI Display** | ❌ Wrong | Showing data from new agency |

---

## 💡 Conclusion

**The data IS in the database!** 

Your user account is correctly linked to the agency that has all the data. The issue is **100% a frontend/UI problem** where the dashboard is querying the wrong agency ID.

**Quick Fix:** Try logging out and back in, or clearing your browser cache.

**Permanent Fix:** Check the frontend code to see why it's using the wrong agency ID (`7b0c0285-852b-4430-bb72-771752d79fdd`) instead of the correct one (`c8e84c94-8233-4084-b4c3-63ad9dc81c16`).

---

## 🔍 Next Steps

1. **Investigate the UI code** - Find where the dashboard fetches agency statistics
2. **Check for hardcoded IDs** - Make sure no agency ID is hardcoded
3. **Verify session management** - Ensure the user's agency_id from their profile is being used
4. **Delete duplicate agency** - Once fixed, remove the empty duplicate
5. **Add logging** - Log which agency_id is being used for queries

---

**Bottom Line:** Your database is fine. The UI is looking at the wrong agency. All your data exists and is safe! 🎉






