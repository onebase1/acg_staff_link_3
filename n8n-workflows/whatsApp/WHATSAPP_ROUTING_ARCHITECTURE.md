# WhatsApp Routing Architecture

## 🚨 Problem: Multiple Workflows, One WhatsApp Number

### Your Current Workflows Using WhatsApp

From your notification migration table:

| Priority | Workflow | Channel | Template | Purpose |
|----------|----------|---------|----------|---------|
| 1 | urgent-shift-broadcast | WhatsApp/SMS | urgentshift | Fill urgent shifts fast |
| 1 | shift-assignment-notification | WhatsApp/SMS | shiftassignment | Assignment clarity |
| 1 | shift-reminder-24h | WhatsApp/SMS | shiftreminder | Low no-shows |
| 1 | timesheet-reminder | WhatsApp/Email | timesheetreminder | Payroll nudge |
| **NEW** | **timesheet-upload-processor** | **WhatsApp** | **N/A** | **Process uploaded timesheets** |

### The Conflict

**n8n Limitation**: 
- ❌ Only **ONE** WhatsApp webhook can be registered with Meta per phone number
- ❌ If multiple workflows have WhatsApp Trigger, only the first one will receive messages
- ❌ Other workflows will never fire

**What Happens If You Activate Multiple WhatsApp Workflows**:
```
Staff sends timesheet image
    ↓
Meta sends webhook to n8n
    ↓
Only "urgent-shift-broadcast" workflow fires (first registered)
    ↓
Timesheet processing workflow never runs ❌
```

---

## ✅ Solution: Master Router Pattern

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ WhatsApp Message Router (MASTER) - ONLY ACTIVE WORKFLOW    │
│ - Single WhatsApp Trigger                                   │
│ - Intelligent routing logic                                 │
│ - Calls sub-workflows via Execute Workflow node             │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Timesheet    │   │ Staff Query  │   │ Shift        │
│ Processing   │   │ Handler      │   │ Confirmation │
│ (Sub)        │   │ (Sub)        │   │ (Sub)        │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Routing Logic

```javascript
// Message Router Code Node
const message = $json.messages[0];
const messageType = message.type; // 'text', 'image', 'document'
const text = message.text?.body?.toLowerCase() || '';

// Route 1: Image Upload = Timesheet
if (messageType === 'image') {
  return { route: 'timesheet_upload' };
}

// Route 2: Query Keywords = Staff Query
const queryKeywords = ['status', 'hours', 'rejected', 'why', 'recorded'];
if (queryKeywords.some(k => text.includes(k))) {
  return { route: 'staff_query' };
}

// Route 3: YES/NO = Shift Confirmation
if (['yes', 'no', 'confirm', 'decline'].includes(text)) {
  return { route: 'shift_confirmation' };
}

// Route 4: Help
if (text.includes('help')) {
  return { route: 'help' };
}

// Default: Unknown
return { route: 'unknown' };
```

### Sub-Workflow Structure

**Before (WRONG)**:
```json
{
  "name": "Timesheet Processing",
  "nodes": [
    {
      "type": "n8n-nodes-base.whatsAppTrigger",  // ❌ Multiple triggers conflict
      "name": "WhatsApp Trigger"
    }
  ]
}
```

**After (CORRECT)**:
```json
{
  "name": "Timesheet Processing (Sub-Workflow)",
  "nodes": [
    {
      "type": "n8n-nodes-base.executeWorkflowTrigger",  // ✅ Called by router
      "name": "Workflow Trigger"
    },
    {
      "type": "n8n-nodes-base.code",
      "name": "Process Timesheet",
      "parameters": {
        "jsCode": "// Access data passed from router\nconst whatsappData = $json.data;\nconst imageId = whatsappData.messages[0].image.id;\n..."
      }
    }
  ]
}
```

---

## 🔄 Outbound vs Inbound Workflows

### Outbound (Notifications) - No Conflict

These workflows **SEND** messages, they don't listen:

✅ **urgent-shift-broadcast** - Sends WhatsApp notifications (no trigger)
✅ **shift-assignment-notification** - Sends WhatsApp notifications (no trigger)
✅ **shift-reminder-24h** - Sends WhatsApp reminders (no trigger)
✅ **timesheet-reminder** - Sends WhatsApp reminders (no trigger)

**Trigger**: Schedule, Database Event, Webhook (not WhatsApp)

**No routing needed** - these can all be active simultaneously.

### Inbound (Receiving Messages) - Needs Router

These workflows **RECEIVE** messages from staff:

⚠️ **timesheet-upload-processor** - Receives timesheet images
⚠️ **staff-query-handler** - Receives questions
⚠️ **shift-confirmation-handler** - Receives YES/NO replies

**Solution**: Route through master workflow.

---

## 📋 Implementation Steps

### Step 1: Create Master Router

1. Import `WhatsApp_Message_Router.json`
2. Configure WhatsApp credentials
3. **Activate ONLY this workflow**
4. Test: Send "help" → Should get help menu

### Step 2: Convert Existing Workflows to Sub-Workflows

**For each inbound workflow**:

1. **Remove WhatsApp Trigger node**
2. **Add Execute Workflow Trigger node**
3. **Update data access**:
   ```javascript
   // Before
   const imageId = $json.messages[0].image.id;
   
   // After
   const whatsappData = $json.data; // Passed from router
   const imageId = whatsappData.messages[0].image.id;
   ```
4. **Deactivate workflow** (router will call it)

### Step 3: Register Sub-Workflows in Router

Update router's Execute Workflow nodes:

```json
{
  "parameters": {
    "workflowId": "={{ $workflow('Timesheet Processing (Sub)').id }}",
    "options": {}
  },
  "name": "Execute: Timesheet Processing"
}
```

### Step 4: Test Each Route

| Test | Send | Expected Route | Expected Response |
|------|------|----------------|-------------------|
| 1 | Image (timesheet) | `timesheet_upload` | "✅ Timesheet received!" |
| 2 | "What shifts recorded?" | `staff_query` | List of shifts |
| 3 | "YES" | `shift_confirmation` | "✅ Shift confirmed" |
| 4 | "help" | `help` | Help menu |
| 5 | "random text" | `unknown` | "Sorry, I didn't understand" |

---

## 🎯 Routing Decision Tree

```
Incoming WhatsApp Message
    ↓
Is it an image?
    ├─ YES → Route to Timesheet Processing
    └─ NO → Continue
         ↓
    Contains query keywords?
    (status, hours, rejected, why, recorded)
         ├─ YES → Route to Staff Query Handler
         └─ NO → Continue
              ↓
         Is it YES/NO/CONFIRM/DECLINE?
              ├─ YES → Route to Shift Confirmation
              └─ NO → Continue
                   ↓
              Contains "help"?
                   ├─ YES → Send Help Menu
                   └─ NO → Send "Unknown Message"
```

---

## 🔧 Advanced: Context-Aware Routing

### Problem: Ambiguous Messages

**Scenario**: Staff sends "YES" - but for what?
- Confirming a shift assignment?
- Confirming timesheet was correct?
- Confirming availability?

### Solution: Conversation State Tracking

```javascript
// Store conversation state in database
const conversationState = await supabase
  .from('whatsapp_conversations')
  .select('last_action, last_action_data')
  .eq('phone_number', from)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// Route based on context
if (text === 'yes') {
  if (conversationState.last_action === 'shift_assignment') {
    return { route: 'confirm_shift_assignment' };
  }
  if (conversationState.last_action === 'timesheet_verification') {
    return { route: 'confirm_timesheet' };
  }
  // Default
  return { route: 'unknown' };
}
```

**Database Schema**:
```sql
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  last_action TEXT, -- 'shift_assignment', 'timesheet_verification', etc.
  last_action_data JSONB, -- { shift_id: '...', date: '...' }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 Monitoring & Debugging

### Router Metrics to Track

```javascript
// Add to router workflow
await supabase.from('whatsapp_routing_log').insert({
  phone_number: from,
  message_type: messageType,
  message_text: text,
  route_decision: route,
  workflow_executed: workflowName,
  execution_time_ms: executionTime,
  success: true
});
```

### Dashboard Queries

**Most Common Routes**:
```sql
SELECT route_decision, COUNT(*) as count
FROM whatsapp_routing_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route_decision
ORDER BY count DESC;
```

**Routing Errors**:
```sql
SELECT *
FROM whatsapp_routing_log
WHERE success = false
ORDER BY created_at DESC
LIMIT 100;
```

---

## ✅ Final Architecture

**Active Workflows**:
1. ✅ **WhatsApp Message Router** (ONLY active WhatsApp trigger)

**Inactive Sub-Workflows** (called by router):
2. ⚪ Timesheet Processing (Sub)
3. ⚪ Staff Query Handler (Sub)
4. ⚪ Shift Confirmation Handler (Sub)

**Active Outbound Workflows** (no conflict):
5. ✅ urgent-shift-broadcast
6. ✅ shift-assignment-notification
7. ✅ shift-reminder-24h
8. ✅ timesheet-reminder

**Result**: 
- ✅ One WhatsApp webhook
- ✅ Intelligent routing
- ✅ All workflows work together
- ✅ No conflicts

