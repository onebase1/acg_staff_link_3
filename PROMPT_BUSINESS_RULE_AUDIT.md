# PROMPT: Audit & Centralize Business Rules

## 🎯 TASK DEFINITION

**Build feature:** Business Rule Engine & Centralized Rule Management in **[Business Logic & Validation]** domain

**Related domains:**
- Shift Management (assignment rules, timing rules)
- Financial Management (approval rules, lock rules)
- Compliance (certification rules, expiry rules)
- Staff Management (onboarding rules, availability rules)
- Client Management (contract rules, rate rules)
- Admin Workflows (escalation rules, deadline rules)

**Use CODE_DEPENDENCY_MAP.md for dependencies**

---

## 📋 WHAT ARE BUSINESS RULES?

**Business Rules** are constraints, validations, or automated actions that enforce business logic. They are often scattered across the codebase and need centralization.

**Industry Standard Names:**
- **Business Rules** (general term)
- **Business Constraints** (validation rules)
- **Business Policies** (approval/authorization rules)
- **Workflow Rules** (automation/escalation rules)
- **Validation Rules** (data integrity rules)
- **Compliance Rules** (regulatory requirements)

**Examples from ACG StaffLink:**
1. ❌ **Block shift assignment if <24 hours** → Timing Constraint Rule
2. ✅ **Auto-move unconfirmed shifts to marketplace after 24h** → Escalation Workflow Rule
3. ✅ **Financial lock prevents edits** → Immutability Policy Rule
4. ✅ **Staff must confirm shift within 24h** → Confirmation Deadline Rule
5. ✅ **Timesheet must be approved before invoice** → Dependency Rule

---

## 🔍 AUDIT REQUIREMENTS

### **1. Identify ALL Business Rules**

Analyze the codebase and identify ALL business rules across these categories:

**Timing Rules:**
- When can actions be performed? (e.g., "Cannot assign shift <24h before start")
- Deadlines and timeouts (e.g., "Staff must confirm within 24h")
- Escalation thresholds (e.g., "Escalate workflow after 72h")

**Validation Rules:**
- What data is required? (e.g., "Shift must have start_time and end_time")
- What data is allowed? (e.g., "Pay rate must be >= minimum wage")
- What combinations are valid? (e.g., "Cannot assign staff without required certifications")

**Authorization Rules:**
- Who can perform actions? (e.g., "Only finance officer can approve invoices")
- What permissions are required? (e.g., "Must have 'shifts:assign' permission")
- What scopes apply? (e.g., "Can only edit own agency's data")

**Workflow Rules:**
- What happens automatically? (e.g., "Auto-complete shift if timesheet approved")
- What triggers escalations? (e.g., "Send reminder after 12h, escalate after 24h")
- What state transitions are allowed? (e.g., "Cannot go from 'completed' to 'open'")

**Financial Rules:**
- What can be edited? (e.g., "Cannot edit locked financial records")
- What approvals are required? (e.g., "Invoice requires manager approval")
- What calculations apply? (e.g., "Charge rate = pay rate * markup %")

**Compliance Rules:**
- What certifications are required? (e.g., "Healthcare assistant needs DBS check")
- What expiry checks apply? (e.g., "Cannot assign staff with expired certification")
- What audit trails are required? (e.g., "Log all financial changes")

---

### **2. Categorize Rules by Domain**

Group rules by domain:

**Shift Management:**
- [ ] List all timing rules
- [ ] List all assignment rules
- [ ] List all status transition rules
- [ ] List all marketplace rules
- [ ] List all confirmation rules

**Financial Management:**
- [ ] List all approval rules
- [ ] List all lock rules
- [ ] List all calculation rules
- [ ] List all invoice rules
- [ ] List all payroll rules

**Staff Management:**
- [ ] List all onboarding rules
- [ ] List all certification rules
- [ ] List all availability rules
- [ ] List all compliance rules

**Client Management:**
- [ ] List all contract rules
- [ ] List all rate rules
- [ ] List all service level rules

**Admin Workflows:**
- [ ] List all escalation rules
- [ ] List all deadline rules
- [ ] List all assignment rules

---

### **3. Identify Rule Locations**

For EACH rule, document:
- **Where is it enforced?** (Frontend validation? Backend Edge Function? Database trigger? RLS policy?)
- **Is it duplicated?** (Same rule in multiple places?)
- **Is it hardcoded?** (Magic numbers? Hardcoded strings?)
- **Is it configurable?** (Can admin change it without code changes?)

**Example:**
```
Rule: "Cannot assign shift <24 hours before start"
Location: src/pages/Shifts.jsx (Lines 435-442)
Duplicated: No
Hardcoded: Yes (24 hours is hardcoded)
Configurable: No
```

---

### **4. Centralization Strategy**

**Industry Standard Approach:**

Create a **Business Rules Engine** with:

**Database Schema:**
```sql
CREATE TABLE business_rules (
  id UUID PRIMARY KEY,
  rule_name TEXT UNIQUE,
  rule_type TEXT, -- 'timing', 'validation', 'authorization', 'workflow', 'financial', 'compliance'
  domain TEXT, -- 'shifts', 'invoices', 'staff', 'clients', 'workflows'
  description TEXT,
  rule_config JSONB, -- { "threshold_hours": 24, "action": "block_assignment" }
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Rule Execution Engine:**
```typescript
// Centralized rule checker
async function checkRule(ruleName: string, context: any): Promise<boolean> {
  const rule = await getRule(ruleName);
  if (!rule.enabled) return true;
  
  return evaluateRule(rule, context);
}

// Usage
if (!await checkRule('shift_assignment_24h_block', { shift, currentTime })) {
  throw new Error('Cannot assign shift within 24 hours');
}
```

**Admin UI:**
- `/admin/business-rules`
- List all rules with ON/OFF toggles
- Edit rule configuration (e.g., change 24h to 48h)
- View rule execution history

---

### **5. Deliverables**

1. **Complete Business Rule Audit Document**
   - List ALL rules across ALL domains
   - Categorize by type (timing, validation, etc.)
   - Document current locations
   - Identify duplications and hardcoding

2. **Business Rules Database Schema**
   - Migration to create `business_rules` table
   - Seed data with all identified rules

3. **Rule Execution Engine**
   - Centralized rule checker utility
   - Frontend + Backend integration
   - Audit logging for rule checks

4. **Admin UI for Rule Management**
   - List all rules
   - Enable/disable rules
   - Edit rule configuration
   - View rule execution history

5. **Migration Plan**
   - How to move from hardcoded rules to centralized engine
   - Backward compatibility strategy
   - Testing plan

---

## 🚨 CRITICAL ANALYSIS REQUIRED

**Before implementation, analyze codebase and answer:**

1. What are ALL the business rules currently in the codebase?
2. Where are they located? (Frontend? Backend? Database?)
3. Which rules are duplicated across multiple files?
4. Which rules are hardcoded and should be configurable?
5. Which rules are missing and should exist?
6. How do other SaaS companies (Gusto, BambooHR, Deputy) handle this?

**Use codebase-retrieval and CODE_DEPENDENCY_MAP.md to ensure complete coverage.**

