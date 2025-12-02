# MODULE B: STAFF PORTAL RBAC - Role-Specific Features for Different Staff Types

**Priority:** POST-MVP (Strategic - Future Growth)
**Estimated Time:** 10-14 hours
**Complexity:** MEDIUM
**Use Case:** Drivers, Coordinators, Compliance Officers need different portal experiences

---

## BUSINESS JUSTIFICATION

### The Future Vision

**Current State:**
- All staff see same portal (shifts, timesheets, compliance)
- No differentiation between nurses, drivers, coordinators

**Target State (When You Expand Services):**
- **Drivers** see pickup/dropoff routes, mileage tracking
- **Coordinators** see team schedules, submit group timesheets
- **Compliance Officers** verify documents, track training expiry
- **Field Workers** (nurses/HCAs) see standard portal

### **When to Build This:**
- When you onboard your first driver (transport services)
- When you add team-based shifts (coordinator role)
- When compliance becomes separate function

---

## STAFF PORTAL ROLE DEFINITIONS

### 1. FIELD_WORKER (Default)
**Persona:** Nurses, HCAs, care workers (99% of current staff)
**Portal:** Standard shift portal

**Features:**
- ✅ View my shifts
- ✅ Clock in/out with GPS
- ✅ Submit timesheets
- ✅ Upload compliance documents
- ✅ View my availability
- ✅ Find open shifts

### 2. DRIVER
**Persona:** Transport staff who pick up/drop off workers
**Portal:** Route-focused portal

**Features:**
- ✅ View route map (pickups/dropoffs for the day)
- ✅ Clock in/out with GPS + mileage tracking
- ✅ Mark pickups as complete
- ✅ Report delays/issues
- ✅ Submit mileage claims
- ❌ Cannot see standard shifts (not relevant to them)

### 3. COORDINATOR
**Persona:** Senior staff, team leads
**Portal:** Team management portal

**Features:**
- ✅ View team schedules
- ✅ Submit group timesheets for team
- ✅ Assign shifts to team members
- ✅ View team compliance status
- ✅ Clock in/out for self
- ✅ Limited admin access (no financial data)

### 4. COMPLIANCE_OFFICER
**Persona:** Dedicated compliance checker
**Portal:** Verification dashboard

**Features:**
- ✅ View all staff compliance documents
- ✅ Approve/reject uploaded documents
- ✅ Track training expiry dates
- ✅ Send reminders for renewals
- ❌ Cannot clock in/out (office role)
- ❌ Cannot see shifts or timesheets

---

## DATABASE SCHEMA

```sql
-- Table: staff_portal_roles
CREATE TABLE IF NOT EXISTS staff_portal_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Portal Role
  portal_role TEXT NOT NULL DEFAULT 'FIELD_WORKER',
  -- Options: FIELD_WORKER, DRIVER, COORDINATOR, COMPLIANCE_OFFICER

  -- Role-specific settings
  role_settings JSONB DEFAULT '{}'::jsonb,
  -- Example for DRIVER: {"vehicle_id": "...", "license_plate": "..."}
  -- Example for COORDINATOR: {"team_ids": ["...", "..."], "max_team_size": 10}

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),

  CONSTRAINT unique_staff_portal_role UNIQUE (staff_id, profile_id),
  CONSTRAINT valid_portal_role CHECK (portal_role IN (
    'FIELD_WORKER', 'DRIVER', 'COORDINATOR', 'COMPLIANCE_OFFICER'
  ))
);

CREATE INDEX idx_staff_portal_roles_staff_id ON staff_portal_roles(staff_id);
CREATE INDEX idx_staff_portal_roles_profile_id ON staff_portal_roles(profile_id);
CREATE INDEX idx_staff_portal_roles_portal_role ON staff_portal_roles(portal_role);

-- RLS
ALTER TABLE staff_portal_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portal role"
  ON staff_portal_roles
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage portal roles"
  ON staff_portal_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager', 'super_admin')
    )
  );

-- Backfill: Default all existing staff to FIELD_WORKER
INSERT INTO staff_portal_roles (staff_id, profile_id, portal_role)
SELECT s.id, s.user_id, 'FIELD_WORKER'
FROM staff s
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM staff_portal_roles spr WHERE spr.staff_id = s.id
  );
```

---

## DRIVER-SPECIFIC FEATURES

### **Route Map Component** (`src/pages/staff/DriverRouteMap.jsx`)

```jsx
export default function DriverRouteMap() {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    // Fetch driver's pickups/dropoffs for today
    fetchDriverRoutes();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📍 Today's Route</CardTitle>
      </CardHeader>
      <CardContent>
        <Map>
          {routes.map(pickup => (
            <Marker
              key={pickup.id}
              position={pickup.gps_location}
              label={pickup.staff_name}
              status={pickup.status}
            />
          ))}
        </Map>

        <div className="mt-4">
          <h3>Pickup Schedule</h3>
          {routes.map(pickup => (
            <div key={pickup.id} className="flex justify-between border-b py-2">
              <span>{pickup.time} - {pickup.staff_name}</span>
              <span>{pickup.address}</span>
              {pickup.status === 'pending' ? (
                <Button onClick={() => markPickupComplete(pickup.id)}>
                  Mark Complete
                </Button>
              ) : (
                <Badge variant="success">✅ Completed</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### **Mileage Tracker** (`src/pages/staff/MileageTracker.jsx`)

```jsx
export default function MileageTracker() {
  const [mileageClaims, setMileageClaims] = useState([]);

  const submitMileageClaim = async (claim) => {
    await supabase.from('mileage_claims').insert({
      driver_id: currentUser.id,
      date: claim.date,
      start_mileage: claim.start_mileage,
      end_mileage: claim.end_mileage,
      total_miles: claim.end_mileage - claim.start_mileage,
      rate_per_mile: 0.45,  // HMRC rate
      total_claim: (claim.end_mileage - claim.start_mileage) * 0.45,
      status: 'pending'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🚗 Mileage Claims</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mileage claim form and history */}
      </CardContent>
    </Card>
  );
}
```

---

## COORDINATOR-SPECIFIC FEATURES

### **Team Schedule View** (`src/pages/staff/TeamSchedule.jsx`)

```jsx
export default function TeamSchedule() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamShifts, setTeamShifts] = useState([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Team Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar>
          {teamShifts.map(shift => (
            <Event
              key={shift.id}
              title={`${shift.staff_name} - ${shift.client_name}`}
              start={shift.start_time}
              end={shift.end_time}
              color={shift.status === 'confirmed' ? 'green' : 'orange'}
            />
          ))}
        </Calendar>

        <div className="mt-4">
          <h3>Team Members ({teamMembers.length})</h3>
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center gap-2 border-b py-2">
              <Avatar src={member.photo_url} />
              <span>{member.name}</span>
              <Badge>{member.shifts_this_week} shifts</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## COMPLIANCE OFFICER FEATURES

### **Document Verification Dashboard** (`src/pages/staff/ComplianceVerification.jsx`)

```jsx
export default function ComplianceVerification() {
  const [pendingDocuments, setPendingDocuments] = useState([]);

  const verifyDocument = async (docId, approved) => {
    await supabase.from('compliance').update({
      verification_status: approved ? 'approved' : 'rejected',
      verified_by: currentUser.id,
      verified_at: new Date()
    }).eq('id', docId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Documents Pending Verification</CardTitle>
        <Badge>{pendingDocuments.length} pending</Badge>
      </CardHeader>
      <CardContent>
        {pendingDocuments.map(doc => (
          <div key={doc.id} className="border-b py-3">
            <div className="flex justify-between items-start">
              <div>
                <h4>{doc.staff_name}</h4>
                <p className="text-sm text-gray-600">{doc.document_type}</p>
                <p className="text-xs">Uploaded: {doc.uploaded_at}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="success" onClick={() => verifyDocument(doc.id, true)}>
                  ✅ Approve
                </Button>
                <Button variant="destructive" onClick={() => verifyDocument(doc.id, false)}>
                  ❌ Reject
                </Button>
              </div>
            </div>
            <a href={doc.document_url} target="_blank" className="text-blue-600 text-sm">
              View Document →
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## CONDITIONAL PORTAL RENDERING

### **Updated `StaffPortal.jsx`**

```jsx
import { useStaffPortalRole } from '@/hooks/useStaffPortalRole';
import FieldWorkerPortal from './FieldWorkerPortal';
import DriverPortal from './DriverPortal';
import CoordinatorPortal from './CoordinatorPortal';
import ComplianceOfficerPortal from './ComplianceOfficerPortal';

export default function StaffPortal() {
  const { portalRole, loading } = useStaffPortalRole();

  if (loading) return <LoadingSpinner />;

  // Route to correct portal based on role
  switch (portalRole) {
    case 'DRIVER':
      return <DriverPortal />;
    case 'COORDINATOR':
      return <CoordinatorPortal />;
    case 'COMPLIANCE_OFFICER':
      return <ComplianceOfficerPortal />;
    case 'FIELD_WORKER':
    default:
      return <FieldWorkerPortal />;
  }
}
```

---

## TESTING CHECKLIST

- [ ] FIELD_WORKER sees standard portal
- [ ] DRIVER sees route map and mileage tracker
- [ ] COORDINATOR sees team schedule and group timesheets
- [ ] COMPLIANCE_OFFICER sees verification dashboard
- [ ] Admin can assign portal roles via UI
- [ ] Switching roles updates portal instantly

---

**END OF MODULE B SPECIFICATION**

**When to Build:** Post-MVP when you expand to transport services or add team coordinators.
