import fs from 'fs';
import path from 'path';

const workflowPath = process.argv[2];
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// The actual workflow data is in workflow.data
const data = workflow.data || workflow;
const nodes = data.nodes;
const connections = data.connections;

// 1. Update "Text Or Voice" node
const textOrVoiceNode = nodes.find(n => n.name === "Text Or Voice");
if (textOrVoiceNode) {
    textOrVoiceNode.parameters.rules.values[0].conditions.conditions[0].leftValue = "={{ $json.messages[0].type == \"text\" ? $json.messages[0].text.body : undefined }}";
    textOrVoiceNode.parameters.rules.values[1].conditions.conditions[0].leftValue = "={{ $json.messages[0].type == \"audio\" ? $json.messages[0].audio.id : undefined }}";
}

// 2. Add "Fetch Agency Name" node if it doesn't exist
if (!nodes.find(n => n.name === "Fetch Agency Name")) {
    nodes.push({
        "parameters": {
            "operation": "get",
            "tableId": "=agencies",
            "filters": {
                "conditions": [
                    {
                        "keyName": "id",
                        "keyValue": "={{ $json.agency_id }}"
                    }
                ]
            }
        },
        "id": "fetch-agency-lookup",
        "name": "Fetch Agency Name",
        "type": "n8n-nodes-base.supabase",
        "position": [432, 8],
        "typeVersion": 1,
        "credentials": {
            "supabaseApi": {
                "id": "Vl1ZMO9tnqpJkJDe",
                "name": "ACG-Supabase"
            }
        }
    });
}

// 3. Update "Format Staff Data" node
const formatStaffNode = nodes.find(n => n.name === "Format Staff Data");
if (formatStaffNode) {
    formatStaffNode.parameters.jsCode = `// 1. Get the current staff record directly from input (standard for v1+ performance)
const staff = $input.item.json;

// 2. Safety check: Exit early if staff missing
if (!staff || !staff.id) {
  return { 
    staff_id: null, 
    first_name: "Staff Member", 
    error: "No record found" 
  };
}

// 3. Proper Availability Formatting for YOUR data structure
// Converts { friday: ['day'], monday: [] } -> "friday"
const availableDays = Object.keys(staff.availability || {})
  .filter(day => Array.isArray(staff.availability[day]) && staff.availability[day].length > 0)
  .join(', ');

// 4. Return ONLY essential fields to the AI (Prevents hanging on giant JSON objects)
return {
  staff_id: staff.id,
  first_name: staff.first_name,
  last_name: staff.last_name,
  staff_name: \`\${staff.first_name} \${staff.last_name}\`,
  agency: $("Fetch Agency Name").item.json.name || "Unknown Agency", 
  agency_id: staff.agency_id,
  employment_type: staff.employment_type,
  rating: staff.rating || '5.0',
  availability_days: availableDays || 'None set'
};`;
}

// 4. Update Connections
// Replace Get a row -> Format Staff Data with Get a row -> Fetch Agency Name -> Format Staff Data
if (connections["Get a row"]) {
    connections["Get a row"].main[0] = connections["Get a row"].main[0].map(conn => {
        if (conn.node === "Format Staff Data") {
            return { node: "Fetch Agency Name", type: "main", index: 0 };
        }
        return conn;
    });
}

// Add connection from Fetch Agency Name to Format Staff Data
connections["Fetch Agency Name"] = {
    main: [
        [
            {
                "node": "Format Staff Data",
                "type": "main",
                "index": 0
            }
        ]
    ]
};

console.log(JSON.stringify({ nodes, connections, name: data.name, settings: data.settings }, null, 2));
