import { validateDominionData } from './data-validation';
import { testShiftJourneyComplete, testShiftCancellation } from './shift-journey';
import { testPreShiftReminders, testPostShiftReminders, testReminderEngine } from './notifications';
import { testDashboardAnalytics } from './analytics';
import { generateReport } from './generate-report';

interface TestResults {
  timestamp: string;
  duration: number;
  tests: {
    ui: any;
    data: any;
    shiftJourney: any;
    notifications: any;
    analytics: any;
  };
  issues: Array<{
    category: string;
    severity: string;
    title?: string;
    error?: any;
    details?: any;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

async function runAllTests(): Promise<TestResults> {
  const results: TestResults = {
    timestamp: new Date().toISOString(),
    duration: 0,
    tests: {
      ui: null,
      data: null,
      shiftJourney: null,
      notifications: null,
      analytics: null
    },
    issues: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  const startTime = Date.now();
  
  console.log('🚀 Starting Hybrid Test Suite for Dominion Agency Admin');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Test Strategy:');
  console.log('  - Data Validation: Direct DB queries (fast)');
  console.log('  - Shift Journey: API + DB validation (medium)');
  console.log('  - Notifications: Edge Function invocation (critical)');
  console.log('  - Analytics: DB stats calculation (fast)');
  console.log('  - UI Tests: Playwright for critical flows (slower)');
  console.log('');
  console.log('═'.repeat(60));
  
  // 1. Data Validation (Fast - 10 seconds)
  console.log('\n📊 [1/5] Data Validation...');
  try {
    results.tests.data = await validateDominionData();
    console.log('✅ Data validation passed');
    results.summary.passed++;
  } catch (error: any) {
    console.log('❌ Data validation failed:', error.message);
    results.issues.push({ 
      category: 'Data', 
      severity: 'High', 
      error: { message: error.message } 
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // 2. Shift Journey (Medium - 30 seconds)
  console.log('\n🔄 [2/5] Shift Journey Tests...');
  try {
    const complete = await testShiftJourneyComplete();
    const cancel = await testShiftCancellation();
    results.tests.shiftJourney = { complete, cancel };
    console.log('✅ Shift journey tests passed');
    results.summary.passed++;
  } catch (error: any) {
    console.log('❌ Shift journey failed:', error.message);
    results.issues.push({ 
      category: 'ShiftJourney', 
      severity: 'High', 
      error: { message: error.message } 
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // 3. Notifications (CRITICAL - 45 seconds)
  console.log('\n📧 [3/5] Notification System Tests...');
  try {
    const preShift = await testPreShiftReminders();
    const postShift = await testPostShiftReminders();
    const engine = await testReminderEngine();
    
    results.tests.notifications = { preShift, postShift, engine };
    
    // Check for CRITICAL issue
    if (postShift.CRITICAL_ISSUE) {
      console.log('🚨 CRITICAL: Post-shift reminders BROKEN (same as Base44)');
      results.issues.push({
        category: 'Notifications',
        severity: 'CRITICAL',
        title: 'Post-Shift Timesheet Reminders Not Working',
        details: postShift
      });
      results.summary.warnings++;
    } else {
      console.log('✅ Post-shift reminders FIXED from Base44!');
      results.summary.passed++;
    }
  } catch (error: any) {
    console.log('❌ Notification tests failed:', error.message);
    results.issues.push({ 
      category: 'Notifications', 
      severity: 'Critical', 
      error: { message: error.message } 
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // 4. Analytics (Fast - 20 seconds)
  console.log('\n📈 [4/5] Analytics Validation...');
  try {
    results.tests.analytics = await testDashboardAnalytics();
    console.log('✅ Analytics tests passed');
    results.summary.passed++;
  } catch (error: any) {
    console.log('❌ Analytics failed:', error.message);
    results.issues.push({ 
      category: 'Analytics', 
      severity: 'Medium', 
      error: { message: error.message } 
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // 5. UI Critical Flows (Slow - 3 minutes)
  console.log('\n🎭 [5/5] Playwright UI Tests...');
  console.log('⚠️  Note: UI tests run separately for isolation');
  console.log('   To run UI tests: npm run test:ui');
  
  // Skip UI tests in hybrid run to avoid conflicts
  // They should be run separately with: npm run test:ui
  results.tests.ui = {
    skipped: true,
    reason: 'UI tests run separately via Playwright CLI',
    command: 'npm run test:ui'
  };
  console.log('⏭️  Skipped (run separately with: npm run test:ui)');
  results.summary.total++;
  
  results.duration = (Date.now() - startTime) / 1000;
  
  // Generate report
  console.log('\n📝 Generating report...');
  await generateReport(results);
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Tests completed in ${results.duration.toFixed(1)}s`);
  console.log(`📊 Results: ${results.summary.passed}/${results.summary.total} passed`);
  
  if (results.summary.warnings > 0) {
    console.log(`⚠️  ${results.summary.warnings} warnings`);
  }
  if (results.summary.failed > 0) {
    console.log(`❌ ${results.summary.failed} failed`);
  }
  
  console.log(`📄 Report: TEST_REPORT.md`);
  console.log('═'.repeat(60));
  
  // Print critical issues
  const criticalIssues = results.issues.filter(i => 
    i.severity === 'CRITICAL' || i.severity === 'Critical'
  );
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:\n');
    criticalIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.title || issue.category}`);
      if (issue.details?.message) {
        console.log(`   ${issue.details.message}`);
      }
    });
    console.log('');
  }
  
  return results;
}

// Run if executed directly
runAllTests()
  .then((results) => {
    const hasCritical = results.issues.some(i => 
      i.severity === 'CRITICAL' || i.severity === 'Critical'
    );
    
    if (hasCritical || results.summary.failed > 0) {
      console.log('\n⚠️  Tests completed with issues');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test suite crashed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

export { runAllTests };

