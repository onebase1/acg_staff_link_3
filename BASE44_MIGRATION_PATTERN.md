# 🔧 BASE44 TO SUPABASE MIGRATION PATTERN

**Problem:** 43 page files still use `base44Client` compatibility layer, causing "base44 is not defined" errors  
**Solution:** Systematically replace all `base44` references with direct Supabase calls

---

## 📋 FILES AFFECTED (43 Total)

### ✅ FIXED (4 pages)
- ✅ `Dashboard.jsx`
- ✅ `Staff.jsx`
- ✅ `Shifts.jsx`
- ✅ `Clients.jsx`

### 🚨 CRITICAL - NEEDS IMMEDIATE FIX (5 pages)
- ❌ `QuickActions.jsx`
- ❌ `Bookings.jsx`
- ❌ `ShiftCalendar.jsx`
- ❌ `Timesheets.jsx`
- ❌ `Invoices.jsx`

### ⚠️ HIGH PRIORITY (10 pages)
- ❌ `LiveShiftMap.jsx`
- ❌ `StaffPortal.jsx`
- ❌ `ClientPortal.jsx`
- ❌ `ShiftMarketplace.jsx`
- ❌ `Payslips.jsx`
- ❌ `Groups.jsx`
- ❌ `ComplianceTracker.jsx`
- ❌ `AdminWorkflows.jsx`
- ❌ `OperationalCosts.jsx`
- ❌ `DisputeResolution.jsx`

### 📊 MEDIUM PRIORITY (14 pages)
- ❌ `StaffProfile.jsx`
- ❌ `InvoiceDetail.jsx`
- ❌ `TimesheetDetail.jsx`
- ❌ `AgencySettings.jsx`
- ❌ `StaffAvailability.jsx`
- ❌ `MyAvailability.jsx`
- ❌ `ProfileSetup.jsx`
- ❌ `AdminDashboard.jsx`
- ❌ `CFODashboard.jsx`
- ❌ `PerformanceAnalytics.jsx`
- ❌ `GenerateInvoices.jsx`
- ❌ `GeneratePayslips.jsx`
- ❌ `BulkDataImport.jsx`
- ❌ `OnboardClient.jsx`

### 🔧 UTILITY/TEST PAGES (10 pages)
- ❌ `TestNotifications.jsx`
- ❌ `TestShiftReminders.jsx`
- ❌ `EmailNotificationTester.jsx`
- ❌ `NotificationMonitor.jsx`
- ❌ `PhoneDiagnostic.jsx`
- ❌ `StaffProfileSimulation.jsx`
- ❌ `DataSimulationTools.jsx`
- ❌ `CleanSlate.jsx`
- ❌ `NaturalLanguageShiftCreator.jsx`
- ❌ `PostShiftV2.jsx`
- ❌ `WhatsAppSetup.jsx`
- ❌ `HelpCenter.jsx`
- ❌ `StaffGPSConsent.jsx`
- ❌ `SuperAdminAgencyOnboarding.jsx`

---

## 🎯 THE MIGRATION PATTERN

### Step 1: Change Import
```javascript
// ❌ OLD
import { base44 } from "@/api/base44Client";

// ✅ NEW
import { supabase } from "@/lib/supabase";
```

### Step 2: Fix Authentication
```javascript
// ❌ OLD
const currentUser = await base44.auth.me();

// ✅ NEW
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
if (authError || !authUser) {
  console.error('❌ Not authenticated:', authError);
  return;
}

// Get profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', authUser.id)
  .single();

if (profileError || !profile) {
  console.error('❌ Profile not found:', profileError);
  return;
}

// Use profile.agency_id, profile.user_type, etc.
```

### Step 3: Fix Queries (SELECT)
```javascript
// ❌ OLD
const data = await base44.entities.EntityName.list('-created_date', 100);
const filtered = await base44.entities.EntityName.filter({ agency_id: X });

// ✅ NEW
const { data, error } = await supabase
  .from('table_name')  // lowercase, plural
  .select('*')
  .eq('agency_id', agencyId)  // if filtering
  .order('created_date', { ascending: false })
  .limit(100);  // if limiting

if (error) {
  console.error('❌ Error:', error);
  return [];
}
return data || [];
```

### Step 4: Fix Mutations (INSERT)
```javascript
// ❌ OLD
const created = await base44.entities.EntityName.create({ field: 'value' });

// ✅ NEW
const { data: created, error } = await supabase
  .from('table_name')
  .insert({
    field: 'value',
    agency_id: currentAgency,  // Don't forget RLS fields!
    created_date: new Date().toISOString()
  })
  .select()
  .single();

if (error) throw error;
return created;
```

### Step 5: Fix Mutations (UPDATE)
```javascript
// ❌ OLD
await base44.entities.EntityName.update(id, { field: 'new_value' });

// ✅ NEW
const { error } = await supabase
  .from('table_name')
  .update({ field: 'new_value' })
  .eq('id', id);

if (error) throw error;
```

### Step 6: Fix Mutations (DELETE)
```javascript
// ❌ OLD
await base44.entities.EntityName.delete(id);

// ✅ NEW
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);

if (error) throw error;
```

### Step 7: Fix Edge Functions
```javascript
// ❌ OLD (camelCase)
const response = await base44.functions.invoke('myEdgeFunction', {
  param1: 'value'
});

// ✅ NEW (kebab-case)
const { data, error } = await supabase.functions.invoke('my-edge-function', {
  body: {
    param1: 'value'
  }
});

if (error) throw error;
return data;
```

### Step 8: Fix React Query Options
```javascript
// ❌ OLD
const { data: items = [] } = useQuery({
  queryKey: ['items', agency],
  queryFn: async () => {
    if (!agency) return [];  // Early return caches empty array!
    return await base44.entities.Item.filter({ agency_id: agency });
  },
  initialData: [],
  enabled: !loading  // Wrong condition
});

// ✅ NEW
const { data: items = [] } = useQuery({
  queryKey: ['items', currentAgency],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('agency_id', currentAgency)
      .order('created_date', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return [];
    }
    return data || [];
  },
  enabled: !!currentAgency,  // Wait for agency
  refetchOnMount: 'always'   // Always refetch
});
```

---

## 🔍 TABLE NAME MAPPING

| base44 Entity | Supabase Table | Notes |
|---------------|----------------|-------|
| `Staff` | `staff` | lowercase |
| `Client` | `clients` | plural |
| `Shift` | `shifts` | plural |
| `Booking` | `bookings` | plural |
| `Timesheet` | `timesheets` | plural |
| `Invoice` | `invoices` | plural |
| `Payslip` | `payslips` | plural |
| `Compliance` | `compliance` | singular (already plural) |
| `Group` | `groups` | plural |
| `Agency` | `agencies` | plural |
| `AdminWorkflow` | `admin_workflows` | snake_case |
| `ChangeLog` | `change_logs` | snake_case |
| `OperationalCost` | `operational_costs` | snake_case |

---

## 🚨 COMMON PITFALLS

### 1. ❌ Forgetting `agency_id`
```javascript
// ❌ BAD - RLS will block this!
await supabase.from('shifts').insert({ date: '2025-11-11' });

// ✅ GOOD - Include agency_id for RLS
await supabase.from('shifts').insert({ 
  date: '2025-11-11',
  agency_id: currentAgency  // Required for RLS!
});
```

### 2. ❌ Early Return in queryFn
```javascript
// ❌ BAD - Caches empty array, never refetches
queryFn: async () => {
  if (!agency) return [];  // This gets cached!
  return await fetchData();
}

// ✅ GOOD - Use enabled instead
queryFn: async () => {
  return await fetchData();  // No early returns
},
enabled: !!agency  // Control when query runs
```

### 3. ❌ Wrong Function Names
```javascript
// ❌ BAD - Edge functions use kebab-case
await supabase.functions.invoke('myFunction');

// ✅ GOOD - Convert camelCase to kebab-case
await supabase.functions.invoke('my-function');
```

### 4. ❌ Forgetting Error Handling
```javascript
// ❌ BAD - Silent failures
const { data } = await supabase.from('items').select();
return data;

// ✅ GOOD - Handle errors
const { data, error } = await supabase.from('items').select();
if (error) {
  console.error('❌ Error:', error);
  return [];
}
return data || [];
```

---

## 📊 PROGRESS TRACKER

Total: 47 pages (4 fixed, 43 remaining)

**Progress:** ████░░░░░░░░░░░░░░░░ 8.5% (4/47)

---

## 🎯 RECOMMENDED APPROACH

### Phase 1: Critical Pages (ASAP)
Fix these 5 pages first (30 min):
1. QuickActions
2. Bookings
3. ShiftCalendar
4. Timesheets
5. Invoices

### Phase 2: High Priority (1 hour)
Fix 10 high-priority pages

### Phase 3: Medium Priority (2 hours)
Fix 14 medium-priority pages

### Phase 4: Cleanup (1 hour)
Fix remaining utility/test pages

**Total Time Estimate:** 4.5 hours to fix all 43 pages

---

## 🔧 AUTOMATED APPROACH

Could create a script to:
1. Find all `base44Client` imports
2. Replace with `supabase` import
3. Find all `base44.` references
4. Show file + line number
5. Manual review & fix

**However:** Mutations are too complex for automation - needs manual review.

---

**LET'S START WITH THE 5 CRITICAL PAGES!** 🚀





