# DISCOVERY REPORT: MODULE 1 - CLIENT PORTAL

**Generated:** 2025-12-02  
**Agent:** Antigravity AI  
**Objective:** Audit existing client portal implementation and identify gaps vs. target spec

---

## EXECUTIVE SUMMARY

**Current State:** Basic client portal exists with timesheet approval, shift viewing, invoice management, and shift requests.  
**Target State:** Enterprise RBAC system with 4 roles, shift creation workflow, staff rating system, and notification hub.  
**Key Findings:**
- ✅ Client portal foundation exists (`ClientPortal.jsx`)
- ❌ **No ClientContact table** - spec assumes this exists, but we have `profiles` with `client_id`
- ❌ **No RBAC enforcement** - all clients have same permissions
- ❌ **No ClientRating table** - rating system doesn't exist
- ❌ **No ClientNotification table** - notifications not tracked in database
- ✅ Shift request capability exists (basic)
- ✅ Timesheet approval workflow functional

---

## SECTION 1: CURRENT RBAC IMPLEMENTATION

### **Finding:** NO RBAC SYSTEM EXISTS

**Database State:**
- ✅ `profiles` table exists with `role` column (text)
- ✅ `profiles.client_id` links users to clients
- ❌ **No `ClientContact` table** (spec assumes this exists)
- ❌ No role enum or constraints
- ❌ No middleware checking roles

**Code State:**
- ✅ `ClientPortal.jsx` exists and functional
- ❌ No role-based UI rendering
- ❌ No API middleware for role checks
- ❌ No `middleware/clientAuth.js` file found

**Current Access Model:**
- All users with `client_id` can access full portal
- No differentiation between operations managers, finance, etc.
- Timesheet approval available to all client users
- Shift creation available to all client users

**Gap Analysis:**
- **SPEC ASSUMPTION ERROR:** Spec references `ClientContact` table which doesn't exist
- **RECOMMENDATION:** Use `profiles` table with new role column or create `ClientContact` table
- **REQUIRED:** Create RBAC middleware + permission matrix
- **REQUIRED:** Add role-based UI rendering in `ClientPortal.jsx`

---

## SECTION 2: CLIENT PORTAL FEATURES AUDIT

### **2.1 Existing Features (ClientPortal.jsx)**

✅ **Implemented:**
1. **Dashboard View**
   - KPI cards: Pending timesheets, hours (30 days), total paid, outstanding balance
   - Visual alerts for overdue invoices
   - Tabbed interface (Timesheets, Summary, Invoices, Shifts)

2. **Timesheet Approval**
   - View pending timesheets
   - Approve/reject workflow
   - GPS geofence validation display
   - Cost preview before approval
   - Mutation hooks for approval/rejection

3. **Shift Viewing**
   - Today's shifts displayed
   - Status badges (confirmed, in_progress, open)
   - Staff assignment shown

4. **Shift Request Form**
   - Basic shift creation form
   - Fields: date, time, role, urgency, requirements
   - Auto-calculates duration
   - Sets default rates from contract_terms
   - Status set to 'open' (not 'client_created')

5. **Invoice Management**
   - View all invoices
   - Status badges (paid, overdue, pending)
   - Download invoice PDF
   - Balance due tracking

6. **Services Summary**
   - 30-day metrics (hours, staff count, cost)
   - Recent shifts display

❌ **Missing (vs Spec):**
1. **RBAC System** - No role restrictions
2. **Staff Rating System** - No rating interface or database
3. **Notification Hub** - No in-app notification center
4. **Notification Preferences** - No settings UI
5. **Advanced Shift Creation** - No conflict detection, no staff suggestions
6. **Bulk Shift Upload** - Not implemented
7. **Analytics Dashboard** - Basic summary exists, but no advanced charts
8. **Payment Portal** - No Stripe/PayPal integration

---

## SECTION 3: DATABASE SCHEMA GAPS

### **3.1 Current Tables (Relevant)**

#### ✅ **clients** (36 columns)
- `id`, `agency_id`, `name`, `type`, `status`
- `contact_person` (JSONB) - stores basic contact info
- `phone`, `email`, `address`, `location`
- `contract_terms` (JSONB) - includes rates_by_role
- `rating`, `created_date`, `updated_date`
- `billing_email`, `payment_terms`
- `location_coordinates` (JSONB), `geofence_enabled`
- `cqc_rating`, `bed_capacity`, `preferred_staff`
- `notes`, `total_bookings`
- `desirability_score`, `score_breakdown`

#### ✅ **profiles** (13 columns)
- `id` (UUID, links to auth.users)
- `full_name`, `email`, `phone`
- `user_type` (text: 'admin', 'staff', 'client', etc.)
- `agency_id`, `client_id`
- `role` (text) - currently used for admin/user
- `is_super_admin`, `profile_photo_url`
- `created_at`, `updated_at`

#### ✅ **shifts** (70+ columns)
- Has `client_id`, `agency_id`, `assigned_staff_id`
- Has `status`, `urgency`, `notes`
- ❌ **No `client_created` column** (spec mentions this)
- ❌ **No `rating_status` column** (spec: awaiting_rating, rated, disputed)

#### ✅ **notification_queue** (exists)
- Used for email/SMS queuing
- ❌ **Not client-facing** - no in-app notification tracking

### **3.2 Missing Tables (Required by Spec)**

❌ **ClientContact** (spec lines 88-284)
- Spec expects: `id`, `client_id`, `role`, `notification_preferences`
- **CONFLICT:** This table doesn't exist; we use `profiles` instead
- **RECOMMENDATION:** Either:
  - **Option A:** Add role column to `profiles` table (simpler)
  - **Option B:** Create new `ClientContact` table and link to profiles

❌ **ClientRating** (spec lines 286-301)
- Required fields: `id`, `client_id`, `staff_id`, `shift_id`
- Rating dimensions: professionalism, competence, communication, reliability
- `overall_rating` (DECIMAL), `comments` (TEXT), `anonymized` (BOOLEAN)
- `created_at`, `updated_at`

❌ **ClientNotification** (spec lines 303-315)
- Required fields: `id`, `client_id`, `type`, `title`, `message`
- `related_entity_id`, `related_entity_type`, `read_at`, `channel`
- `created_at`

---

## SECTION 4: API ENDPOINTS AUDIT

### **4.1 Existing API Integration (ClientPortal.jsx)**

✅ **Implemented (Direct Supabase Calls):**
- `GET /clients` - Fetch client record
- `GET /shifts` (filtered by client_id)
- `GET /timesheets` (filtered by client_id)
- `GET /staff` - Fetch all staff (for name lookup)
- `GET /invoices` (filtered by client_id)
- `GET /agencies` (by agency_id)
- `PATCH /timesheets/:id` - Approve/reject timesheet
- `POST /shifts` - Create shift request

❌ **Missing (Required by Spec):**
- `POST /api/client/shifts` - Dedicated client shift endpoint with RBAC
- `GET /api/client/shifts?filters` - Advanced filtering
- `DELETE /api/client/shifts/:id` - Cancel shift
- `POST /api/client/ratings` - Submit rating
- `GET /api/client/ratings/:shift_id` - View rating
- `PATCH /api/client/notification-preferences` - Update preferences
- `GET /api/client/notifications` - Fetch notifications
- `PATCH /api/client/notifications/:id/read` - Mark as read
- `GET /api/client/dashboard` - Analytics API
- `GET /api/client/invoices` - Dedicated invoice API
- `POST /api/client/invoices/:id/pay` - Payment processing

### **4.2 Middleware Assessment**

❌ **No client-specific middleware found:**
- No `middleware/clientAuth.js` file
- No role-based access control functions
- No permission matrix service
- Current portal relies on Supabase RLS (Row Level Security only)

---

## SECTION 5: NOTIFICATION SYSTEM AUDIT

### **Current State:**
✅ **Email/SMS Notifications:**
- `notification_queue` table exists
- Used for batch email/SMS sending
- Not client-portal specific

❌ **In-App Notifications:**
- No database table for client notifications
- No notification bell icon in UI
- No notification preferences system
- No "mark as read" functionality

**Gap Analysis:**
- **REQUIRED:** Create `ClientNotification` table
- **REQUIRED:** Build NotificationCenter.jsx component
- **REQUIRED:** Add notification polling/WebSocket
- **REQUIRED:** Create notification preferences UI

---

## SECTION 6: SHIFT CREATION WORKFLOW AUDIT

### **Current Implementation (ClientPortal.jsx lines 243-284)**

✅ **Basic Features:**
- Form with: date, start_time, end_time, role_required, urgency, requirements
- Auto-calculates `duration_hours`
- Sets default `charge_rate` and `pay_rate` from `contract_terms.rates_by_role`
- Inserts into `shifts` table with `status: 'open'`
- Prevents form submission without required fields

❌ **Missing Advanced Features (vs Spec):**
1. **Conflict Detection** - No check for overlapping shifts
2. **Staff Suggestions** - No auto-match recommended staff
3. **One-click Confirm** - No SMS/WhatsApp trigger on creation
4. **Bulk Upload** - No CSV import
5. **AI Parsing** - No email/PDF extraction
6. **Approval Workflow** - No preview before commit
7. **Analytics** - No shift history trends

**Database Gap:**
- Shifts created by clients not flagged with `client_created: true`
- No `rating_status` tracking on shifts

---

## SECTION 7: INTEGRATION POINTS

### **Module 2 - Notifications (Email/SMS)**
- ✅ `notification_queue` table exists
- ❌ No integration when client creates shift
- ❌ No rating \u003c 3 star alerts
- ❌ No invoice generation notifications

### **Module 3 - Scoring Algorithm**
- ❌ No rating submission endpoint
- ❌ No scoring trigger after rating
- ❌ No display of staff scores in portal

### **Module 4 - AI Chat**
- ❌ No chatbot integration
- ❌ No AI shift creation via chat

---

## SECTION 8: BLOCKERS \u0026 RISKS

### **🔴 BLOCKER 1: ClientContact Table Assumption**
**Issue:** Spec assumes `ClientContact` table exists but it doesn't.  
**Impact:** Cannot implement RBAC without table or schema change.  
**Options:**
1. **Add role to profiles** (RECOMMENDED) - Fastest, least disruption
2. **Create ClientContact table** - More complex, matches spec exactly
3. **Hybrid:** Use profiles but rename columns/add fields

**Recommendation:** Use `profiles` table with new columns:
```sql
ALTER TABLE profiles ADD COLUMN client_role TEXT;
ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"shift_assigned": true, "payment_due": true, "compliance_warning": true}'::jsonb;
```

### **🟡 RISK 1: Breaking Existing Client Portal**
**Issue:** Adding RBAC might break current users if not backward compatible.  
**Mitigation:** Use feature flags + default role assignment.

### **🟡 RISK 2: Database Migration Complexity**
**Issue:** Adding 3 new tables + columns requires careful migration.  
**Mitigation:** Use additive migrations only (no column drops).

---

## SECTION 9: FILE STRUCTURE RECOMMENDATIONS

### **New Files to Create:**
```
src/
├── middleware/
│   └── clientAuth.js          # RBAC middleware + permission checks
├── services/
│   ├── rbac.js                # Permission matrix service
│   └── conflictDetection.js   # Shift overlap detection
├── pages/client/
│   ├── ShiftCreation.jsx      # Enhanced shift form (or enhance existing)
│   ├── ShiftRating.jsx        # NEW - Rating form
│   └── NotificationCenter.jsx # NEW - Notification hub
├── components/
│   ├── RatingStars.jsx        # NEW - Star rating component
│   └── NotificationPreferences.jsx # NEW - Settings form
├── hooks/
│   ├── useShiftCreation.js    # Form state management
│   ├── useRatingNotification.js # 2h post-shift trigger
│   └── useNotificationPolling.js # Real-time updates
└── api/client/
    ├── shifts.js              # NEW - Client shift endpoints
    ├── ratings.js             # NEW - Rating endpoints
    └── notifications.js       # NEW - Notification endpoints
```

### **Files to Modify:**
```
src/
├── pages/
│   └── ClientPortal.jsx       # Add RBAC + role-based UI rendering
└── lib/
    └── supabase.js            # Add RPC function calls
```

---

## SECTION 10: RECOMMENDED IMPLEMENTATION PLAN

### **Phase 1: Database Foundation (Priority: HIGH)**
1. ✅ Create `client_ratings` table
2. ✅ Create `client_notifications` table
3. ✅ Add columns to `profiles`: `client_role`, `notification_preferences`
4. ✅ Add columns to `shifts`: `client_created`, `rating_status`
5. ✅ Create database migration file
6. ✅ Apply migration to Supabase

### **Phase 2: RBAC System (Priority: HIGH)**
1. Create `services/rbac.js` with permission matrix
2. Create `middleware/clientAuth.js` for role checking
3. Update `ClientPortal.jsx` to check user role and render conditionally
4. Add role selection to admin user management
5. Backfill existing profiles with default role: 'OPERATIONS_MANAGER'

### **Phase 3: Rating System (Priority: MEDIUM)**
1. Create `components/RatingStars.jsx`
2. Create `pages/client/ShiftRating.jsx`
3. Create `api/client/ratings.js` endpoints
4. Add 2-hour post-shift notification trigger
5. Integrate with Module 3 scoring (if available)

### **Phase 4: Notification Hub (Priority: MEDIUM)**
1. Create `pages/client/NotificationCenter.jsx`
2. Create `components/NotificationPreferences.jsx`
3. Create `api/client/notifications.js` endpoints
4. Add notification polling hook
5. Add bell icon to ClientPortal header

### **Phase 5: Enhanced Shift Creation (Priority: LOW)**
1. Add conflict detection service
2. Add staff suggestion algorithm
3. Update shift creation form with previews
4. Add bulk upload capability (post-MVP)

---

## SECTION 11: FEATURE FLAGS

**Recommended Feature Flags (to add to `agencies.settings` JSONB):**
```json
{
  "features": {
    "client_portal_rbac_enabled": false,
    "client_rating_enabled": false,
    "client_shift_creation_enabled": true,
    "notification_preferences_enabled": false,
    "client_analytics_enabled": false
  }
}
```

**Rollback Strategy:**
- All new features OFF by default
- Existing functionality preserved
- Can enable per-agency for testing
- Zero data loss if disabled

---

## SECTION 12: ESTIMATED IMPLEMENTATION TIME

| Phase | Estimated Time | Complexity |
|-------|----------------|------------|
| Phase 1: Database Foundation | 2 hours | Medium |
| Phase 2: RBAC System | 4 hours | High |
| Phase 3: Rating System | 3 hours | Medium |
| Phase 4: Notification Hub | 3 hours | Medium |
| Phase 5: Enhanced Shift Creation | 2 hours | Low |
| **TOTAL** | **14 hours** | **Medium-High** |

---

## SECTION 13: NEXT STEPS

1. ✅ **Review this report with user** - Confirm approach on ClientContact table
2. ⏳ **Create implementation plan** - Detailed technical design
3. ⏳ **Build database migrations** - Start with Phase 1
4. ⏳ **Implement RBAC** - Phase 2 critical for security
5. ⏳ **Build rating system** - Phase 3 for client feedback
6. ⏳ **Add notification hub** - Phase 4 for UX improvement
7. ⏳ **Testing** - Full RBAC test matrix with 4 mock users

---

**END OF DISCOVERY REPORT**
