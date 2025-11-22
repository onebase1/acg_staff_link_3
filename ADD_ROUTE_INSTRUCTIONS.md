# Instructions to Add SuperAdminAgencyManagement Route

## Step 1: Add Import

In [src/pages/index.jsx](src/pages/index.jsx), add this import after line 149:

```javascript
import SuperAdminAgencyManagement from "./SuperAdminAgencyManagement";
```

So it looks like:
```javascript
import SuperAdminAgencyOnboarding from "./SuperAdminAgencyOnboarding";
import SuperAdminAgencyManagement from "./SuperAdminAgencyManagement";  // ADD THIS LINE

import GPSAccuracyMonitoring from "./GPSAccuracyMonitoring";
```

## Step 2: Add to PAGES Object

Find the PAGES object (around line 306) and add:

```javascript
SuperAdminAgencyManagement: SuperAdminAgencyManagement,
```

After the `SuperAdminAgencyOnboarding` entry.

## Step 3: Add Route

Find the Routes section (around line 488) and add:

```javascript
<Route path="/SuperAdminAgencyManagement" element={<SuperAdminAgencyManagement />} />
```

After the `SuperAdminAgencyOnboarding` route.

## Step 4: Add to Layout Navigation

In [src/pages/Layout.jsx](src/pages/Layout.jsx), find the super admin menu items (around line 107) and add:

```javascript
{ title: "Agency Management", url: createPageUrl("SuperAdminAgencyManagement"), icon: Users },
```

Make sure to import `Users` from lucide-react at the top if not already imported.

---

## Alternative: Run This Command

Or paste this into your browser console when on the app to navigate directly:

```javascript
window.location.href = '/SuperAdminAgencyManagement'
```
