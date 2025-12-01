# n8n MCP Integration Tools

## What are MCP Servers?

MCP (Model Context Protocol) servers allow AI assistants like Claude to directly interact with your n8n instance. This means you can:

- Create/update workflows programmatically
- Trigger workflows from Claude Code
- Debug workflow issues
- Fetch workflow execution data
- Manage credentials and nodes

---

## Available MCP Configurations

### 1. Local n8n Instance (Localhost)

**Use when:** Running n8n locally on your machine

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "node",
      "args": [
        "C:\\Users\\gbase\\AppData\\Roaming\\npm\\node_modules\\n8n-mcp\\dist\\mcp\\index.js"
      ],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTUwOTUxNS0zZTI1LTQ2YzYtODc3OC04OTM5MzBlMTQ4MWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0NTgzMjY0fQ.ZT4ZGdRxfjnmAotFvxAr09oMm-NDAsAz_tB5Wi2cNBI"
      }
    }
  }
}
```

**Connection:**
- API URL: `http://localhost:5678`
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Mode: Local stdio

---

### 2. Remote n8n Instance (DreamPath Cloud)

**Use when:** Accessing your cloud-hosted n8n instance

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://n8n.dreampathai.co.uk/mcp-server/http",
        "--header",
        "authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTUwOTUxNS0zZTI1LTQ2YzYtODc3OC04OTM5MzBlMTQ4MWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImZkMjMwYmMzLTQ1OTAtNDllMy1hMTI2LTRiMDllYTcyMDkxMiIsImlhdCI6MTc2NDU4MjcxOX0.RPpkAxVkSrpLLNklxGRx6olgZnnEXKeVBS6S-m1adMg"
      ]
    }
  }
}
```

**Connection:**
- URL: `https://n8n.dreampathai.co.uk`
- Mode: Streamable HTTP via supergateway
- Auth: Bearer token

---

## Setup Instructions

### For Claude Code (Desktop)

1. **Open Claude Code settings:**
   - Settings → MCP Servers

2. **Add MCP Configuration:**
   - Choose local OR remote config above
   - Paste JSON into MCP servers section
   - Save settings

3. **Restart Claude Code:**
   - Close and reopen app
   - MCP tools should now be available

### For Claude (Web)

**Note:** MCP servers currently only work in Claude Code desktop app, not web version.

---

## What You Can Do with n8n MCP

### Workflow Management

```
"Create a new workflow that sends email notifications when a timesheet is uploaded"

"Update my timesheet workflow to add validation step"

"Show me all active workflows"

"Deactivate workflow ID: abc123"
```

### Debugging

```
"Show me the last 5 executions of my timesheet workflow"

"Why did execution xyz fail?"

"Get error logs from workflow eQl94kDtAn0NQ2Yp"
```

### Data Operations

```
"Trigger the timesheet upload workflow with test data"

"Fetch all timesheet data from last week"

"Get credentials list"
```

### Node Operations

```
"Add a new Google Sheets node to workflow xyz"

"Update the OCR node prompt in my workflow"

"List all available node types"
```

---

## Example Use Cases for Timesheet Workflow

### 1. Auto-Update Workflow from Claude Code

**You say:** "Update my timesheet workflow to fetch valid clients from Supabase instead of hardcoding"

**Claude Code will:**
- Connect to n8n via MCP
- Modify workflow JSON
- Add Supabase node
- Update AI Agent prompt
- Test the changes

### 2. Debug Failed Upload

**You say:** "Why did the last timesheet upload fail?"

**Claude Code will:**
- Fetch execution logs
- Show error details
- Suggest fixes
- Update workflow if needed

### 3. Add Validation Step

**You say:** "Add a node that matches extracted timesheets against expected shifts"

**Claude Code will:**
- Add Google Sheets lookup node
- Add Code node for matching logic
- Connect nodes properly
- Test the flow

### 4. Monitor Uploads

**You say:** "How many timesheets were processed today?"

**Claude Code will:**
- Query workflow executions
- Count successful uploads
- Show summary

---

## API Keys Explained

### Local API Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTUwOTUxNS0zZTI1LTQ2YzYtODc3OC04OTM5MzBlMTQ4MWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0NTgzMjY0fQ.ZT4ZGdRxfjnmAotFvxAr09oMm-NDAsAz_tB5Wi2cNBI
```

**Decoded:**
- User: 79509515-3e25-46c6-8778-893930e1481e
- Audience: public-api
- Issued: 2024-12-01

### Remote API Key (MCP Server)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTUwOTUxNS0zZTI1LTQ2YzYtODc3OC04OTM5MzBlMTQ4MWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImZkMjMwYmMzLTQ1OTAtNDllMy1hMTI2LTRiMDllYTcyMDkxMiIsImlhdCI6MTc2NDU4MjcxOX0.RPpkAxVkSrpLLNklxGRx6olgZnnEXKeVBS6S-m1adMg
```

**Decoded:**
- User: 79509515-3e25-46c6-8778-893930e1481e
- Audience: mcp-server-api
- JTI: fd230bc3-4590-49e3-a126-4b09ea720912
- Issued: 2024-12-01

**Security:** These keys grant full access to your n8n instance. Keep them private!

---

## Available MCP Commands

Once configured, Claude Code can use these commands:

### Workflow Operations
- `list_workflows` - List all workflows
- `get_workflow` - Get workflow details
- `create_workflow` - Create new workflow
- `update_workflow` - Modify existing workflow
- `activate_workflow` - Activate workflow
- `deactivate_workflow` - Deactivate workflow
- `delete_workflow` - Delete workflow

### Execution Operations
- `list_executions` - List workflow executions
- `get_execution` - Get execution details
- `retry_execution` - Retry failed execution

### Node Operations
- `list_node_types` - List available node types
- `get_node_type` - Get node documentation

### Credential Operations
- `list_credentials` - List credential types
- `get_credential` - Get credential details

---

## Integration with Timesheet Workflow

### Current Workflow ID
```
eQl94kDtAn0NQ2Yp
```

### Useful Commands

**Check workflow status:**
```javascript
// Via MCP
get_workflow({ workflowId: "eQl94kDtAn0NQ2Yp" })
```

**Get recent executions:**
```javascript
list_executions({
  workflowId: "eQl94kDtAn0NQ2Yp",
  limit: 10
})
```

**Update workflow:**
```javascript
update_workflow({
  workflowId: "eQl94kDtAn0NQ2Yp",
  workflow: { /* updated JSON */ }
})
```

---

## Testing MCP Connection

### Method 1: Via Claude Code Chat

After configuring MCP, test by asking:

```
"List my n8n workflows"
```

If MCP is working, Claude Code will:
1. Connect to your n8n instance
2. Fetch workflow list
3. Display results

### Method 2: Via n8n API Directly

Test API key manually:

```bash
curl -X GET "http://localhost:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Should return JSON list of workflows.

---

## Troubleshooting

### MCP Server Not Connecting

**Check:**
1. n8n is running (`http://localhost:5678` accessible)
2. API key is valid (not expired)
3. Node.js installed (for local config)
4. npx available (for remote config)
5. Firewall not blocking connection

### API Key Invalid

**Solution:**
1. Go to n8n Settings → API
2. Generate new API key
3. Update MCP config with new key
4. Restart Claude Code

### Localhost Not Found

**If using remote n8n:**
- Use remote config (DreamPath cloud)
- Don't use localhost config

**If using local n8n:**
- Ensure n8n started: `n8n start`
- Check port 5678 is open
- Try `http://127.0.0.1:5678` instead

---

## Advanced: Custom MCP Scripts

You can create custom scripts to automate common tasks:

### Auto-Validate Timesheets

```javascript
// mcp-validate-timesheets.js
const { getWorkflowExecutions } = require('n8n-mcp');

async function validateTodaysTimesheets() {
  const executions = await getWorkflowExecutions({
    workflowId: 'eQl94kDtAn0NQ2Yp',
    status: 'success',
    startedAfter: new Date().setHours(0,0,0,0)
  });

  // Process and validate
  console.log(`Processed ${executions.length} timesheets today`);
}
```

### Backup Workflows Daily

```javascript
// mcp-backup-workflows.js
const { getAllWorkflows } = require('n8n-mcp');
const fs = require('fs');

async function backupWorkflows() {
  const workflows = await getAllWorkflows();

  workflows.forEach(wf => {
    fs.writeFileSync(
      `./backups/workflow-${wf.id}.json`,
      JSON.stringify(wf, null, 2)
    );
  });
}
```

---

## Security Best Practices

### ✅ DO:
- Keep API keys private
- Use environment variables for keys
- Rotate keys regularly
- Use read-only keys when possible
- Monitor API usage

### ❌ DON'T:
- Commit keys to git
- Share keys publicly
- Use same key for dev/prod
- Leave unused keys active
- Grant unnecessary permissions

---

## Next Steps

1. **Choose your config:**
   - Local (if running n8n on PC)
   - Remote (if using cloud n8n)

2. **Add to Claude Code:**
   - Paste config in MCP settings
   - Restart Claude Code

3. **Test connection:**
   - Ask "List my n8n workflows"
   - Verify response

4. **Start automating:**
   - Update workflows via chat
   - Debug issues faster
   - Monitor executions

---

## Resources

- **n8n API Docs:** https://docs.n8n.io/api/
- **MCP Protocol:** https://modelcontextprotocol.io/
- **n8n Community:** https://community.n8n.io/
- **Your n8n Instance:** https://n8n.dreampathai.co.uk

---

## Quick Reference

| Task | Command Example |
|------|-----------------|
| List workflows | "Show my n8n workflows" |
| Update workflow | "Update timesheet workflow to add X" |
| Debug error | "Why did execution ABC fail?" |
| Trigger workflow | "Run timesheet upload workflow" |
| Check status | "Is my timesheet workflow active?" |
| Get executions | "Show last 10 timesheet uploads" |
| Add node | "Add email notification to workflow X" |
| Test workflow | "Test timesheet workflow with sample data" |

---

**Your n8n MCP tools are now documented! Configure in Claude Code to enable AI-powered workflow management.** 🚀
