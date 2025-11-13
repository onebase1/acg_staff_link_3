import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🏆 ENTERPRISE-GRADE BULK IMPORT VALIDATOR
 *
 * Features:
 * - ✅ SHIFTS: Fuzzy client matching, UK dates, email validation
 * - ✅ STAFF: Email validation, date parsing
 * - ✅ CLIENTS: Name validation, coordinate validation
 * - ✅ COMPLIANCE: Date validation, staff email lookup
 * - 🇬🇧 UK DATE SUPPORT: All import types
 * - Confidence scoring (0-100%)
 * - "Did you mean?" suggestions
 * - Auto-fix vs Manual review classification
 *
 * Returns detailed validation report BEFORE any data is imported
 */

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    const { rows, import_type, agency_id } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: rows (array)' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 [Validation] Analyzing ${rows.length} rows for ${import_type} import`);

    // Fetch reference data based on import type
    let clients = [];
    let staff = [];

    if (['shifts', 'timesheets', 'client_rates'].includes(import_type)) {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agency_id);
      if (!clientsError) clients = clientsData || [];
    }

    if (['shifts', 'timesheets', 'compliance', 'staff_availability'].includes(import_type)) {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("agency_id", agency_id);
      if (!staffError) staff = staffData || [];
    }

    const validationResults = {
      total_rows: rows.length,
      clean_rows: 0,
      auto_fixable: 0,
      requires_review: 0,
      critical_errors: 0,
      issues: [],
      auto_fixes: [],
      suggestions: [],
      auto_converted_dates: 0
    };

    // 🇬🇧 UK DATE PARSER: Intelligently detects DD/MM/YYYY and converts to YYYY-MM-DD
    const parseUKDate = (dateStr) => {
      if (!dateStr) return { valid: false, reason: 'Date is empty' };

      const trimmed = dateStr.trim();

      // Check if already in ISO format (YYYY-MM-DD)
      const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (isoPattern.test(trimmed)) {
        // Validate it's a real date
        const date = new Date(trimmed);
        if (isNaN(date.getTime())) {
          return { valid: false, reason: 'Invalid date (not a real calendar date)', original: trimmed };
        }
        return { valid: true, iso_date: trimmed, format: 'ISO', original: trimmed };
      }

      // Check for UK format (DD/MM/YYYY)
      const ukPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = trimmed.match(ukPattern);

      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        // Validate ranges
        if (month < 1 || month > 12) {
          return { valid: false, reason: 'Invalid month (must be 1-12)', original: trimmed };
        }
        if (day < 1 || day > 31) {
          return { valid: false, reason: 'Invalid day (must be 1-31)', original: trimmed };
        }
        if (year < 1900 || year > 2100) {
          return { valid: false, reason: 'Invalid year (must be 1900-2100)', original: trimmed };
        }

        // Construct ISO date
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Validate it's a real date (catches Feb 30th, etc.)
        const testDate = new Date(isoDate);
        if (isNaN(testDate.getTime())) {
          return { valid: false, reason: 'Invalid date (not a real calendar date)', original: trimmed };
        }

        // Check if reconstructed date matches input (catches things like 31/02/2025)
        if (testDate.getDate() !== day || testDate.getMonth() + 1 !== month || testDate.getFullYear() !== year) {
          return { valid: false, reason: 'Invalid date (day does not exist in that month)', original: trimmed };
        }

        return {
          valid: true,
          iso_date: isoDate,
          format: 'UK',
          original: trimmed,
          converted: true
        };
      }

      // Unknown format
      return {
        valid: false,
        reason: `Invalid date format (expected DD/MM/YYYY or YYYY-MM-DD, got "${trimmed}")`,
        original: trimmed
      };
    };

    // Levenshtein distance for fuzzy matching
    const levenshteinDistance = (a, b) => {
      const an = a.length;
      const bn = b.length;
      const matrix = Array(bn + 1).fill(null).map(() => Array(an + 1).fill(null));

      for (let i = 0; i <= an; i++) matrix[0][i] = i;
      for (let j = 0; j <= bn; j++) matrix[j][0] = j;

      for (let j = 1; j <= bn; j++) {
        for (let i = 1; i <= an; i++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j - 1][i] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i - 1] + cost
          );
        }
      }

      return matrix[bn][an];
    };

    const stringSimilarity = (str1, str2) => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      const longerLength = longer.length;
      if (longerLength === 0) return 1.0;
      const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
      return (longerLength - distance) / longerLength;
    };

    // Fuzzy match clients
    const findBestClientMatch = (clientName) => {
      if (!clientName) return null;

      const normalized = clientName.trim();

      // Try exact match first
      const exactMatch = clients.find(c =>
        c.name.toLowerCase() === normalized.toLowerCase()
      );
      if (exactMatch) {
        return {
          match: exactMatch,
          confidence: 100,
          method: 'exact',
          original: clientName
        };
      }

      // Fuzzy matching
      const matches = clients.map(c => ({
        client: c,
        similarity: stringSimilarity(normalized, c.name),
        distance: levenshteinDistance(normalized.toLowerCase(), c.name.toLowerCase())
      }))
      .sort((a, b) => b.similarity - a.similarity);

      const bestMatch = matches[0];

      if (bestMatch && bestMatch.similarity >= 0.85) {
        return {
          match: bestMatch.client,
          confidence: Math.round(bestMatch.similarity * 100),
          method: 'fuzzy',
          original: clientName,
          alternatives: matches.slice(1, 3)
            .filter(m => m.similarity >= 0.70)
            .map(m => ({ name: m.client.name, confidence: Math.round(m.similarity * 100) }))
        };
      }

      return null;
    };

    // Email validation & normalization
    const validateEmail = (email) => {
      if (!email) return { valid: false, reason: 'Email is empty' };

      const normalized = email.trim().toLowerCase();

      // Check for common typos
      const doubleAt = (normalized.match(/@/g) || []).length;
      if (doubleAt > 1) {
        // Suggest fix: remove duplicate @
        const suggestedFix = normalized.replace(/@(?=.*@)/, '');
        return {
          valid: false,
          reason: 'Multiple @ symbols detected',
          normalized,
          suggested_fix: suggestedFix,
          auto_fixable: true
        };
      }

      // Standard email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) {
        return {
          valid: false,
          reason: 'Invalid email format',
          normalized
        };
      }

      return { valid: true, normalized };
    };

    // ✅ Auto-convert UK dates for ALL import types
    const dateFields = {
      shifts: ['date'],
      staff: ['date_of_birth', 'proposed_first_shift_date', 'medication_training_expiry', 'driving_license_expiry'],
      clients: ['contract_start_date'],
      compliance: ['issue_date', 'expiry_date'],
      timesheets: ['shift_date']
    };

    const fieldsToConvert = dateFields[import_type] || [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      for (const field of fieldsToConvert) {
        if (row[field]) {
          const dateValidation = parseUKDate(row[field]);
          if (dateValidation.valid && dateValidation.converted) {
            row[field] = dateValidation.iso_date;
            validationResults.auto_converted_dates++;
            console.log(`✅ [Validation] Auto-converted ${field} in row ${row._rowIndex || (i + 2)}: ${dateValidation.original} → ${dateValidation.iso_date}`);
          }
        }
      }
    }

    // ✅ Validate each row based on import type
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = row._rowIndex || (i + 2);
      let rowClean = true;

      if (import_type === 'shifts') {
        // Validate client name
        if (row.client_name) {
          const clientMatch = findBestClientMatch(row.client_name);

          if (!clientMatch) {
            validationResults.issues.push({
              row: rowNumber,
              severity: 'critical',
              field: 'client_name',
              value: row.client_name,
              message: `Client "${row.client_name}" not found in database`,
              suggestion: 'Create this client first, or check spelling',
              requires_manual_review: true,
              fixable_inline: true,
              available_options: clients.map(c => ({ id: c.id, name: c.name }))
            });
            validationResults.critical_errors++;
            rowClean = false;
          } else if (clientMatch.confidence < 100) {
            // Fuzzy match found
            validationResults.auto_fixes.push({
              row: rowNumber,
              field: 'client_name',
              original: row.client_name,
              corrected: clientMatch.match.name,
              confidence: clientMatch.confidence,
              auto_apply: clientMatch.confidence >= 90,
              alternatives: clientMatch.alternatives
            });

            if (clientMatch.confidence >= 90) {
              validationResults.auto_fixable++;
            } else {
              validationResults.requires_review++;
              rowClean = false;
            }
          }
        }

        // Validate staff email (if assigned)
        if (row.assigned_staff_email) {
          const emailValidation = validateEmail(row.assigned_staff_email);

          if (!emailValidation.valid) {
            if (emailValidation.auto_fixable) {
              validationResults.auto_fixes.push({
                row: rowNumber,
                field: 'assigned_staff_email',
                original: row.assigned_staff_email,
                corrected: emailValidation.suggested_fix,
                confidence: 95,
                auto_apply: true,
                reason: emailValidation.reason
              });
              validationResults.auto_fixable++;
            } else {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'high',
                field: 'assigned_staff_email',
                value: row.assigned_staff_email,
                message: emailValidation.reason,
                requires_manual_review: true
              });
              validationResults.requires_review++;
              rowClean = false;
            }
          } else {
            // Check if staff exists
            const normalizedEmail = emailValidation.normalized;
            const staffMatch = staff.find(s =>
              s.email.toLowerCase() === normalizedEmail
            );

            if (!staffMatch) {
              validationResults.suggestions.push({
                row: rowNumber,
                field: 'assigned_staff_email',
                value: normalizedEmail,
                message: `Staff with email "${normalizedEmail}" not found`,
                suggestion: 'Shift will be created as "open" (unassigned)',
                severity: 'info'
              });
            }
          }
        }

        // Validate required fields
        const requiredFields = ['date', 'start_time', 'end_time', 'role_required'];
        for (const field of requiredFields) {
          if (!row[field]) {
            validationResults.issues.push({
              row: rowNumber,
              severity: 'critical',
              field,
              message: `Missing required field: ${field}`,
              requires_manual_review: true
            });
            validationResults.critical_errors++;
            rowClean = false;
          }
        }

        // Validate date fields for shifts (would have been auto-converted if valid UK dates)
        // This check is now only for dates that *weren't* auto-converted and are still invalid after initial parsing.
        // The date field in the row would have been updated by the `fieldsToConvert` loop above if it was a valid UK date.
        // So, here we validate the *already processed* row.date
        for (const field of (dateFields.shifts || [])) {
          if (row[field]) {
            const dateValidation = parseUKDate(row[field]); // re-parse to ensure validity in general
            if (!dateValidation.valid) {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'high',
                field: field,
                value: row[field],
                message: dateValidation.reason,
                requires_manual_review: true
              });
              validationResults.requires_review++;
              rowClean = false;
            }
          }
        }

        // Validate time format
        const timePattern = /^\d{2}:\d{2}$/;
        if (row.start_time && !timePattern.test(row.start_time)) {
          validationResults.issues.push({
            row: rowNumber,
            severity: 'high',
            field: 'start_time',
            value: row.start_time,
            message: 'Invalid time format (expected: HH:MM)',
            requires_manual_review: true
          });
          validationResults.requires_review++;
          rowClean = false;
        }

        // Validate numeric fields
        if (row.pay_rate && isNaN(parseFloat(row.pay_rate))) {
          validationResults.issues.push({
            row: rowNumber,
            severity: 'medium',
            field: 'pay_rate',
            value: row.pay_rate,
            message: 'pay_rate must be a number',
            requires_manual_review: true
          });
          validationResults.requires_review++;
          rowClean = false;
        }
      }

      // ✅ NEW: Staff validation
      else if (import_type === 'staff') {
        const requiredFields = ['first_name', 'last_name', 'email', 'role'];
        for (const field of requiredFields) {
          if (!row[field]) {
            validationResults.issues.push({
              row: rowNumber,
              severity: 'critical',
              field,
              message: `Missing required field: ${field}`,
              requires_manual_review: true
            });
            validationResults.critical_errors++;
            rowClean = false;
          }
        }
        if (row.email) {
          const emailValidation = validateEmail(row.email);
          if (!emailValidation.valid) {
            if (emailValidation.auto_fixable) {
              validationResults.auto_fixes.push({
                row: rowNumber,
                field: 'email',
                original: row.email,
                corrected: emailValidation.suggested_fix,
                confidence: 95,
                auto_apply: true,
                reason: emailValidation.reason
              });
              validationResults.auto_fixable++;
            } else {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'critical',
                field: 'email',
                value: row.email,
                message: emailValidation.reason,
                requires_manual_review: true
              });
              validationResults.critical_errors++;
              rowClean = false;
            }
          }
        }

        // Validate date fields for staff (which would have been auto-converted if valid UK dates)
        for (const field of (dateFields.staff || [])) {
          if (row[field]) {
            const dateValidation = parseUKDate(row[field]); // re-parse to ensure validity in general
            if (!dateValidation.valid) {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'high',
                field: field,
                value: row[field],
                message: dateValidation.reason,
                requires_manual_review: true
              });
              validationResults.requires_review++;
              rowClean = false;
            }
          }
        }
      }

      // ✅ NEW: Client validation
      else if (import_type === 'clients') {
        if (!row.name) {
          validationResults.issues.push({
            row: rowNumber,
            severity: 'critical',
            field: 'name',
            message: 'Missing required field: name',
            requires_manual_review: true
          });
          validationResults.critical_errors++;
          rowClean = false;
        }
        if (row.contact_person_email) {
          const emailValidation = validateEmail(row.contact_person_email);
          if (!emailValidation.valid) {
            if (emailValidation.auto_fixable) {
                validationResults.auto_fixes.push({
                    row: rowNumber,
                    field: 'contact_person_email',
                    original: row.contact_person_email,
                    corrected: emailValidation.suggested_fix,
                    confidence: 95,
                    auto_apply: true,
                    reason: emailValidation.reason
                });
                validationResults.auto_fixable++;
            } else {
                validationResults.issues.push({
                    row: rowNumber,
                    severity: 'high',
                    field: 'contact_person_email',
                    value: row.contact_person_email,
                    message: emailValidation.reason,
                    requires_manual_review: true
                });
                validationResults.requires_review++;
                rowClean = false;
            }
          }
        }

        // Validate date fields for clients
        for (const field of (dateFields.clients || [])) {
          if (row[field]) {
            const dateValidation = parseUKDate(row[field]);
            if (!dateValidation.valid) {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'high',
                field: field,
                value: row[field],
                message: dateValidation.reason,
                requires_manual_review: true
              });
              validationResults.requires_review++;
              rowClean = false;
            }
          }
        }

        // Coordinate validation (simple check for numbers for now)
        if (row.latitude && isNaN(parseFloat(row.latitude))) {
            validationResults.issues.push({
                row: rowNumber,
                severity: 'medium',
                field: 'latitude',
                value: row.latitude,
                message: 'latitude must be a number',
                requires_manual_review: true
            });
            validationResults.requires_review++;
            rowClean = false;
        }
        if (row.longitude && isNaN(parseFloat(row.longitude))) {
            validationResults.issues.push({
                row: rowNumber,
                severity: 'medium',
                field: 'longitude',
                value: row.longitude,
                message: 'longitude must be a number',
                requires_manual_review: true
            });
            validationResults.requires_review++;
            rowClean = false;
        }
      }

      // ✅ NEW: Compliance validation
      else if (import_type === 'compliance') {
        if (!row.staff_email) {
          validationResults.issues.push({
            row: rowNumber,
            severity: 'critical',
            field: 'staff_email',
            message: 'Missing required field: staff_email',
            requires_manual_review: true
          });
          validationResults.critical_errors++;
          rowClean = false;
        } else {
          const emailValidation = validateEmail(row.staff_email);
          if (!emailValidation.valid) {
            if (emailValidation.auto_fixable) {
                validationResults.auto_fixes.push({
                    row: rowNumber,
                    field: 'staff_email',
                    original: row.staff_email,
                    corrected: emailValidation.suggested_fix,
                    confidence: 95,
                    auto_apply: true,
                    reason: emailValidation.reason
                });
                validationResults.auto_fixable++;
            } else {
                validationResults.issues.push({
                    row: rowNumber,
                    severity: 'critical',
                    field: 'staff_email',
                    value: row.staff_email,
                    message: emailValidation.reason,
                    requires_manual_review: true
                });
                validationResults.critical_errors++;
                rowClean = false;
            }
          } else { // Email is valid
            const staffMatch = staff.find(s =>
              s.email.toLowerCase() === emailValidation.normalized
            );
            if (!staffMatch) {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'critical',
                field: 'staff_email',
                value: row.staff_email,
                message: `Staff with email "${row.staff_email}" not found`,
                suggestion: 'Add this staff member first',
                requires_manual_review: true
              });
              validationResults.critical_errors++;
              rowClean = false;
            }
          }
        }

        const requiredFields = ['document_type', 'issue_date', 'expiry_date'];
        for (const field of requiredFields) {
          if (!row[field]) {
            validationResults.issues.push({
              row: rowNumber,
              severity: 'critical',
              field,
              message: `Missing required field: ${field}`,
              requires_manual_review: true
            });
            validationResults.critical_errors++;
            rowClean = false;
          }
        }

        // Validate date fields for compliance
        for (const field of (dateFields.compliance || [])) {
          if (row[field]) {
            const dateValidation = parseUKDate(row[field]);
            if (!dateValidation.valid) {
              validationResults.issues.push({
                row: rowNumber,
                severity: 'high',
                field: field,
                value: row[field],
                message: dateValidation.reason,
                requires_manual_review: true
              });
              validationResults.requires_review++;
              rowClean = false;
            }
          }
        }
      }

      if (rowClean && validationResults.auto_fixes.filter(f => f.row === rowNumber && !f.auto_apply).length === 0) {
        validationResults.clean_rows++;
      }
    }

    console.log(`✅ [Validation] Complete:`, {
      clean: validationResults.clean_rows,
      auto_fix: validationResults.auto_fixable,
      auto_converted_dates: validationResults.auto_converted_dates,
      review: validationResults.requires_review,
      errors: validationResults.critical_errors
    });

    return new Response(
      JSON.stringify({
        success: true,
        validation: validationResults,
        rows: rows,
        ready_to_import: validationResults.critical_errors === 0,
        recommendation: validationResults.critical_errors > 0
          ? 'Fix critical errors before importing'
          : validationResults.requires_review > 0
          ? 'Review flagged issues before importing'
          : validationResults.auto_fixable > 0
          ? 'Auto-fixes available - review and approve'
          : validationResults.auto_converted_dates > 0
          ? `All records are clean - ${validationResults.auto_converted_dates} UK dates auto-converted`
          : 'All records are clean - ready to import'
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ [Validation] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
