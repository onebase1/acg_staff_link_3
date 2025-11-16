/**
 * Smart Paste Parser
 * Parses pasted email/spreadsheet data into grid format
 */

/**
 * Detect delimiter in text
 * @param {string} text - Raw pasted text
 * @returns {string} Delimiter character (tab, comma, pipe, or space)
 */
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0];

  // Check for tab (most common from Excel/email)
  if (firstLine.includes('\t')) return '\t';

  // Check for comma (CSV)
  if (firstLine.includes(',')) return ',';

  // Check for pipe
  if (firstLine.includes('|')) return '|';

  // Default to space-separated
  return ' ';
}

/**
 * Parse date from various formats
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;

  dateStr = dateStr.trim();

  // YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmMatch) {
    const day = ddmmMatch[1].padStart(2, '0');
    const month = ddmmMatch[2].padStart(2, '0');
    const year = ddmmMatch[3];

    // Assume DD/MM/YYYY format (UK)
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Normalize role name
 * Maps various role names to database role keys
 */
export function normalizeRole(roleStr) {
  if (!roleStr) return null;

  const normalized = roleStr.toLowerCase().trim();

  // Nurse variants
  if (normalized.match(/\bnurse/i)) {
    return 'nurse';
  }

  // Healthcare Assistant variants
  if (normalized.match(/\b(hca|healthcare\s*assistant|health\s*care\s*assistant)/i)) {
    return 'healthcare_assistant';
  }

  // Senior Care Worker variants
  if (normalized.match(/\b(senior|scw|senior\s*care)/i)) {
    return 'senior_care_worker';
  }

  // Care Worker variants
  if (normalized.match(/\b(care\s*worker|carer)/i)) {
    return 'care_worker';
  }

  return null;
}

/**
 * Normalize shift type
 * Maps day/night variants
 */
export function normalizeShiftType(shiftStr) {
  if (!shiftStr) return null;

  const normalized = shiftStr.toLowerCase().trim();

  if (normalized.match(/\b(day|d|morning|am)/i)) {
    return 'day';
  }

  if (normalized.match(/\b(night|n|evening|pm|nights)/i)) {
    return 'night';
  }

  return null;
}

/**
 * Parse a single line
 * Expected format: Role | DayOfWeek | Date | Shift | Quantity
 * Example: "Nurses    Saturday  15/11/2025  Day     2"
 */
function parseLine(line, delimiter) {
  if (!line || !line.trim()) return null;

  // Split by delimiter
  const parts = line.split(delimiter).map(p => p.trim()).filter(p => p);

  if (parts.length < 4) return null; // Need at least role, date, shift, quantity

  // Try to identify columns
  // Common patterns:
  // [Role, Day, Date, Shift, Quantity]
  // [Role, Date, Shift, Quantity]

  let role, date, shiftType, quantity;

  // If 5 parts: Role, DayOfWeek, Date, Shift, Quantity
  if (parts.length >= 5) {
    role = normalizeRole(parts[0]);
    date = parseDate(parts[2]); // Skip day of week
    shiftType = normalizeShiftType(parts[3]);
    quantity = parseInt(parts[4]) || 0;
  }
  // If 4 parts: Role, Date, Shift, Quantity
  else if (parts.length === 4) {
    role = normalizeRole(parts[0]);
    date = parseDate(parts[1]);
    shiftType = normalizeShiftType(parts[2]);
    quantity = parseInt(parts[3]) || 0;
  }
  // If 3 parts and last is number: Role, ShiftType, Quantity (use current date)
  else if (parts.length === 3 && !isNaN(parts[2])) {
    role = normalizeRole(parts[0]);
    shiftType = normalizeShiftType(parts[1]);
    quantity = parseInt(parts[2]) || 0;
    // Date will be set later
  }

  // Validate
  if (!role || !shiftType || quantity <= 0) {
    return null;
  }

  return {
    role,
    date,
    shiftType,
    quantity,
    original: line
  };
}

/**
 * Main parse function
 * @param {string} pastedText - Raw pasted text
 * @param {Array} activeRoles - Current active roles configuration
 * @returns {Object} { success, data, errors }
 */
export function parsePastedData(pastedText, activeRoles) {
  const errors = [];
  const parsedData = [];

  if (!pastedText || !pastedText.trim()) {
    return { success: false, data: [], errors: ['No data pasted'] };
  }

  // Detect delimiter
  const delimiter = detectDelimiter(pastedText);

  // Split into lines
  const lines = pastedText.split('\n').filter(line => line.trim());

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip header rows (contain keywords like "Role", "Date", "Shift")
    if (line.match(/\b(role|date|shift|quantity|day|when)\b/i) && !line.match(/\d+/)) {
      return; // Skip header
    }

    const parsed = parseLine(line, delimiter);

    if (!parsed) {
      errors.push(`Line ${lineNum}: Could not parse "${line.substring(0, 50)}..."`);
      return;
    }

    parsedData.push({
      ...parsed,
      lineNumber: lineNum
    });
  });

  // If no data parsed, return error
  if (parsedData.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['No valid data found. Expected format: Role, Date, Shift, Quantity']
    };
  }

  return {
    success: true,
    data: parsedData,
    errors: errors
  };
}

/**
 * Convert parsed data to grid format
 * @param {Array} parsedData - Array of parsed line objects
 * @param {Array} activeRoles - Current active roles
 * @param {Array} dateArray - Array of dates in grid
 * @returns {Object} Grid data object
 */
export function convertToGridData(parsedData, activeRoles, dateArray) {
  const gridData = {};

  // Initialize grid
  dateArray.forEach(date => {
    gridData[date] = {};
  });

  // Populate grid from parsed data
  parsedData.forEach(item => {
    if (!item.date) return; // Skip if no date

    // Find matching role key
    const roleKey = activeRoles.find(r =>
      r.role === item.role && r.shiftType === item.shiftType
    )?.key;

    if (!roleKey) return; // Skip if role not found

    // Check if date is in range
    if (!gridData[item.date]) {
      gridData[item.date] = {};
    }

    // Add or increment quantity
    gridData[item.date][roleKey] = (gridData[item.date][roleKey] || 0) + item.quantity;
  });

  return gridData;
}

/**
 * Generate example paste text for help
 */
export function getExamplePasteText() {
  return `Nurses	Saturday	15/11/2025	Day	2
Nurses	Saturday	15/11/2025	Night	2
Healthcare Assistants	Saturday	15/11/2025	Day	3
Healthcare Assistants	Saturday	15/11/2025	Night	2`;
}
