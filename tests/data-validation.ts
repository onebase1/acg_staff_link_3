import { SupabaseTestClient } from './helpers/supabase-queries';
import { TEST_CONFIG } from './test-config';

export async function validateDominionData() {
  const db = new SupabaseTestClient();
  
  console.log('\n📊 Starting Data Validation...');
  
  // Authenticate first
  await db.authenticate();
  console.log('✓ Authenticated');
  
  // 1. Check seeded data exists
  console.log('\n1️⃣  Checking Agency Data...');
  const agency = await db.getAgency(TEST_CONFIG.dominion.agency_name);
  
  const results = {
    agency: {
      name: agency.name,
      staff_count: agency.staff_count,
      clients_count: agency.clients_count,
      shifts_count: agency.shifts_count
    },
    pageData: {} as Record<string, number>,
    integrity: {
      missing_columns: [] as any[],
      orphaned_records: [] as any[],
      invalid_references: [] as any[]
    },
    assertions: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  console.log(`   Agency: ${agency.name}`);
  console.log(`   Staff: ${agency.staff_count}`);
  console.log(`   Clients: ${agency.clients_count}`);
  console.log(`   Shifts: ${agency.shifts_count}`);
  
  // Assertions
  if (agency.staff_count >= 10) {
    console.log('   ✓ Staff count meets expectation (10+)');
    results.assertions.passed++;
  } else {
    console.log(`   ⚠ Staff count low: expected 10+, got ${agency.staff_count}`);
    results.assertions.warnings++;
  }
  
  if (agency.clients_count >= 6) {
    console.log('   ✓ Clients count meets expectation (6+)');
    results.assertions.passed++;
  } else {
    console.log(`   ⚠ Clients count low: expected 6+, got ${agency.clients_count}`);
    results.assertions.warnings++;
  }
  
  if (agency.shifts_count >= 15) {
    console.log('   ✓ Shifts count meets expectation (15+)');
    results.assertions.passed++;
  } else {
    console.log(`   ⚠ Shifts count low: expected 15+, got ${agency.shifts_count}`);
    results.assertions.warnings++;
  }
  
  // 2. Validate data integrity
  console.log('\n2️⃣  Checking Data Integrity...');
  const integrity = await db.checkDataIntegrity();
  results.integrity = integrity;
  
  if (integrity.missing_columns.length === 0) {
    console.log('   ✓ No missing columns (no PGRST204 errors)');
    results.assertions.passed++;
  } else {
    console.log(`   ✗ Missing columns detected: ${integrity.missing_columns.length}`);
    results.assertions.failed++;
    integrity.missing_columns.forEach(col => {
      console.log(`     - ${col.table}.${col.column}`);
    });
  }
  
  if (integrity.orphaned_records.length === 0) {
    console.log('   ✓ No orphaned records');
    results.assertions.passed++;
  } else {
    console.log(`   ⚠ Orphaned records found: ${integrity.orphaned_records.length}`);
    results.assertions.warnings++;
    integrity.orphaned_records.slice(0, 3).forEach(record => {
      console.log(`     - ${record.table} ${record.id}: ${record.issue}`);
    });
  }
  
  // 3. Check all required pages have data
  console.log('\n3️⃣  Checking Page Data Availability...');
  
  const agencyId = await db.getAgencyId(TEST_CONFIG.dominion.agency_name);
  
  const tables = [
    'staff',
    'clients',
    'shifts',
    'bookings',
    'timesheets',
    'invoices',
    'payslips',
    'compliance_documents',
    'groups',
    'admin_workflows'
  ];
  
  for (const table of tables) {
    try {
      // Filter by agency_id for multi-tenant tables (RLS may block unfiltered queries)
      const response = await db.getClient()
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);
      const { count, error } = response;
      
      // Some errors have empty messages - if we got a count, treat as success
      if (error && error.message && count === null) {
        const errorMsg = error.message || JSON.stringify(error) || 'Unknown error';
        console.log(`   ✗ ${table}: Error - ${errorMsg}`);
        results.assertions.failed++;
        continue;
      }
      
      // Handle null count as 0
      const recordCount = count ?? 0;
      results.pageData[table] = recordCount;
      
      if (recordCount > 0) {
        console.log(`   ✓ ${table}: ${recordCount} records`);
        results.assertions.passed++;
      } else {
        console.log(`   ⚠ ${table}: No data found`);
        results.assertions.warnings++;
      }
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error) || 'Unknown error';
      console.log(`   ✗ ${table}: Error - ${errorMsg}`);
      results.assertions.failed++;
    }
  }
  
  // Summary
  console.log('\n📊 Data Validation Summary:');
  console.log(`   ✓ Passed: ${results.assertions.passed}`);
  console.log(`   ⚠ Warnings: ${results.assertions.warnings}`);
  console.log(`   ✗ Failed: ${results.assertions.failed}`);
  
  if (results.assertions.failed > 0) {
    throw new Error(`Data validation failed with ${results.assertions.failed} failures`);
  }
  
  return results;
}

// Allow running standalone - executed when run directly via tsx
// validateDominionData() is called by run-all-tests.ts when imported
// When run standalone: tsx tests/data-validation.ts
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  validateDominionData()
    .then(() => {
      console.log('\n✅ Data validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data validation failed:', error.message);
      process.exit(1);
    });
}

