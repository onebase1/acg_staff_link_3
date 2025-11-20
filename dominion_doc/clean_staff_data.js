/**
 * Dominion Staff Data Cleaning Script
 * 
 * Purpose: Clean CSV data before bulk import to ACG StaffLink
 * 
 * Fixes:
 * - Phone numbers: Add +44 prefix to UK numbers
 * - Roles: Normalize to system values (Care Worker → care_worker)
 * - Employment type: Normalize to lowercase
 * - Status: Set to 'active' (NOT 'onboarding' to avoid email spam)
 * - Dates: Flag for manual review (validator will auto-convert UK dates)
 * - Duplicates: Identify and flag for manual review
 * 
 * Usage:
 *   node dominion_doc/clean_staff_data.js
 */

const fs = require('fs');
const Papa = require('papaparse');

// Configuration
const INPUT_FILE = 'dominion_doc/DHCS - STAFF NAME  SORTED.csv';
const OUTPUT_FILE = 'dominion_doc/DHCS_CLEANED.csv';
const DUPLICATES_FILE = 'dominion_doc/DUPLICATES_REVIEW.txt';
const DOMINION_AGENCY_ID = '[REPLACE_WITH_ACTUAL_AGENCY_ID]'; // Get from database

console.log('🧹 Starting Dominion Staff Data Cleaning...\n');

// Read CSV
const csvData = fs.readFileSync(INPUT_FILE, 'utf8');
const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

console.log(`📄 Loaded ${parsed.data.length} staff records\n`);

// Track issues
const issues = {
  phoneFixed: 0,
  missingPhone: 0,
  missingEmail: 0,
  missingDOB: 0,
  missingAddress: 0,
  missingBank: 0,
  duplicateEmails: [],
  duplicatePhones: []
};

// Detect duplicates
const emailMap = new Map();
const phoneMap = new Map();

parsed.data.forEach((row, index) => {
  const email = row.email?.toLowerCase().trim();
  const phone = row.phone?.trim();

  if (email) {
    if (emailMap.has(email)) {
      emailMap.get(email).push(index + 2); // +2 for header + 1-based
    } else {
      emailMap.set(email, [index + 2]);
    }
  }

  if (phone) {
    if (phoneMap.has(phone)) {
      phoneMap.get(phone).push(index + 2);
    } else {
      phoneMap.set(phone, [index + 2]);
    }
  }
});

// Find duplicates
emailMap.forEach((rows, email) => {
  if (rows.length > 1) {
    issues.duplicateEmails.push({ email, rows });
  }
});

phoneMap.forEach((rows, phone) => {
  if (rows.length > 1) {
    issues.duplicatePhones.push({ phone, rows });
  }
});

// Clean each row
const cleaned = parsed.data.map((row, index) => {
  const rowNum = index + 2; // +2 for header + 1-based

  // Fix phone numbers
  let phone = row.phone?.trim();
  if (phone) {
    // Remove spaces and hyphens
    phone = phone.replace(/[\s-]/g, '');
    
    // Add +44 if missing
    if (phone.length === 10 && phone.startsWith('7')) {
      phone = '+44' + phone;
      issues.phoneFixed++;
    } else if (phone.length === 11 && phone.startsWith('07')) {
      phone = '+44' + phone.substring(1);
      issues.phoneFixed++;
    } else if (!phone.startsWith('+')) {
      phone = '+44' + phone; // Assume UK
      issues.phoneFixed++;
    }
  } else {
    issues.missingPhone++;
  }

  // Normalize role
  const roleMap = {
    'Care Worker': 'care_worker',
    'Care worker': 'care_worker',
    'care worker': 'care_worker'
  };
  const role = roleMap[row.role] || 'care_worker';

  // Normalize employment type
  const employment_type = row.employment_type?.toLowerCase().trim() || 'temporary';

  // Set status to active (NOT onboarding to avoid email spam)
  const status = 'active';

  // Set created_date to today
  const created_date = new Date().toISOString();

  // Track missing data
  if (!row.email) issues.missingEmail++;
  if (!row.date_of_birth) issues.missingDOB++;
  if (!row.address) issues.missingAddress++;
  if (!row['Bank Name'] || !row.bank_sort_code || !row.bank_account_number) {
    issues.missingBank++;
  }

  return {
    // Required fields
    first_name: row['First Name']?.trim() || '',
    last_name: row['Last name']?.trim() || '',
    email: row.email?.toLowerCase().trim() || '',
    phone: phone || '',
    role: role,
    employment_type: employment_type,
    status: status,
    hourly_rate: parseFloat(row['Hourly Rate']) || 12.21,
    
    // Agency assignment
    agency_id: DOMINION_AGENCY_ID,
    
    // Personal details
    date_of_birth: row.date_of_birth?.trim() || '', // Validator will convert UK dates
    address: row.address?.trim() || '',
    postcode: row.postcode?.trim() || '',
    national_insurance: row['N.I']?.trim() || '',
    
    // Bank details
    bank_name: row['Bank Name']?.trim() || '',
    bank_sort_code: row.bank_sort_code?.trim() || '',
    bank_account_number: row.bank_account_number?.trim() || '',
    
    // Emergency contact
    emergency_contact_name: row.emergency_contact_name?.trim() || '',
    emergency_contact_phone: row.emergency_contact_phone?.trim() || '',
    emergency_contact_relationship: row.emergency_contact_relationship?.trim() || '',
    
    // Additional fields
    skills: row.skills?.trim() || '',
    months_of_experience: row.months_of_experience?.trim() || '',
    availability_notes: row.availability_notes?.trim() || '',
    
    // Timestamps
    created_date: created_date,
    updated_date: created_date
  };
});

// Write cleaned CSV
const cleanedCsv = Papa.unparse(cleaned);
fs.writeFileSync(OUTPUT_FILE, cleanedCsv);

// Write duplicates report
let duplicatesReport = '🚨 DUPLICATES FOUND - MANUAL REVIEW REQUIRED\n\n';
duplicatesReport += '=' .repeat(60) + '\n\n';

if (issues.duplicateEmails.length > 0) {
  duplicatesReport += '📧 DUPLICATE EMAILS:\n\n';
  issues.duplicateEmails.forEach(({ email, rows }) => {
    duplicatesReport += `Email: ${email}\n`;
    duplicatesReport += `Found in rows: ${rows.join(', ')}\n`;
    duplicatesReport += `Action: Contact Dominion to clarify which record is correct\n\n`;
  });
}

if (issues.duplicatePhones.length > 0) {
  duplicatesReport += '📞 DUPLICATE PHONE NUMBERS:\n\n';
  issues.duplicatePhones.forEach(({ phone, rows }) => {
    duplicatesReport += `Phone: ${phone}\n`;
    duplicatesReport += `Found in rows: ${rows.join(', ')}\n`;
    duplicatesReport += `Action: Verify if same person or data entry error\n\n`;
  });
}

if (issues.duplicateEmails.length === 0 && issues.duplicatePhones.length === 0) {
  duplicatesReport += '✅ No duplicates found!\n';
}

fs.writeFileSync(DUPLICATES_FILE, duplicatesReport);

// Print summary
console.log('✅ CLEANING COMPLETE\n');
console.log('=' .repeat(60));
console.log(`📄 Input:  ${INPUT_FILE}`);
console.log(`📄 Output: ${OUTPUT_FILE}`);
console.log(`📄 Duplicates Report: ${DUPLICATES_FILE}`);
console.log('=' .repeat(60));
console.log('\n📊 SUMMARY:\n');
console.log(`Total records processed: ${cleaned.length}`);
console.log(`Phone numbers fixed: ${issues.phoneFixed}`);
console.log(`Missing phone: ${issues.missingPhone}`);
console.log(`Missing email: ${issues.missingEmail}`);
console.log(`Missing DOB: ${issues.missingDOB}`);
console.log(`Missing address: ${issues.missingAddress}`);
console.log(`Missing bank details: ${issues.missingBank}`);
console.log(`Duplicate emails: ${issues.duplicateEmails.length}`);
console.log(`Duplicate phones: ${issues.duplicatePhones.length}`);
console.log('\n🎯 NEXT STEPS:\n');
console.log('1. Review duplicates report (if any)');
console.log('2. Upload cleaned CSV to bulk import validator');
console.log('3. Review validation report');
console.log('4. Fix critical errors');
console.log('5. Run test import with 5 staff');
console.log('6. Run full import with remaining staff\n');

