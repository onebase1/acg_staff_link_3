# MODULE 1: CLIENT PORTAL - OPTIMIZATION & EXPANSION

## EXECUTIVE BRIEF
**Current State:** Basic client portal exists for viewing shifts and managing their account  
**Target State:** Enterprise-grade client portal with RBAC, real-time analytics, intelligent operations control  
**Business Impact:** Clients rate experience 9+/10 = agency reputation growth = word-of-mouth adoption  
**Fallback Strategy:** Feature flags for each enhancement; can disable without data loss  

---

## SECTION 1: DISCOVERY & CODE REVIEW REQUIREMENTS

### 1.1 Baseline Assessment
**Agent Task:** Review existing client portal implementation

**Files to Analyze:**
- `pages/client/` - All client-facing pages
- `components/client/` - Client UI components  
- `services/clientService.js` - API integration layer
- `middleware/clientAuth.js` - Authentication & RBAC rules
- `types/client.ts` - Client data models
- Database schema: `Client`, `ClientContact`, `ClientCredential`

**Key Questions to Answer:**
1. What RBAC roles exist? (Admin contact, Finance contact, Ops contact, View-only contact?)
2. How are permissions currently enforced? (Query-level? UI-level? API middleware?)
3. Which client endpoints are already available vs need building?
4. What's the current notification system? (In-app only? Email integration?)
5. Are there any rate-limiting considerations for multi-user portals?

**Output Format:** Create a `DISCOVERY_REPORT.md` in agent workspace listing:
- Current RBAC implementation
- Missing RBAC role types
- Existing vs missing features (shift creation, ratings, notifications, analytics)
- Database schema gaps (what new columns/tables needed)
- API endpoints that need creation/modification

---

## SECTION 2: CORE REQUIREMENTS - CLIENT PORTAL V2

### 2.1 Role-Based Access Control (RBAC) System

**Roles to Implement:**
```
┌─────────────────────────────────────────────────────────┐
│ OPERATIONS_MANAGER                                      │
├─────────────────────────────────────────────────────────┤
│ • Create urgent shifts                                  │
│ • View all shifts, staff performance                    │
│ • Create, edit, cancel shifts (own created only)        │
│ • Rate staff immediately after shift ends               │
│ • Access dashboard with KPIs                            │
│ • Can see compliance warnings                           │
│ • Cannot: Invoice payment, change rates                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FINANCE_MANAGER                                         │
├─────────────────────────────────────────────────────────┤
│ • View invoices, payment status                         │
│ • Pay invoices online                                   │
│ • Export financial reports (6 months)                   │
│ • View contracts/rates by staff                         │
│ • Cannot: Create shifts, rate staff, hire new staff     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FACILITY_COORDINATOR                                    │
├─────────────────────────────────────────────────────────┤
│ • View their assigned shifts only                       │
│ • Rate staff who worked their shifts                    │
│ • Submit timesheets for verification                    │
│ • Access basic FAQ section                              │
│ • Cannot: Create new shifts, see other facilities       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ VIEW_ONLY_CONTACT                                       │
├─────────────────────────────────────────────────────────┤
│ • View dashboard, shifts, performance metrics           │
│ • Export reports (PDF)                                  │
│ • Cannot: Modify anything, rate staff, create shifts    │
└─────────────────────────────────────────────────────────┘
```

**Implementation Checklist:**
- [ ] Add `ClientContact.role` field (enum: above roles)
- [ ] Create `rbac.js` service with permission matrix
- [ ] Add route middleware: `requireRole('OPERATIONS_MANAGER')`
- [ ] API responses filter by role (don't return sensitive data)
- [ ] UI components conditionally render based on role
- [ ] Audit log: track every permission check (for security review)
- [ ] Database migration script (populate existing contacts with role: 'OPERATIONS_MANAGER')

**Agent Instruction:** Query files to determine:
- Is RBAC already implemented? If yes, which roles exist?
- Are there API middleware functions checking roles?
- How are UI components currently restricted? (hardcoded checks or RBAC service?)
- Database schema: where is role data stored?

---

### 2.2 Shift Creation & Management

**Capability Requirements:**
1. **Quick Shift Creation** (MVP)
   - Form: Date, Time, Duration, Role, Rate, Specialist Notes
   - Validation: No overlaps with existing staff coverage
   - Auto-match: Suggest available staff with rating score
   - One-click confirm: Send WhatsApp/SMS notification immediately
   - Contingency: Allow over-booking if marked "URGENT"

2. **Bulk Shift Upload** (Post-MVP)
   - CSV upload: Date, Time, Role, Count, Rate
   - AI parsing: Extract from email/PDF (future Module 2)
   - Conflict detection: Alert if shifts overlap existing coverage
   - Bulk assign: Match all shifts to top-scoring staff
   - Approval workflow: Preview before final commit

3. **Shift History & Analytics**
   - Filter: By date range, role, staff, status
   - Export: CSV/PDF with staff performance ratings
   - Trends: "Which roles have 100% fill rate? Which struggle?"
   - Cost analysis: Total spend by role/date

**Files to Create/Modify:**
- `pages/client/ShiftCreation.jsx` - Form component
- `api/client/shifts.js` - POST /client/shifts endpoint
- `hooks/useShiftCreation.js` - Form state management
- `services/conflictDetection.js` - Reuse from Module 3
- `components/ShiftMatchingWidget.jsx` - Display suggested staff

**Agent Instructions:**
- Query existing shift creation logic (if any) to avoid duplication
- Check if conflict detection already exists (likely from admin dashboard)
- Determine: Can clients currently create shifts? Via what interface?
- Identify: Which notification system to use (email/SMS/WhatsApp)

---

### 2.3 Staff Rating & Performance Feedback

**Rating System Design:**

```
RATING MATRIX:
┌──────────────────────────────────────────────────────────┐
│ 1. PROFESSIONALISM (Appearance, Punctuality, Attitude)  │
│    ☆☆☆☆☆ (1-5 stars)                                   │
│                                                          │
│ 2. COMPETENCE (Skills, Task Completion, Quality)        │
│    ☆☆☆☆☆ (1-5 stars)                                   │
│                                                          │
│ 3. COMMUNICATION (Responsiveness, Problem-solving)      │
│    ☆☆☆☆☆ (1-5 stars)                                   │
│                                                          │
│ 4. RELIABILITY (No-shows, punctuality, consistency)     │
│    ☆☆☆☆☆ (1-5 stars)                                   │
│                                                          │
│ 5. COMMENTS (Optional free-form feedback)               │
│    [Text field: max 500 chars]                          │
│                                                          │
│ OVERALL RATING: Auto-calculated avg of above            │
│ Example: (5+5+4+5)/4 = 4.75 stars                       │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- **Timing:** Rating prompt appears 2 hours after shift ends
- **Workflow:** Client rates → stored in database → triggers Module 3 scoring algorithm
- **Anonymity:** Clients can choose to show/hide name (optional)
- **Disputes:** If rating < 3 stars, auto-create workflow for admin review
- **Analytics:** Client portal shows "Top Performers This Month" badge
- **Incentive:** High-rated staff get priority for future bookings

**Database Requirements:**
- New table: `ClientRating`
  - Fields: client_id, staff_id, shift_id, professionalism_rating, competence_rating, communication_rating, reliability_rating, comments, created_at, anonymized
- New column: `Staff.client_ratings_average` (updated by Module 3)
- New column: `Shift.rating_status` (values: awaiting_rating, rated, disputed)

**Files to Create:**
- `pages/client/ShiftRating.jsx` - Rating form component
- `api/client/ratings.js` - POST /client/ratings endpoint
- `components/RatingStars.jsx` - Reusable star component
- `hooks/useRatingNotification.js` - Trigger 2h post-shift

**Agent Instructions:**
- Check if shift entity has timestamp fields (start_time, end_time needed)
- Determine: How to identify when shift ends? (via status change or scheduled time?)
- Query: Is there already a "feedback" or "review" system? Reuse or replace?
- Identify: Post-shift notification logic (to integrate rating prompt)

---

### 2.4 Real-Time Notifications Hub

**Notification Types:**
1. **Shift-Related**
   - ✓ Shift assigned (you have a new booking)
   - ✓ Shift confirmed (staff accepted assignment)
   - ✓ Shift reminder (2 hours before start)
   - ✓ Staff arrived (GPS + time clock notification)
   - ✓ Shift complete (rating prompt)
   - ✓ Urgent shift cancelled (staff no-showed)

2. **Payment-Related**
   - ✓ Invoice generated (ready for payment)
   - ✓ Payment overdue (7 days: gentle reminder)
   - ✓ Payment overdue (14 days: formal notice)
   - ✓ Payment received (confirmation)

3. **Compliance-Related**
   - ✓ Staff document expiring soon (14 days warning)
   - ✓ Staff document expired (urgent action required)
   - ✓ Compliance audit scheduled (info)

4. **System-Related**
   - ✓ New features available (product updates)
   - ✓ Maintenance window (system downtime notice)

**Portal Features:**
- **Notification Center:** Badge with unread count
- **Notification Preferences:** Client can customize which types they receive
- **Channels:** In-app bell icon → Drawer list → Email/SMS if opted in
- **History:** Last 30 days of notifications
- **Search:** Filter by type, date range
- **Mark as Read:** Bulk actions supported

**Files to Create:**
- `pages/client/NotificationCenter.jsx` - Main notification hub
- `components/NotificationPreferences.jsx` - Settings form
- `api/client/notifications.js` - GET notifications, PATCH preferences
- `hooks/useNotificationPolling.js` - Real-time updates via polling/WebSocket

**Agent Instructions:**
- Check existing notification logic (Module 2 will handle email/SMS sending)
- Query: Is there WebSocket infrastructure? (for real-time updates)
- Determine: Are push notifications desired? (web push API vs polling)
- Identify: Where notification preferences are stored? (User settings? Client settings?)

---

## SECTION 3: ADVANCED FEATURES (Post-MVP)

### 3.1 Client Dashboard Analytics
**Components:**
- Weekly shift volume trend
- Fill rate by role (%)
- Cost breakdown (total spent, avg rate)
- Top performer rankings (by rating)
- Comparison: "vs last month"
- Export: Monthly report as PDF

### 3.2 Integration with Module 3 Scoring
**Sync Requirements:**
- After rating submitted → Trigger Module 3 staff scoring update
- Display in client portal: "This staff member scored 92/100 overall"
- Show rating contribution: "Your feedback contributed +5 points"

### 3.3 Smart Shift Recommendations
**Logic:**
- ML-style scoring: "Based on your past bookings, we recommend these staff for your next shift"
- Show: Name, rating, specialty match, availability
- One-click: "Book this staff for [date/time]"

### 3.4 Payment Portal Integration
**Features:**
- View invoices (pending, paid, overdue)
- Online payment: Stripe/PayPal integration
- Set up auto-pay: Monthly recurring payment
- Download receipts: PDF format

---

## SECTION 4: DATABASE SCHEMA CHANGES

**New/Modified Tables:**

```sql
-- ADD to ClientContact
ALTER TABLE ClientContact ADD COLUMN role ENUM('OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'FACILITY_COORDINATOR', 'VIEW_ONLY_CONTACT') DEFAULT 'OPERATIONS_MANAGER';
ALTER TABLE ClientContact ADD COLUMN notification_preferences JSON DEFAULT '{"shift_assigned": true, "payment_due": true, "compliance_warning": true}';

-- NEW: ClientRating
CREATE TABLE ClientRating (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  staff_id UUID REFERENCES Staff(id),
  shift_id UUID REFERENCES Shift(id),
  professionalism_rating INT (1-5),
  competence_rating INT (1-5),
  communication_rating INT (1-5),
  reliability_rating INT (1-5),
  overall_rating DECIMAL(3,2),
  comments TEXT,
  anonymized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- NEW: ClientNotification
CREATE TABLE ClientNotification (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  type ENUM('shift_assigned', 'payment_due', 'compliance_warning', 'system_update'),
  title STRING,
  message TEXT,
  related_entity_id UUID,
  related_entity_type ENUM('shift', 'invoice', 'compliance'),
  read_at TIMESTAMP,
  channel ENUM('in_app', 'email', 'sms', 'whatsapp'),
  created_at TIMESTAMP
);

-- Modify Shift entity
ALTER TABLE Shift ADD COLUMN client_created BOOLEAN DEFAULT FALSE;
ALTER TABLE Shift ADD COLUMN rating_status ENUM('awaiting_rating', 'rated', 'disputed') DEFAULT 'awaiting_rating';
```

---

## SECTION 5: API ENDPOINTS TO BUILD/MODIFY

**Client Portal Endpoints (all require `clientAuth` middleware + role check):**

```
POST   /api/client/shifts
       Payload: {date, time, duration, role_id, rate, notes, urgent}
       Returns: {shift_id, suggested_staff[], assignment_status}
       Auth: Require OPERATIONS_MANAGER role

GET    /api/client/shifts?date_from=X&date_to=Y&status=Z&role=W
       Returns: Paginated shift list with staff info
       Auth: Any role (filtered by role)

GET    /api/client/shifts/:id
       Returns: Shift detail + assigned staff + rating status
       Auth: Any role

DELETE /api/client/shifts/:id
       Auth: OPERATIONS_MANAGER role only

POST   /api/client/ratings
       Payload: {shift_id, professionalism, competence, communication, reliability, comments, anonymized}
       Returns: {rating_id, status: 'submitted'}
       Auth: Any role

GET    /api/client/ratings/:shift_id
       Returns: Rating if exists, or empty object
       Auth: OPERATIONS_MANAGER role

PATCH  /api/client/notification-preferences
       Payload: {shift_assigned: bool, payment_due: bool, compliance_warning: bool}
       Auth: Any role

GET    /api/client/notifications?limit=20&offset=0
       Returns: Paginated notifications
       Auth: Any role

PATCH  /api/client/notifications/:id/read
       Auth: Any role

GET    /api/client/dashboard
       Returns: {weekly_volume, fill_rate_by_role, cost_breakdown, top_performers, monthly_comparison}
       Auth: VIEW_ONLY_CONTACT and above

GET    /api/client/invoices
       Returns: Invoice list with payment status
       Auth: FINANCE_MANAGER role

POST   /api/client/invoices/:id/pay
       Payload: {payment_method: 'stripe'|'paypal', amount}
       Auth: FINANCE_MANAGER role
```

---

## SECTION 6: INTEGRATION WITH OTHER MODULES

**Module 2 - Client Notifications (Email/SMS):**
- When shift created → POST to Module 2 email engine (send confirmation to client)
- When rating submitted → POST to Module 2 email engine (notify if rating < 3)
- When invoice generated → POST to Module 2 email engine

**Module 3 - Scoring Algorithm:**
- When rating submitted → POST to Module 3 scoring engine
- Response: Updated staff score; confirm via webhook
- Display in portal: "Staff rating updated based on feedback"

**Module 4 - AI Chat:**
- Client can create urgent shift via chat instead of portal form
- Chat flows to shift creation same as portal (same POST endpoint)

---

## SECTION 7: TESTING CHECKLIST

**Before Merge:**
- [ ] RBAC: Each role can only access permitted endpoints (test with 4 mock user accounts)
- [ ] Shift Creation: Form validates; conflict detection works; staff get notified
- [ ] Ratings: 2h post-shift notification appears; rating saved correctly; < 3 stars triggers workflow
- [ ] Notifications: Preferences work; notification hub displays correctly; can mark read
- [ ] Database: New tables created; migrations reversible
- [ ] API: All endpoints return correct response codes (200, 401, 403, 400)
- [ ] Performance: Dashboard loads < 2 seconds even with 1000 shifts
- [ ] Mobile: All features work on iPhone/Android

---

## SECTION 8: ROLLBACK STRATEGY

**Feature Flags:**
- `features.client_portal_rbac_enabled` - If false, all roles get OPERATIONS_MANAGER perms
- `features.client_rating_enabled` - If false, rating UI hidden
- `features.client_shift_creation_enabled` - If false, form disabled
- `features.notification_preferences_enabled` - If false, all notifications sent

**Database Safety:**
- All new columns added with DEFAULT values
- Old queries still work (no required changes)
- No data loss: only additions, no modifications
- Migration script auto-rollbacks if error encountered

---

## SECTION 9: SUCCESS METRICS

**Client Experience:**
- Rating portal form completion rate > 60%
- Avg rating given: 4.2+ / 5
- NPS improvement: +15 points post-launch
- Portal login frequency: +40% week-over-week

**Operational:**
- Time to create shift: < 2 minutes
- Shift fill rate: +5% improvement
- Rating submission triggers Module 3 scoring 100% of time
- Zero permission bypass attempts (security audit)

**Business:**
- Client retention: +10%
- Churn reduction: Rated customers 3x less likely to churn
- Word-of-mouth: Referral rate increases

---

## SECTION 10: AGENT EXECUTION CHECKLIST

**Phase 1: Discovery (2 hours)**
- [ ] Run discovery queries on existing client portal code
- [ ] Map RBAC implementation (or lack thereof)
- [ ] Identify database schema gaps
- [ ] Create DISCOVERY_REPORT.md
- [ ] Flag any blocking issues

**Phase 2: Implementation (6-8 hours)**
- [ ] Add RBAC system + middleware
- [ ] Build shift creation form + API endpoint
- [ ] Implement rating system + database
- [ ] Create notification hub + preferences
- [ ] Add API endpoints (all listed above)

**Phase 3: Testing (2 hours)**
- [ ] Run full test suite
- [ ] Verify all permissions work
- [ ] Test notifications + Module 2 integration
- [ ] Validate database changes

**Phase 4: Documentation (1 hour)**
- [ ] Update API docs
- [ ] Create IMPLEMENTATION_NOTES.md
- [ ] List any manual setup needed

**Total Estimated Time: 11-13 hours**

---

## QUICK REFERENCE: FILES TOUCHED

**New Files:**
- `/api/client/shifts.js`
- `/api/client/ratings.js`
- `/api/client/notifications.js`
- `/pages/client/ShiftCreation.jsx`
- `/pages/client/ShiftRating.jsx`
- `/pages/client/NotificationCenter.jsx`
- `/components/RatingStars.jsx`
- `/hooks/useShiftCreation.js`
- `/hooks/useRatingNotification.js`
- `/hooks/useNotificationPolling.js`

**Modified Files:**
- `middleware/clientAuth.js` (add RBAC checks)
- `types/client.ts` (add new enums)
- Database migration files
- `.env.example` (add feature flags)

---

**END OF MODULE 1 BRIEF**