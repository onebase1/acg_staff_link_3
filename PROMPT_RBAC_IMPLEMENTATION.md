# PROMPT: Build Industry-Standard RBAC System

## 🎯 TASK DEFINITION

**Build feature:** Role-Based Access Control (RBAC) with granular permissions in **[Security & Access Control]** domain

**Related domains:**
- User Management (user roles, profiles)
- Shift Management (shift assignment permissions)
- Financial Management (invoice/payroll access)
- Client Management (client data access)
- Staff Management (staff data access)
- Admin Workflows (workflow permissions)
- Compliance (audit trail, data access logs)

**Use CODE_DEPENDENCY_MAP.md for dependencies**

---

## 📋 REQUIREMENTS

### **1. Industry Standard RBAC Model**

Implement Microsoft Azure/AWS IAM-style RBAC with:
- **Roles**: Predefined sets of permissions (e.g., Admin, Manager, Staff, Finance, Compliance Officer)
- **Permissions**: Granular actions (e.g., `shifts:create`, `shifts:assign`, `invoices:approve`, `staff:view`)
- **Scopes**: Resource-level access (e.g., `agency:own`, `agency:all`, `client:assigned`, `shift:assigned`)
- **Row-Level Security (RLS)**: Database-level enforcement via Supabase RLS policies

---

### **2. Permission Structure (Microsoft-Style)**

Each permission should follow this pattern:
```
{resource}:{action}:{scope}
```

**Examples:**
- `shifts:create:agency:own` - Create shifts for own agency only
- `shifts:assign:agency:all` - Assign shifts across all agencies (super admin)
- `invoices:approve:client:assigned` - Approve invoices for assigned clients only
- `staff:view:agency:own` - View staff in own agency
- `timesheets:edit:shift:assigned` - Edit timesheets for assigned shifts only

---

### **3. Critical Permissions to Identify**

Analyze the codebase and identify ALL critical permissions, including:

**Shift Management:**
- `shifts:create` - Create new shifts
- `shifts:assign` - Assign staff to shifts
- `shifts:edit` - Edit shift details
- `shifts:cancel` - Cancel shifts
- `shifts:view` - View shifts
- `shifts:marketplace:toggle` - Add/remove from marketplace
- `shifts:bypass_confirmation` - Use admin bypass checkbox

**Financial Management:**
- `invoices:create` - Create invoices
- `invoices:approve` - Approve invoices
- `invoices:view` - View invoices
- `payroll:create` - Create payroll
- `payroll:approve` - Approve payroll
- `financial:lock` - Lock financial records

**Staff Management:**
- `staff:create` - Create staff profiles
- `staff:edit` - Edit staff details
- `staff:view` - View staff profiles
- `staff:delete` - Delete staff (soft delete)
- `staff:compliance:view` - View compliance documents

**Client Management:**
- `clients:create` - Create clients
- `clients:edit` - Edit client details
- `clients:view` - View clients
- `clients:delete` - Delete clients

**Admin Workflows:**
- `workflows:create` - Create workflows
- `workflows:assign` - Assign workflows
- `workflows:complete` - Complete workflows
- `workflows:view` - View workflows

**System Administration:**
- `users:create` - Create users
- `users:edit` - Edit users
- `users:delete` - Delete users
- `roles:assign` - Assign roles to users
- `settings:edit` - Edit system settings
- `audit:view` - View audit logs

---

### **4. Predefined Roles**

Create these standard roles:

**Super Admin:**
- All permissions across all agencies
- Can assign roles
- Can edit system settings

**Agency Admin:**
- All permissions within own agency
- Cannot access other agencies
- Cannot assign super admin role

**Manager:**
- Create/edit/assign shifts
- View staff and clients
- Cannot approve invoices/payroll
- Cannot delete records

**Finance Officer:**
- View all financial data
- Approve invoices/payroll
- Cannot create/edit shifts
- Cannot manage staff

**Compliance Officer:**
- View all compliance documents
- View audit logs
- Cannot edit financial data
- Cannot manage shifts

**Staff:**
- View assigned shifts
- Confirm/decline shifts
- Upload timesheets
- View own payslips
- Cannot access admin functions

---

### **5. Implementation Requirements**

**Database Schema:**
- `roles` table (id, name, description, permissions JSONB)
- `user_roles` table (user_id, role_id, agency_id, scope)
- `permissions` table (id, resource, action, scope, description)
- Update `users` table with `assigned_roles` JSONB

**RLS Policies:**
- Enforce row-level security on ALL tables
- Use `auth.uid()` and role checks
- Example: `shifts` table should check if user has `shifts:view` permission

**Frontend:**
- Permission checking utility: `hasPermission(user, 'shifts:create')`
- Conditional rendering based on permissions
- Disable buttons/actions if user lacks permission

**Backend:**
- Edge Function middleware to check permissions
- Reject API calls if user lacks permission
- Audit log all permission checks

---

### **6. UI/UX Requirements**

**Simple Role Assignment:**
- Admin panel: `/admin/users`
- Dropdown to select role (e.g., "Manager", "Finance Officer")
- Checkbox for scope (e.g., "Own Agency Only", "All Agencies")
- Visual permission matrix showing what each role can do

**Permission Toggle (Microsoft-style):**
- Admin panel: `/admin/roles`
- List all permissions with ON/OFF toggles
- Group by resource (Shifts, Invoices, Staff, etc.)
- Save custom roles

---

### **7. Business Rules to Enforce**

Analyze codebase and identify ALL business rules that should be permission-gated:

**Example from Shift Management:**
- ❌ Block shift assignment if <24 hours → Should check `shifts:assign:urgent` permission
- ❌ Admin bypass confirmation → Should check `shifts:bypass_confirmation` permission
- ❌ Financial lock → Should check `financial:lock` permission

**Identify ALL similar rules across:**
- Shift Management
- Financial Management
- Staff Management
- Client Management
- Compliance
- Admin Workflows

---

### **8. Deliverables**

1. Complete RBAC database schema (migrations)
2. RLS policies for ALL tables
3. Permission checking utilities (frontend + backend)
4. Admin UI for role assignment
5. Admin UI for permission management
6. Documentation of all permissions
7. Migration guide for existing users
8. Test scenarios for permission enforcement

---

## 🚨 CRITICAL ANALYSIS REQUIRED

**Before implementation, analyze codebase and answer:**

1. What are ALL the critical actions that need permission gating?
2. What are ALL the business rules that should be permission-based?
3. What are ALL the tables that need RLS policies?
4. What are ALL the Edge Functions that need permission checks?
5. What are ALL the frontend components that need conditional rendering?

**Use codebase-retrieval and CODE_DEPENDENCY_MAP.md to ensure nothing is missed.**

