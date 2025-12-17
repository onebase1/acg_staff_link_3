# TASK MODULE 2: Add Client Portal Sidebar Navigation

**Priority:** 🟡 **HIGH**
**Estimated Time:** 30-60 minutes
**Assigned To:** Implementation Agent
**Verification Required:** Yes (by user)

---

## PROBLEM STATEMENT

Client portal users currently have minimal navigation compared to staff portal and agency admin dashboards:

**Current State:**
- User sees "Client Portal" link in main sidebar (to get back to portal)
- No direct links to key features (Dashboard, Create Shift, Timesheets, Invoices)
- User must rely on tab navigation within ClientPortal page

**User Expectation:**
> "if you compare /staff portal sidebar links and even agency admin -- i was thinking will be more pages currently user just see client see dashboard (missing link in side bar) and they must click client portal in side bar to see their agency"

**Goal:**
Provide client portal users with navigation structure similar to staff/admin portals, with RBAC-based link visibility.

---

## REQUIREMENTS

### Navigation Links to Add:

```
Client Portal Sidebar (RBAC-filtered):
├─ Dashboard (home view)
│  └─ Roles: All
│
├─ Create Shift (single)
│  └─ Roles: OPERATIONS_MANAGER only
│
├─ Bulk Create Shifts (optional - future)
│  └─ Roles: OPERATIONS_MANAGER only
│
├─ Timesheets
│  └─ Roles: OPERATIONS_MANAGER, FACILITY_COORDINATOR
│
├─ Invoices
│  └─ Roles: OPERATIONS_MANAGER, FINANCE_MANAGER, VIEW_ONLY_CONTACT
│
└─ Notifications (bell icon already in header)
   └─ Roles: All
```

---

## APPROACH OPTIONS

### **Option A: Modify Existing Sidebar Component (RECOMMENDED)**

If there's a shared sidebar component:
1. Detect `user_type === 'client_user'`
2. Load client-specific navigation links
3. Filter by `clientRBAC` permissions

**Pros:**
- Consistent UI with rest of app
- Reuses existing navigation logic
- Easy RBAC integration

**Cons:**
- Need to locate and modify shared component

---

### **Option B: Embed Sidebar in ClientPortal.jsx**

Add a sidebar directly in the ClientPortal component.

**Pros:**
- Isolated to ClientPortal (no risk to other pages)
- Full control over layout

**Cons:**
- Duplicates sidebar code
- May look different from other portals

---

## IMPLEMENTATION INSTRUCTIONS (OPTION A)

### Step 1: Locate Sidebar Component

**File to find:** `src/components/ui/sidebar.jsx` or similar

**Search for:**
```bash
Glob pattern: **/sidebar*.{jsx,tsx}
Grep pattern: "Staff Portal|Dashboard|navigation"
```

### Step 2: Add Client Portal Navigation Config

In the sidebar component, add client portal links:

```javascript
// Example structure (adapt to existing sidebar code)
const clientPortalLinks = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/ClientPortal',
    roles: ['OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'FACILITY_COORDINATOR', 'VIEW_ONLY_CONTACT'],
    description: 'Overview and KPIs'
  },
  {
    label: 'Create Shift',
    icon: Plus,
    path: '/ClientPortal?action=create-shift', // Opens modal
    roles: ['OPERATIONS_MANAGER'],
    description: 'Request new shift'
  },
  {
    label: 'Timesheets',
    icon: Clock,
    path: '/ClientPortal?tab=timesheets',
    roles: ['OPERATIONS_MANAGER', 'FACILITY_COORDINATOR'],
    description: 'Approve timesheets'
  },
  {
    label: 'Invoices',
    icon: FileText,
    path: '/ClientPortal?tab=invoices',
    roles: ['OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'VIEW_ONLY_CONTACT'],
    description: 'View and download invoices'
  },
  {
    label: 'Shifts',
    icon: Calendar,
    path: '/ClientPortal?tab=shifts',
    roles: ['OPERATIONS_MANAGER', 'FACILITY_COORDINATOR'],
    description: "Today's shifts"
  }
];
```

### Step 3: Detect Client User and Apply Links

```javascript
// In sidebar component
const { user } = useAuth();
const [clientContact, setClientContact] = useState(null);
const [userRole, setUserRole] = useState(null);

useEffect(() => {
  if (user?.user_type === 'client_user') {
    // Fetch client_contact to get role
    const fetchClientContact = async () => {
      const { data } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .single();

      if (data) {
        setClientContact(data);
        setUserRole(data.role);
      }
    };
    fetchClientContact();
  }
}, [user]);

// Determine which navigation to show
const navigationLinks = useMemo(() => {
  if (user?.user_type === 'client_user') {
    // Filter client links by role
    return clientPortalLinks.filter(link =>
      link.roles.includes(userRole)
    );
  } else if (user?.user_type === 'staff_member') {
    return staffPortalLinks;
  } else {
    return adminDashboardLinks;
  }
}, [user, userRole]);
```

### Step 4: Render Links

```javascript
return (
  <nav className="sidebar">
    {navigationLinks.map(link => (
      <NavLink
        key={link.path}
        to={link.path}
        className="sidebar-link"
      >
        <link.icon className="w-5 h-5" />
        <span>{link.label}</span>
      </NavLink>
    ))}
  </nav>
);
```

---

## IMPLEMENTATION INSTRUCTIONS (OPTION B - If no shared sidebar)

If there's no shared sidebar component, modify `ClientPortal.jsx` directly:

### Step 1: Open ClientPortal.jsx

```
File: src/pages/ClientPortal.jsx
```

### Step 2: Add Navigation Section

After line 483 (header section), add:

```jsx
{/* NEW: Client Portal Navigation */}
<Card className="mb-6">
  <CardContent className="p-4">
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={activeTab === 'dashboard' ? 'default' : 'outline'}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard className="w-4 h-4 mr-2" />
        Dashboard
      </Button>

      {/* Only show if OPERATIONS_MANAGER */}
      {(!userRole || clientRBAC.hasPermission(userRole, 'shifts', 'create')) && (
        <Button
          variant="outline"
          onClick={() => setShowRequestForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Shift
        </Button>
      )}

      <Button
        variant={activeTab === 'timesheets' ? 'default' : 'outline'}
        onClick={() => setActiveTab('timesheets')}
      >
        <Clock className="w-4 h-4 mr-2" />
        Timesheets ({pendingTimesheets.length})
      </Button>

      <Button
        variant={activeTab === 'invoices' ? 'default' : 'outline'}
        onClick={() => setActiveTab('invoices')}
      >
        <FileText className="w-4 h-4 mr-2" />
        Invoices ({myInvoices.length})
      </Button>

      <Button
        variant={activeTab === 'shifts' ? 'default' : 'outline'}
        onClick={() => setActiveTab('shifts')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Today's Shifts ({todayShifts.length})
      </Button>
    </div>
  </CardContent>
</Card>
```

### Step 3: Add Dashboard Tab

Currently, tabs start at 'timesheets'. Add a dashboard overview tab:

```jsx
{activeTab === 'dashboard' && (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
    {/* Show KPI cards, recent activity, quick actions */}
    {/* This is the default view - same as current page load */}
  </div>
)}
```

---

## ALTERNATIVE: Reuse /postshiftV2 and /bulkcreateshift

**User mentioned:**
> "i had thought working activities pages like /postshiftV2 and /bulkcreateshift will be reused with RBAC and minor UI change"

### If User Prefers This Approach:

**Steps:**
1. Modify `/postshiftV2` page:
   - Detect `user_type === 'client_user'`
   - Auto-populate `client_id` (hide client selector)
   - Apply RBAC: Only OPERATIONS_MANAGER can access
   - All shifts created have `client_created: true`

2. Modify `/bulkcreateshift` page:
   - Same RBAC restrictions
   - CSV upload auto-assigns `client_id`

3. Add to sidebar:
   ```javascript
   {
     label: 'Post Shift',
     icon: Plus,
     path: '/postshiftV2',
     roles: ['OPERATIONS_MANAGER']
   },
   {
     label: 'Bulk Create',
     icon: Upload,
     path: '/bulkcreateshift',
     roles: ['OPERATIONS_MANAGER']
   }
   ```

**Pros:**
- Reuses existing, tested shift creation logic
- No duplicate code
- Consistent with agency admin workflow

**Cons:**
- Need to modify existing pages (risk of breaking agency admin flow)
- Requires careful RBAC testing

---

## VERIFICATION STEPS

**User must verify:**

1. Login as client user (OPERATIONS_MANAGER role)

2. **Check Sidebar:**
   - [ ] "Dashboard" link visible
   - [ ] "Create Shift" link visible (OPERATIONS_MANAGER only)
   - [ ] "Timesheets" link visible
   - [ ] "Invoices" link visible
   - [ ] "Today's Shifts" link visible

3. **Click Each Link:**
   - [ ] Dashboard → Shows overview page
   - [ ] Create Shift → Opens shift request modal OR navigates to /postshiftV2
   - [ ] Timesheets → Shows timesheet approval queue
   - [ ] Invoices → Shows invoice list
   - [ ] Today's Shifts → Shows today's shifts

4. **Test RBAC:**
   - Switch user to FINANCE_MANAGER role (if possible)
   - [ ] "Create Shift" link HIDDEN
   - [ ] "Invoices" link VISIBLE
   - [ ] Can view but not create shifts

5. **Mobile Responsiveness:**
   - [ ] Sidebar works on mobile (collapsible or hamburger menu)

---

## FILES TO MODIFY

**Option A (Shared Sidebar):**
- `src/components/ui/sidebar.jsx` (or equivalent)
- Add import: `import { clientRBAC } from '@/services/clientRBAC'`

**Option B (Embedded Navigation):**
- `src/pages/ClientPortal.jsx` (add navigation UI)

**Alternative (Reuse Pages):**
- `src/pages/postshiftV2.jsx` (add client_user detection)
- `src/pages/bulkcreateshift.jsx` (add client_user detection)
- Sidebar component (add links to these pages)

---

## QUESTIONS FOR USER

Before implementation, agent should ask:

1. **Which option do you prefer?**
   - Option A: Modify shared sidebar (consistent with other portals)
   - Option B: Embedded navigation in ClientPortal.jsx
   - Alternative: Reuse /postshiftV2 and /bulkcreateshift pages

2. **Sidebar structure:**
   - Should it match staff portal sidebar exactly?
   - Or simplified version for clients?

3. **Dashboard tab:**
   - Should "Dashboard" be the default landing view?
   - Or keep "Timesheets" as default (since that's urgent)?

---

## SUCCESS CRITERIA

- [ ] Sidebar navigation added for client portal users
- [ ] Links visible based on RBAC role
- [ ] Navigation works (no broken links)
- [ ] User can access all features without tab navigation
- [ ] Mobile responsive
- [ ] No console errors

---

**Status:** ⏳ Awaiting user decision on approach
**Verification:** ⏳ Awaiting user confirmation after implementation
