import Papa from 'papaparse';
import { parseDate, normalizeRole, normalizeShiftType } from './pasteParser';

/**
 * Parse and validate uploaded CSV file
 * @param {File} file - The CSV file to parse
 * @param {Array} activeRoles - Active roles from client setup
 * @returns {Promise<{success: boolean, data: Array, errors: Array}>}
 */
export async function parseCSVFile(file, activeRoles) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validation = validateCSVData(results.data, activeRoles);
        resolve(validation);
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`CSV parse error: ${error.message}`]
        });
      }
    });
  });
}

/**
 * Validate CSV data structure and content
 * @param {Array} rows - Parsed CSV rows
 * @param {Array} activeRoles - Active roles from client setup
 * @returns {{success: boolean, data: Array, errors: Array}}
 */
function validateCSVData(rows, activeRoles) {
  const errors = [];
  const validData = [];
  const requiredColumns = ['Role', 'Date', 'Shift Type', 'Quantity'];

  if (!rows || rows.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['CSV file is empty']
    };
  }

  // Check for required columns (case-insensitive)
  const firstRow = rows[0];
  const headers = Object.keys(firstRow).map(h => h.toLowerCase().trim());

  const missingColumns = [];
  requiredColumns.forEach(col => {
    const normalized = col.toLowerCase();
    if (!headers.some(h => h.includes(normalized.replace(' ', '')))) {
      missingColumns.push(col);
    }
  });

  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}. Expected: ${requiredColumns.join(', ')}`]
    };
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because: 1-indexed and header row
    const rowErrors = [];

    // Get values (case-insensitive column matching)
    const roleRaw = getColumnValue(row, ['role', 'staff role', 'position']);
    const dateRaw = getColumnValue(row, ['date', 'shift date']);
    const shiftTypeRaw = getColumnValue(row, ['shift type', 'shift', 'type']);
    const quantityRaw = getColumnValue(row, ['quantity', 'qty', 'count', 'number']);

    // Validate Role
    if (!roleRaw || !roleRaw.trim()) {
      rowErrors.push(`Row ${rowNumber}: Missing role`);
    }

    // Validate Date
    if (!dateRaw || !dateRaw.trim()) {
      rowErrors.push(`Row ${rowNumber}: Missing date`);
    } else {
      const parsedDate = parseDate(dateRaw);
      if (!parsedDate) {
        rowErrors.push(`Row ${rowNumber}: Invalid date format "${dateRaw}". Use DD/MM/YYYY or YYYY-MM-DD`);
      }
    }

    // Validate Shift Type
    if (!shiftTypeRaw || !shiftTypeRaw.trim()) {
      rowErrors.push(`Row ${rowNumber}: Missing shift type`);
    }

    // Validate Quantity
    if (!quantityRaw || quantityRaw.toString().trim() === '') {
      rowErrors.push(`Row ${rowNumber}: Missing quantity`);
    } else {
      const qty = parseInt(quantityRaw);
      if (isNaN(qty) || qty <= 0) {
        rowErrors.push(`Row ${rowNumber}: Invalid quantity "${quantityRaw}". Must be a positive number`);
      }
    }

    // If row has errors, add to errors array and skip
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    // Parse and normalize
    const role = normalizeRole(roleRaw);
    const date = parseDate(dateRaw);
    const shiftType = normalizeShiftType(shiftTypeRaw);
    const quantity = parseInt(quantityRaw);

    // Additional validation
    if (!role) {
      errors.push(`Row ${rowNumber}: Could not match role "${roleRaw}" to available roles`);
      return;
    }

    if (!shiftType) {
      errors.push(`Row ${rowNumber}: Could not identify shift type "${shiftTypeRaw}". Use "Day" or "Night"`);
      return;
    }

    // Check if this role+shiftType combination exists in activeRoles
    const roleKey = `${role}_${shiftType}`;
    const roleExists = activeRoles.some(r => r.key === roleKey);

    if (!roleExists) {
      errors.push(`Row ${rowNumber}: Role "${role}" with shift type "${shiftType}" not found in client setup`);
      return;
    }

    // Add to valid data
    validData.push({
      role,
      date,
      shiftType,
      quantity,
      roleKey,
      rawRow: row,
      rowNumber
    });
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors: errors.length > 0 ? errors : []
  };
}

/**
 * Get column value with case-insensitive matching
 * @param {Object} row - CSV row object
 * @param {Array<string>} possibleNames - Possible column names
 * @returns {string}
 */
function getColumnValue(row, possibleNames) {
  for (let name of possibleNames) {
    const key = Object.keys(row).find(k =>
      k.toLowerCase().trim().replace(/[^a-z0-9]/g, '') ===
      name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    );
    if (key && row[key]) {
      return row[key].toString().trim();
    }
  }
  return '';
}

/**
 * Convert validated CSV data to grid format
 * @param {Array} csvData - Validated CSV data
 * @param {Array} dateArray - Array of dates in YYYY-MM-DD format
 * @returns {Object} Grid data object
 */
export function convertCSVToGridData(csvData, dateArray) {
  const gridData = {};

  // Initialize all dates
  dateArray.forEach(date => {
    gridData[date] = {};
  });

  // Fill in quantities from CSV
  csvData.forEach(item => {
    const { date, roleKey, quantity } = item;

    // Only add if date is in the current date range
    if (gridData[date] !== undefined) {
      // Accumulate quantities if same date+role appears multiple times
      gridData[date][roleKey] = (gridData[date][roleKey] || 0) + quantity;
    }
  });

  return gridData;
}

/**
 * Get example CSV content for error messages
 * @returns {string}
 */
export function getExampleCSV() {
  return `Role,Day of Week,Date (DD/MM/YYYY),Shift Type,Quantity
Nurses,Saturday,15/11/2025,Day,2
Healthcare Assistants,Sunday,16/11/2025,Night,3`;
}
