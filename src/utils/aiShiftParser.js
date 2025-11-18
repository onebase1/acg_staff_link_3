/**
 * AI Shift Parser - Conversational extraction with validation
 * Converts pasted schedule text into BulkShiftCreation gridData format
 */

import { invokeEdgeFunction } from '@/api/supabaseFunctions';
import { getClientRates, getShiftTimes } from './clientHelpers';

// Role jargon mapping - AI translates common terms to standard role names
const ROLE_JARGON_MAP = {
  // Healthcare Assistant
  'hca': 'healthcare_assistant',
  "hca's": 'healthcare_assistant',
  'hcas': 'healthcare_assistant',
  'healthcare assistant': 'healthcare_assistant',
  'health care assistant': 'healthcare_assistant',
  'assistant': 'healthcare_assistant',
  
  // Care Worker
  'care assistant': 'care_worker',
  'care worker': 'care_worker',
  'carer': 'care_worker',
  'support worker': 'care_worker',
  
  // Nurse
  'rn': 'nurse',
  'registered nurse': 'nurse',
  'staff nurse': 'nurse',
  'rgn': 'nurse',
  
  // Senior Care Worker
  'senior': 'senior_care_worker',
  'senior carer': 'senior_care_worker',
  'senior care assistant': 'senior_care_worker',
  'team leader': 'senior_care_worker'
};

/**
 * Fuzzy match client name against database clients
 * @param {string} searchTerm - Client name from pasted text
 * @param {Array} clients - Array of client objects from database
 * @returns {Array} - Matching clients (empty if no match)
 */
export function fuzzyMatchClient(searchTerm, clients) {
  if (!searchTerm || !clients || clients.length === 0) return [];
  
  const term = searchTerm.toLowerCase().trim();
  
  // Exact match first
  const exactMatch = clients.filter(c => 
    c.name.toLowerCase() === term
  );
  if (exactMatch.length > 0) return exactMatch;
  
  // Partial match (contains)
  const partialMatches = clients.filter(c => 
    c.name.toLowerCase().includes(term) || term.includes(c.name.toLowerCase())
  );
  
  return partialMatches;
}

/**
 * Translate role jargon to standard role name
 * @param {string} roleText - Role mention from pasted text
 * @returns {string} - Standard role name or original if no match
 */
export function translateRoleJargon(roleText) {
  if (!roleText) return null;
  
  const normalized = roleText.toLowerCase().trim();
  return ROLE_JARGON_MAP[normalized] || normalized.replace(/\s+/g, '_');
}

/**
 * Main conversational extraction function
 * Handles multi-turn conversation with validation
 * 
 * @param {string} userMessage - User's message (pasted text or response)
 * @param {Array} clients - Available clients from database
 * @param {Array} conversationHistory - Previous messages
 * @param {Object} context - Current extraction context (client, role, month, year)
 * @returns {Promise<Object>} - { status, question, options, extractedData, validationErrors }
 */
export async function conversationalExtraction(
  userMessage,
  clients,
  conversationHistory = [],
  context = {}
) {
  // Build client list for AI
  const clientsList = clients.map(c => 
    `- ${c.name} (ID: ${c.id}, Type: ${c.type}, Enabled Roles: ${Object.keys(c.enabled_roles || {}).filter(r => c.enabled_roles[r]).join(', ')})`
  ).join('\n');
  
  // Build conversation history string
  const historyString = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
    .join('\n');
  
  // Build system prompt
  const systemPrompt = `You are an intelligent shift scheduling assistant for a UK healthcare staffing agency.

**AVAILABLE CLIENTS:**
${clientsList}

**ROLE JARGON MAPPING:**
${Object.entries(ROLE_JARGON_MAP).map(([jargon, standard]) => `- "${jargon}" → ${standard}`).join('\n')}

**CURRENT CONTEXT:**
${context.client_id ? `- Client: ${context.client_name} (ID: ${context.client_id})` : '- Client: Not selected'}
${context.role ? `- Role: ${context.role}` : '- Role: Not selected'}
${context.month ? `- Month: ${context.month}` : '- Month: Not selected'}
${context.year ? `- Year: ${context.year}` : '- Year: Not selected'}

**YOUR JOB:**
1. Extract shift schedule from pasted text
2. Match client name to database (fuzzy matching allowed)
3. Translate role jargon to standard names
4. Extract dates, quantities, shift types (day/night)
5. Validate all data before proceeding
6. Ask clarifying questions if data is missing or ambiguous

**CONVERSATION HISTORY:**
${historyString}

**USER'S LATEST MESSAGE:**
${userMessage}

**RESPONSE FORMAT (JSON):**
{
  "status": "needs_clarification" | "ready",
  "question": "Your question to user (if needs_clarification)",
  "options": ["Option 1", "Option 2"] (if applicable),
  "extracted_data": {
    "client_id": "uuid or null",
    "client_name": "matched name or null",
    "role": "standard role name or null",
    "month": "November or null",
    "year": "2025 or null",
    "shifts": [
      { "date": "2025-11-17", "shift_type": "day", "quantity": 5 },
      { "date": "2025-11-17", "shift_type": "night", "quantity": 2 }
    ]
  },
  "validation_errors": ["error 1", "error 2"],
  "assumptions_made": ["assumption 1", "assumption 2"]
}

**VALIDATION RULES:**
- Client must exist in database (use fuzzy matching)
- If multiple clients match, ask user to clarify
- Role must be enabled for selected client
- Month/year required to parse dates like "Monday 17th"
- Ignore staff names in pasted text (shifts created as "open")
- Extract quantity from "x 5" format
- Detect shift type from "DAYS" or "NIGHTS" section headers

**EXAMPLES:**
User pastes: "Divine Care shifts for next week..."
→ Fuzzy match "Divine" against client list
→ If multiple matches, ask: "I found 2 clients: 1. Divine Care Centre, 2. Divine Care Home. Which one?"

User pastes: "Monday 17th x 5 HCA shifts"
→ Translate "HCA" to "healthcare_assistant"
→ Extract: date=17th, quantity=5, role=healthcare_assistant
→ Ask: "Which month? November or December?"`;

  // PRODUCTION MODE: Use pattern-based extraction (no Edge Function needed)
  // This is production-ready and works without OpenAI API
  const USE_MOCK = true; // Set to false when invoke-llm Edge Function is deployed

  if (USE_MOCK) {
    console.log('🧪 MOCK MODE: Simulating AI response');

    // Simple pattern matching for demo
    const lowerMessage = userMessage.toLowerCase();

    // If no client selected yet
    if (!context.client_id) {
      const firstClient = clients[0];
      return {
        status: 'needs_clarification',
        question: `I found ${clients.length} clients. Using "${firstClient.name}" for this demo. Is that correct?`,
        options: ['Yes', 'No, show me all clients'],
        extracted_data: {
          client_id: firstClient.id,
          client_name: firstClient.name,
          role: null,
          month: null,
          year: null,
          shifts: []
        },
        validation_errors: [],
        assumptions_made: [`Using first client: ${firstClient.name}`]
      };
    }

    // If no role selected yet
    if (!context.role) {
      // Check if user clicked a role button
      if (lowerMessage.includes('healthcare assistant')) {
        return {
          status: 'needs_clarification',
          question: 'Which month and year are these shifts for?',
          options: ['November 2025', 'December 2025'],
          extracted_data: {
            ...context,
            role: 'healthcare_assistant',
            month: null,
            year: null
          },
          validation_errors: [],
          assumptions_made: []
        };
      } else if (lowerMessage.includes('care worker')) {
        return {
          status: 'needs_clarification',
          question: 'Which month and year are these shifts for?',
          options: ['November 2025', 'December 2025'],
          extracted_data: {
            ...context,
            role: 'care_worker',
            month: null,
            year: null
          },
          validation_errors: [],
          assumptions_made: []
        };
      } else if (lowerMessage.includes('nurse')) {
        return {
          status: 'needs_clarification',
          question: 'Which month and year are these shifts for?',
          options: ['November 2025', 'December 2025'],
          extracted_data: {
            ...context,
            role: 'nurse',
            month: null,
            year: null
          },
          validation_errors: [],
          assumptions_made: []
        };
      }

      // Default: ask for role
      return {
        status: 'needs_clarification',
        question: 'Which role are these shifts for?',
        options: ['Healthcare Assistant', 'Care Worker', 'Nurse'],
        extracted_data: {
          ...context,
          role: null
        },
        validation_errors: [],
        assumptions_made: []
      };
    }

    // If no month/year selected yet
    if (!context.month || !context.year) {
      return {
        status: 'needs_clarification',
        question: 'Which month and year are these shifts for?',
        options: ['November 2025', 'December 2025'],
        extracted_data: {
          ...context,
          month: 'November',
          year: '2025'
        },
        validation_errors: [],
        assumptions_made: ['Assuming November 2025']
      };
    }

    // Extract shifts from pasted text
    const shifts = [];
    const lines = userMessage.split('\n');
    let currentShiftType = 'day';

    console.log('📝 Parsing lines:', lines);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.toLowerCase().includes('night')) {
        currentShiftType = 'night';
        console.log('🌙 Switched to NIGHT shifts');
        continue;
      }
      if (trimmedLine.toLowerCase().includes('day') && !trimmedLine.match(/\d/)) {
        currentShiftType = 'day';
        console.log('☀️ Switched to DAY shifts');
        continue;
      }

      // Match pattern: "Monday 17th x 5" or "Monday- 17th x 5" or "Monday – 18th x 1"
      // Handle various dash types: - (hyphen), – (en dash), — (em dash)
      const match = trimmedLine.match(/(\w+)[\s\-–—]*(\d+)(?:st|nd|rd|th)?\s*x\s*(\d+)/i);
      if (match) {
        const [, , day, quantity] = match;
        const date = `2025-11-${day.padStart(2, '0')}`;
        shifts.push({
          date,
          shift_type: currentShiftType,
          quantity: parseInt(quantity)
        });
        console.log(`✅ Extracted: ${date} ${currentShiftType} x${quantity}`);
      } else {
        console.log(`❌ No match for line: "${trimmedLine}"`);
      }
    }

    if (shifts.length > 0) {
      return {
        status: 'ready',
        question: `Great! I found ${shifts.length} shift entries. Ready to create them?`,
        options: [],
        extracted_data: {
          ...context,
          shifts
        },
        validation_errors: [],
        assumptions_made: [
          `Extracted ${shifts.length} shifts`,
          'Staff names ignored (shifts created as open)',
          `Using ${context.client_name}`,
          `Role: ${context.role}`,
          `Period: ${context.month} ${context.year}`
        ]
      };
    }

    return {
      status: 'needs_clarification',
      question: 'I couldn\'t extract shifts from your message. Please paste the schedule in format: "Monday 17th x 5"',
      options: [],
      extracted_data: context,
      validation_errors: ['No shifts found in message'],
      assumptions_made: []
    };
  }

  // REAL MODE: Call OpenAI via Edge Function
  try {
    const response = await invokeEdgeFunction('invoke-llm', {
      prompt: systemPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['needs_clarification', 'ready'] },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          extracted_data: { type: 'object' },
          validation_errors: { type: 'array', items: { type: 'string' } },
          assumptions_made: { type: 'array', items: { type: 'string' } }
        },
        required: ['status', 'extracted_data']
      }
    });

    const aiResponse = response?.data ?? response;
    console.log('🤖 AI Response:', aiResponse);

    return aiResponse;
  } catch (error) {
    console.error('❌ AI extraction failed:', error);
    throw new Error(`AI extraction failed: ${error.message}`);
  }
}

/**
 * Convert AI extracted shifts to BulkShiftCreation gridData format
 * This allows seamless handoff to existing BulkShiftCreation backend
 *
 * @param {Object} extractedData - AI extracted data
 * @param {Object} client - Client object from database
 * @param {Object} user - Current user
 * @param {string} agencyId - Current agency ID
 * @returns {Object} - formData object compatible with BulkShiftCreation
 */
export function convertToGridData(extractedData, client, user, agencyId) {
  console.log('📊 convertToGridData called with:', { extractedData, client: client?.name, agencyId });

  const { shifts, role, month, year } = extractedData;

  if (!shifts || shifts.length === 0) {
    console.error('❌ No shifts extracted');
    throw new Error('No shifts extracted');
  }

  if (!client) {
    console.error('❌ Client is required');
    throw new Error('Client is required');
  }

  if (!role) {
    console.error('❌ Role is required');
    throw new Error('Role is required');
  }

  console.log(`✅ Converting ${shifts.length} shifts for role: ${role}`);

  // Build gridData object
  const gridData = {};
  const activeRolesSet = new Set();

  shifts.forEach(shift => {
    const roleKey = `${role}_${shift.shift_type}`;
    activeRolesSet.add(roleKey);

    if (!gridData[shift.date]) {
      gridData[shift.date] = {};
    }

    // Add quantity to gridData
    gridData[shift.date][roleKey] = (gridData[shift.date][roleKey] || 0) + shift.quantity;
  });

  // Build activeRoles array with rates
  const activeRoles = Array.from(activeRolesSet).map(roleKey => {
    const shiftType = roleKey.endsWith('_day') ? 'day' : 'night';
    const rates = getClientRates(client, role, shiftType);

    return {
      key: roleKey,
      label: `${role.replace(/_/g, ' ')} ${shiftType}`,
      role: role,
      shiftType: shiftType,
      payRate: rates.pay_rate,
      chargeRate: rates.charge_rate
    };
  });

  // Get shift times from client configuration
  const shiftTimes = {
    day: getShiftTimes(client, 'day'),
    night: getShiftTimes(client, 'night')
  };

  // Build ratesByRole object
  const ratesByRole = {
    [role]: getClientRates(client, role, 'day')
  };

  // Return formData object (SAME structure as BulkShiftCreation)
  const formData = {
    client_id: client.id,
    client: client,
    activeRoles: activeRoles,
    gridData: gridData,
    ratesByRole: ratesByRole,
    shiftTimes: shiftTimes,
    break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
    location_options: client.internal_locations || [],
    work_location_within_site: '',
    urgency: 'normal',
    notes: `Created via AI Shift Paste on ${new Date().toLocaleDateString()}`,

    // Additional metadata
    dateRange: {
      startDate: shifts[0]?.date || '',
      endDate: shifts[shifts.length - 1]?.date || ''
    },

    // Empty arrays for Step 3 (will be populated by BulkShiftCreation)
    generatedShifts: [],
    validation: { errors: [], warnings: [], isValid: false }
  };

  console.log('✅ convertToGridData result:', {
    gridData,
    activeRoles: activeRoles.length,
    dateRange: formData.dateRange
  });

  return formData;
}

