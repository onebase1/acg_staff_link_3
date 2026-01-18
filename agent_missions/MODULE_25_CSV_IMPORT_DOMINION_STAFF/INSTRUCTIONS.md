# MODULE 25: CSV IMPORT DOMINION STAFF

## 🎯 Mission Objective
Import 45 Dominion Healthcare staff records from CSV with full data validation, duplicate detection, and error reporting.

## 📊 Priority: P0 - CRITICAL (Production Blocker)
**Duration:** 2 hours
**Dependencies:** MODULE 21 (needs all staff fields)

---

## 📁 Source Data

**File:** `C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\dominion_doc\DHCS_CLEANED.csv`
**Agency ID:** `c8e84c94-8233-4084-b4c3-63ad9dc81c16` (Dominion Healthcare Services Ltd)
**Record Count:** 45 staff members

### CSV Fields Available
```
first_name, last_name, email, phone, role, employment_type, status,
hourly_rate, agency_id, date_of_birth, address, postcode,
national_insurance, bank_name, bank_sort_code, bank_account_number,
emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
skills, months_of_experience, availability_notes, created_date, updated_date
```

---

## 🚀 Implementation Steps

### STEP 1: Create Import Utility Script

**File:** `scripts/importDominionStaff.mjs` (NEW)

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DOMINION_AGENCY_ID = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16';

// Parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim() || '';
    });
    records.push(record);
  }

  return records;
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

// Normalize phone to E.164 format
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If starts with 44, ensure + prefix
  if (digits.startsWith('44')) {
    return '+' + digits;
  }

  // If starts with 0, replace with +44
  if (digits.startsWith('0')) {
    return '+44' + digits.slice(1);
  }

  // If starts with 7 (mobile without 0), add +44
  if (digits.startsWith('7') && digits.length === 10) {
    return '+44' + digits;
  }

  return '+' + digits; // Assume it's already international
}

// Validate NI Number format
function validateNINumber(ni) {
  if (!ni) return false;
  const niRegex = /^[A-Z]{2}\d{6}[A-Z]$/;
  return niRegex.test(ni.toUpperCase());
}

// Parse date from DD/MM/YYYY
function parseDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Transform CSV record to staff table format
function transformRecord(csvRecord) {
  return {
    agency_id: DOMINION_AGENCY_ID,
    first_name: csvRecord.first_name,
    last_name: csvRecord.last_name,
    full_name: `${csvRecord.first_name} ${csvRecord.last_name}`,
    email: csvRecord.email.toLowerCase(),
    phone: normalizePhone(csvRecord.phone),
    role: csvRecord.role || 'care_worker',
    employment_type: csvRecord.employment_type || 'temporary',
    status: 'onboarding', // All imports start as onboarding
    hourly_rate: parseFloat(csvRecord.hourly_rate) || 12.21,
    date_of_birth: parseDate(csvRecord.date_of_birth),

    // Address as JSONB
    address: {
      line1: csvRecord.address || '',
      line2: '',
      city: '', // Not in CSV
      postcode: csvRecord.postcode || ''
    },

    // NI Number
    ni_number: csvRecord.national_insurance,

    // Bank Details as JSONB
    bank_details: {
      account_name: `${csvRecord.first_name} ${csvRecord.last_name}`,
      sort_code: csvRecord.bank_sort_code || '',
      account_number: csvRecord.bank_account_number || '',
      bank_name: csvRecord.bank_name || ''
    },

    // Emergency Contact as JSONB
    emergency_contact: {
      name: csvRecord.emergency_contact_name || '',
      phone: normalizePhone(csvRecord.emergency_contact_phone),
      relationship: csvRecord.emergency_contact_relationship || ''
    },

    // Skills as JSONB array
    skills: csvRecord.skills ? [csvRecord.skills] : [],

    // Experience
    months_of_experience: parseInt(csvRecord.months_of_experience) || 0,

    // Audit trail
    profile_update_source: 'csv_import',
    profile_last_updated_at: new Date().toISOString(),

    // Created date
    created_date: csvRecord.created_date || new Date().toISOString()
  };
}

// Validate record
function validateRecord(record, index) {
  const errors = [];

  if (!record.first_name) errors.push('Missing first_name');
  if (!record.last_name) errors.push('Missing last_name');
  if (!record.email) errors.push('Missing email');
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    errors.push('Invalid email format');
  }
  if (record.phone && !record.phone.startsWith('+44')) {
    errors.push('Phone must be UK format');
  }
  if (record.ni_number && !validateNINumber(record.ni_number)) {
    errors.push('Invalid NI number format (should be AB123456C)');
  }
  if (record.bank_details?.sort_code && !/^\d{2}-\d{2}-\d{2}$/.test(record.bank_details.sort_code)) {
    errors.push('Invalid sort code format (should be XX-XX-XX)');
  }
  if (record.bank_details?.account_number && !/^\d{8}$/.test(record.bank_details.account_number)) {
    errors.push('Invalid account number (should be 8 digits)');
  }

  return { valid: errors.length === 0, errors };
}

// Main import function
async function importStaff() {
  console.log('🚀 Starting Dominion Staff Import...\n');

  const csvPath = path.join(__dirname, '../dominion_doc/DHCS_CLEANED.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvRecords = parseCSV(csvPath);
  console.log(`📁 Loaded ${csvRecords.length} records from CSV\n`);

  const results = {
    total: csvRecords.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < csvRecords.length; i++) {
    const csvRecord = csvRecords[i];
    const staffRecord = transformRecord(csvRecord);
    const { valid, errors } = validateRecord(staffRecord, i + 1);

    console.log(`\n[${i + 1}/${csvRecords.length}] Processing ${staffRecord.email}...`);

    if (!valid) {
      console.log(`  ❌ Validation failed: ${errors.join(', ')}`);
      results.failed++;
      results.errors.push({ row: i + 1, email: staffRecord.email, errors });
      continue;
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('staff')
      .select('id, email')
      .eq('email', staffRecord.email)
      .eq('agency_id', DOMINION_AGENCY_ID)
      .single();

    if (existing) {
      console.log(`  ⏭️  Skipped (already exists): ${existing.id}`);
      results.skipped++;
      continue;
    }

    // Insert record
    const { data, error } = await supabase
      .from('staff')
      .insert(staffRecord)
      .select()
      .single();

    if (error) {
      console.log(`  ❌ Insert failed: ${error.message}`);
      results.failed++;
      results.errors.push({ row: i + 1, email: staffRecord.email, errors: [error.message] });
    } else {
      console.log(`  ✅ Imported: ${data.id}`);
      results.imported++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Records:    ${results.total}`);
  console.log(`✅ Imported:      ${results.imported}`);
  console.log(`⏭️  Skipped:       ${results.skipped} (already exist)`);
  console.log(`❌ Failed:        ${results.failed}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.forEach(({ row, email, errors }) => {
      console.log(`Row ${row} (${email}):`);
      errors.forEach(err => console.log(`  - ${err}`));
    });
  }

  // Save report
  const reportPath = path.join(__dirname, '../dominion_doc/IMPORT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run import
importStaff().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
```

---

### STEP 2: Create Validation Pre-Flight Script

**File:** `scripts/validateImport.mjs` (NEW)

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record = {};
    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim() || '';
    });
    records.push(record);
  }

  return records;
}

console.log('🔍 Validating CSV before import...\n');

const csvPath = path.join(__dirname, '../dominion_doc/DHCS_CLEANED.csv');
const records = parseCSV(csvPath);

console.log(`📁 Found ${records.length} records\n`);

// Check for required fields
const requiredFields = ['first_name', 'last_name', 'email', 'phone'];
const missing = records.filter(r => {
  return requiredFields.some(field => !r[field]);
});

if (missing.length > 0) {
  console.log(`❌ ${missing.length} records missing required fields`);
  missing.forEach((r, i) => {
    console.log(`  Row ${i + 2}: ${r.email || 'NO EMAIL'}`);
  });
} else {
  console.log(`✅ All records have required fields`);
}

// Check for duplicate emails
const emails = records.map(r => r.email.toLowerCase());
const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);

if (duplicates.length > 0) {
  console.log(`\n⚠️  ${duplicates.length} duplicate emails found:`);
  duplicates.forEach(email => console.log(`  - ${email}`));
} else {
  console.log(`\n✅ No duplicate emails`);
}

// Check NI number format
const invalidNI = records.filter(r => {
  return r.national_insurance && !/^[A-Z]{2}\d{6}[A-Z]$/i.test(r.national_insurance);
});

if (invalidNI.length > 0) {
  console.log(`\n⚠️  ${invalidNI.length} invalid NI numbers:`);
  invalidNI.forEach(r => console.log(`  - ${r.email}: ${r.national_insurance}`));
} else {
  console.log(`\n✅ All NI numbers valid format`);
}

// Check phone format
const invalidPhone = records.filter(r => {
  return r.phone && !r.phone.match(/^(\+44|0)?7\d{9}$/);
});

if (invalidPhone.length > 0) {
  console.log(`\n⚠️  ${invalidPhone.length} phones need normalization:`);
  invalidPhone.forEach(r => console.log(`  - ${r.email}: ${r.phone}`));
} else {
  console.log(`\n✅ All phone numbers valid format`);
}

console.log('\n✅ Pre-flight validation complete!\n');
```

---

### STEP 3: Run Validation

```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
node scripts/validateImport.mjs
```

---

### STEP 4: Run Import

**Set environment variable first:**
```bash
# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_JWT_TOKEN"

# Run import
node scripts/importDominionStaff.mjs
```

---

## ✅ Validation Checklist

### Pre-Import
- [ ] CSV file exists and readable
- [ ] All records have required fields (first_name, last_name, email)
- [ ] No duplicate emails in CSV
- [ ] Phone numbers in valid UK format
- [ ] NI numbers match AB123456C pattern
- [ ] Sort codes match XX-XX-XX pattern
- [ ] Account numbers are 8 digits

### Post-Import
- [ ] All 45 records imported or skipped (not failed)
- [ ] Check database: `SELECT COUNT(*) FROM staff WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'`
- [ ] All records have status = 'onboarding'
- [ ] All records have profile_update_source = 'csv_import'
- [ ] Bank details stored as JSONB
- [ ] Emergency contacts stored as JSONB
- [ ] Skills stored as JSONB array

### Test Sample Records
```sql
-- Check first imported record
SELECT
  full_name,
  email,
  phone,
  status,
  ni_number,
  bank_details,
  emergency_contact,
  profile_update_source
FROM staff
WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'
ORDER BY created_date DESC
LIMIT 1;
```

---

## 🔄 Rollback

```sql
-- Delete all imported staff (if needed)
DELETE FROM staff
WHERE agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'
  AND profile_update_source = 'csv_import'
  AND created_date > '2025-12-17'; -- Today's date
```

---

## 📊 Import Report

After import, check `dominion_doc/IMPORT_REPORT.json`:

```json
{
  "total": 45,
  "imported": 45,
  "skipped": 0,
  "failed": 0,
  "errors": []
}
```

---

## 🎯 Success Criteria

✅ All 45 Dominion staff imported
✅ No validation errors
✅ All emails unique
✅ Bank details correctly formatted
✅ Emergency contacts populated
✅ All records status = 'onboarding'
✅ Ready for admin to review and send invites

**MODULE 25 COMPLETE! Dominion staff ready for onboarding.**
