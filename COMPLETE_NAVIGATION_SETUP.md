# Complete Navigation Setup & RBAC Audit

## Issue Found

You're right! `SuperAdminAgencyOnboarding` exists (line 107 in Layout.jsx) but might not be visible because:
1. It's in the `superAdminItems` array which ONLY shows when `isSuperAdmin` is true
2. The check happens at line 608: `{isSuperAdmin && (...)`

## How RBAC Works in Your App

### User Type Check (Layout.jsx line 337-344)
```javascript
const shouldShowItem = (item) => {
  if (isSuperAdmin) return true; // Super admin sees EVERYTHING
  if (item.superAdminOnly) return false; // Hide from non-super admins
  if (item.adminOnly && user?.user_type !== 'agency_admin' && user?.user_type !== 'manager') return false;
  if (item.staffOnly && user?.user_type !== 'staff_member') return false;
  if (item.clientOnly && user?.user_type !== 'client_user') return false;
  return true;
};
```

### Super Admin Determination (Layout.jsx line 256-261)
```javascript
// You're super admin if:
const isSuperAdminUser = user.email === "g.basera@yahoo.com" || user.user_type === "super_admin";
setIsSuperAdmin(isSuperAdminUser);
```

---

## Steps to Complete Setup

### Step 1: Update Layout.jsx

In `src/pages/Layout.jsx` around **line 107**, add the new page right after "Agency Onboarding":

```javascript
// Super admin only items
const superAdminItems = [
  { title: "Agency Onboarding", url: createPageUrl("SuperAdminAgencyOnboarding"), icon: Building2 },
  { title: "Agency Management", url: createPageUrl("SuperAdminAgencyManagement"), icon: Users }, // ADD THIS LINE
  { title: "Platform Analytics", url: createPageUrl("PerformanceAnalytics"), icon: TrendingUp },
  // ... rest of items
];
```

### Step 2: Update index.jsx (Routing)

In `src/pages/index.jsx`:

**A. Add Import** (around line 150):
```javascript
import SuperAdminAgencyOnboarding from "./SuperAdminAgencyOnboarding";
import SuperAdminAgencyManagement from "./SuperAdminAgencyManagement"; // ADD THIS

import GPSAccuracyMonitoring from "./GPSAccuracyMonitoring";
```

**B. Add to PAGES Object** (around line 307):
```javascript
SuperAdminAgencyOnboarding: SuperAdminAgencyOnboarding,
SuperAdminAgencyManagement: SuperAdminAgencyManagement, // ADD THIS
```

**C. Add Route** (around line 489):
```javascript
<Route path="/SuperAdminAgencyOnboarding" element={<SuperAdminAgencyOnboarding />} />
<Route path="/SuperAdminAgencyManagement" element={<SuperAdminAgencyManagement />} /> {/* ADD THIS */}
```

### Step 3: Verify RBAC in Component

The new `SuperAdminAgencyManagement.jsx` already has RBAC check (lines 228-242):

```javascript
if (!isSuperAdmin) {
  return (
    <div className="max-w-xl mx-auto mt-16">
      <Alert variant="destructive">
        <Shield className="h-5 w-5" />
        <AlertDescription>
          Only platform super admins can access agency management.
        </AlertDescription>
      </Alert>
      <Button className="mt-6" onClick={() => navigate("/")}>
        Return to dashboard
      </Button>
    </div>
  );
}
```

**✅ RBAC IS PROPERLY IMPLEMENTED**

---

## Complete Page Accessibility Audit

### How to Check All Pages Are Accessible

Run this audit to find pages that might not be linked:

```javascript
// Run in browser console
const allPages = window.PAGES; // Get all registered pages
const allRoutes = Array.from(document.querySelectorAll('a[href^="/"]')).map(a => a.pathname);
const missing = Object.keys(allPages).filter(page => !allRoutes.some(route => route.includes(page)));
console.log('Pages without navigation links:', missing);
```

### Current Navigation Structure

**Main Navigation (Regular Users)**:
- OPERATIONS: Dashboard, QuickActions, Shifts, etc.
- WORKFORCE: Staff, Clients, Compliance
- FINANCIALS: Invoices, Payslips, Analytics
- MANAGEMENT: Analytics, Workflows, GPS Monitor

**Staff Portal** (staff_member only):
- Staff Portal
- My Shifts
- Find Shifts
- My Availability
- My Compliance

**Client Portal** (client_user only):
- Client Portal

**Super Admin Section** (super_admin only):
- Agency Onboarding ← **EXISTING**
- Agency Management ← **NEW - NEEDS TO BE ADDED**
- Platform Analytics
- CFO Dashboard
- Shift Journey Diagram
- Functions Audit
- Admin Training Hub
- Notification Monitor
- Test Shift Reminders
- Phone Diagnostic
- UAT Tester Guide
- Day One Readiness
- Phase 2/3 Tracker
- Validation Matrix
- Data Simulation Tools
- Clean Slate Utility
- Email Notification Tester
- Testing Tracker
- Test User Credentials
- Capabilities Matrix
- Investor Pitch Deck
- Dominion Presentation

**Settings Dropdown**:
- Agency Profile
- GPS Consent
- Help Center

---

## Where Super Admin Items Appear

### In Sidebar (Layout.jsx lines 608-627)

```javascript
{isSuperAdmin && (
  <div className="mt-6 pt-6 border-t border-gray-200">
    <div className="section-header">
      <Shield className="w-4 h-4 text-purple-600 mr-2" />
      <span>Super Admin</span>
    </div>
    <div className="ml-2">
      {superAdminItems.map((item) => (
        <Link key={item.title} to={item.url} className={...}>
          <item.icon className="w-4 h-4" />
          <span className="ml-3">{item.title}</span>
        </Link>
      ))}
    </div>
  </div>
)}
```

**This only renders if `isSuperAdmin === true`**

---

## How to Test

### Test as Super Admin

1. Log in as `g.basera@yahoo.com`
2. Open sidebar (hamburger menu on mobile, or check left side on desktop)
3. Scroll to bottom - you should see **"Super Admin"** section
4. Within that section, look for:
   - ✅ "Agency Onboarding" (existing)
   - ⏳ "Agency Management" (new - will appear after Step 1 & 2 above)

### Test as Agency Admin

1. Log in as agency admin (e.g., `info@guest-glow.com`)
2. Open sidebar
3. **Should NOT see "Super Admin" section at all**
4. Try navigating to `/SuperAdminAgencyManagement` directly:
   - Should be blocked by RBAC (see "Only platform super admins..." message)

### Test as Staff Member

1. Log in as staff member
2. **Should NOT see:**
   - Operations, Workforce, Financials, Management sections
3. **Should ONLY see:**
   - Staff Portal items

---

## Why Navigation Might Be Hidden

### Possible Reasons for Invisibility

1. **Not Super Admin**: If `isSuperAdmin` is false, entire section is hidden
2. **User Type Not Set**: If `user.user_type` is not "super_admin" AND email is not "g.basera@yahoo.com"
3. **Page Not in Array**: If page not added to `superAdminItems` array
4. **Route Not Registered**: If route not added to index.jsx
5. **Sidebar Collapsed**: On mobile, sidebar might be closed
6. **Scrolling Required**: Super Admin section is at the bottom - need to scroll

---

## Quick Test Commands

### Check Current User
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('sb-rzzxxkppkiasuouuglaf-auth-token'))?.user;
console.log('Email:', user?.email);
console.log('User Type:', user?.user_metadata?.user_type || user?.app_metadata?.user_type);
console.log('Is Super Admin:', user?.email === 'g.basera@yahoo.com' || user?.user_metadata?.user_type === 'super_admin');
```

### List All Navigation Items
```javascript
// In browser console - check what's in sidebar
Array.from(document.querySelectorAll('.sidebar-link')).map(a => a.textContent.trim())
```

### Navigate Directly
```javascript
// Force navigate to the page
window.location.href = '/SuperAdminAgencyManagement'
```

---

## RBAC Summary

### Access Levels

| User Type | What They See |
|-----------|---------------|
| `super_admin` or `g.basera@yahoo.com` | **EVERYTHING** (all sections + Super Admin section) |
| `agency_admin` | Operations, Workforce, Financials, Management |
| `manager` | Operations, Workforce, Financials, Management |
| `staff_member` | Staff Portal only |
| `client_user` | Client Portal only |
| `pending` | Nothing (needs approval) |

### Super Admin Exclusive Pages

These pages can ONLY be accessed by super admin:
- SuperAdminAgencyOnboarding
- SuperAdminAgencyManagement ← NEW
- All items in `superAdminItems` array

### Enforcement Points

**1. Navigation (Layout.jsx line 608)**:
```javascript
{isSuperAdmin && (
  // Entire section hidden if not super admin
)}
```

**2. Component Level (SuperAdminAgencyManagement.jsx lines 228-242)**:
```javascript
if (!isSuperAdmin) {
  return <Alert>Only platform super admins...</Alert>
}
```

**3. API Level** (RLS policies in database):
- Only super admin can query all agencies
- Only super admin can invite agency admins

---

## Recommendations

### Immediate Actions

1. **Add navigation links** (Steps 1 & 2 above)
2. **Test access as different user types**
3. **Document which pages should be in which sections**

### Future Improvements

1. **Add page registry** - Auto-detect pages without navigation
2. **Add RBAC audit tool** - Show which pages each role can access
3. **Add breadcrumbs** - Show user where they are
4. **Add "Recently Visited"** - Quick access to frequently used pages

### Create Page Inventory

Create a file `PAGE_INVENTORY.md` listing:
- All pages
- Which navigation section they're in
- Which user types can access
- Whether they have RBAC checks

This prevents pages from being "lost" or recreated.

---

## After Setup

Once you complete Steps 1-3, you should see:

**Super Admin Sidebar Section**:
```
🛡️ Super Admin
  └─ Agency Onboarding
  └─ Agency Management ← NEW!
  └─ Platform Analytics
  └─ CFO Dashboard
  └─ [... rest of items]
```

**Access the page**:
- Click "Agency Management" in sidebar
- Or navigate to `/SuperAdminAgencyManagement`
- See all 5 agencies with admin details
- Add admins via modal dialog

---

## Files to Modify

1. ✅ `src/pages/SuperAdminAgencyManagement.jsx` - Already created with RBAC
2. ⏳ `src/pages/Layout.jsx` - Add to superAdminItems (line 107)
3. ⏳ `src/pages/index.jsx` - Add import, PAGES entry, and route

**That's it! Just 2 files to modify.**
