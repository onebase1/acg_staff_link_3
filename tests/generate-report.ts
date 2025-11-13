import * as fs from 'fs';
import * as path from 'path';

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

export async function generateReport(results: TestResults) {
  const reportPath = path.join(process.cwd(), 'TEST_REPORT.md');
  
  let report = `# Dominion Agency Test Report

Generated: ${new Date(results.timestamp).toLocaleString()}  
Duration: ${results.duration.toFixed(2)}s

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${results.summary.total} |
| ✅ Passed | ${results.summary.passed} |
| ⚠️  Warnings | ${results.summary.warnings} |
| ❌ Failed | ${results.summary.failed} |
| Success Rate | ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}% |

`;

  // Critical Issues Section
  if (results.issues.length > 0) {
    report += `## 🚨 Issues Found

`;
    
    const critical = results.issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'Critical');
    const high = results.issues.filter(i => i.severity === 'HIGH' || i.severity === 'High');
    const medium = results.issues.filter(i => i.severity === 'MEDIUM' || i.severity === 'Medium');
    
    if (critical.length > 0) {
      report += `### 🔴 Critical Issues (${critical.length})

`;
      critical.forEach((issue, idx) => {
        report += `#### ${idx + 1}. ${issue.title || issue.category}

- **Category**: ${issue.category}
- **Severity**: CRITICAL
`;
        if (issue.details) {
          report += `- **Details**: ${JSON.stringify(issue.details, null, 2)}\n`;
        }
        if (issue.error) {
          report += `- **Error**: ${issue.error.message || issue.error}\n`;
        }
        report += '\n';
      });
    }
    
    if (high.length > 0) {
      report += `### 🟠 High Priority Issues (${high.length})

`;
      high.forEach((issue, idx) => {
        report += `${idx + 1}. **${issue.category}**: ${issue.error?.message || 'See details'}\n`;
      });
      report += '\n';
    }
    
    if (medium.length > 0) {
      report += `### 🟡 Medium Priority Issues (${medium.length})

`;
      medium.forEach((issue, idx) => {
        report += `${idx + 1}. **${issue.category}**: ${issue.error?.message || 'See details'}\n`;
      });
      report += '\n';
    }
  } else {
    report += `## ✅ No Issues Found

All tests passed without critical errors!

`;
  }

  // Data Validation Results
  if (results.tests.data) {
    report += `## 📊 Data Validation

### Agency Data
- **Name**: ${results.tests.data.agency?.name || 'N/A'}
- **Staff**: ${results.tests.data.agency?.staff_count || 0}
- **Clients**: ${results.tests.data.agency?.clients_count || 0}
- **Shifts**: ${results.tests.data.agency?.shifts_count || 0}

### Page Data Availability
`;
    if (results.tests.data.pageData) {
      Object.entries(results.tests.data.pageData).forEach(([table, count]) => {
        report += `- **${table}**: ${count} records\n`;
      });
    }
    
    report += '\n### Data Integrity\n';
    if (results.tests.data.integrity) {
      report += `- Missing Columns: ${results.tests.data.integrity.missing_columns?.length || 0}\n`;
      report += `- Orphaned Records: ${results.tests.data.integrity.orphaned_records?.length || 0}\n`;
    }
    report += '\n';
  }

  // Shift Journey Results
  if (results.tests.shiftJourney) {
    report += `## 🔄 Shift Journey Tests

### Complete Journey Test
`;
    if (results.tests.shiftJourney.complete) {
      const journey = results.tests.shiftJourney.complete;
      report += `- **Shift ID**: ${journey.shift?.id || 'N/A'}\n`;
      report += `- **Journey States**: ${journey.log?.states?.join(' → ') || 'N/A'}\n`;
      report += `- **Invoices Generated**: ${journey.invoices?.length || 0}\n`;
    }
    
    report += '\n### Cancellation Test\n';
    if (results.tests.shiftJourney.cancel) {
      const cancel = results.tests.shiftJourney.cancel;
      report += `- **Shift ID**: ${cancel.shift?.id || 'N/A'}\n`;
      report += `- **Status**: ${cancel.shift?.status || 'N/A'}\n`;
      report += `- **Change Logs**: ${cancel.changeLogs?.length || 0}\n`;
      report += `- **Notifications**: ${cancel.notifications?.length || 0}\n`;
    }
    report += '\n';
  }

  // Notification System Results
  if (results.tests.notifications) {
    report += `## 📧 Notification System

### Pre-Shift Reminders
`;
    if (results.tests.notifications.preShift) {
      const pre = results.tests.notifications.preShift;
      report += `- **24h Reminder**:\n`;
      report += `  - SMS: ${pre.reminder24h?.sms ? '✅' : '❌'}\n`;
      report += `  - WhatsApp: ${pre.reminder24h?.whatsapp ? '✅' : '❌'}\n`;
      report += `  - Email: ${pre.reminder24h?.email ? '✅' : '❌'}\n`;
      report += `- **2h Reminder**:\n`;
      report += `  - SMS: ${pre.reminder2h?.sms ? '✅' : '❌'}\n`;
      report += `  - WhatsApp: ${pre.reminder2h?.whatsapp ? '✅' : '❌'}\n`;
    }
    
    report += '\n### Post-Shift Reminders (CRITICAL)\n';
    if (results.tests.notifications.postShift) {
      const post = results.tests.notifications.postShift;
      
      if (post.CRITICAL_ISSUE) {
        report += `\n⚠️ **CRITICAL ISSUE**: ${post.CRITICAL_ISSUE}\n\n`;
        report += `**Message**: ${post.message}\n\n`;
        report += `**Status**: Same issue as Base44 - Post-shift reminders not working\n\n`;
      } else {
        report += `✅ **Post-shift reminders WORKING** (Fixed from Base44!)\n\n`;
        report += `- SMS: ${post.reminder?.sms ? '✅' : '❌'}\n`;
        report += `- WhatsApp: ${post.reminder?.whatsapp ? '✅' : '❌'}\n`;
        report += `- Email: ${post.reminder?.email ? '✅' : '❌'}\n`;
      }
    }
    
    if (results.tests.notifications.engine) {
      report += '\n### Reminder Engine\n';
      const engine = results.tests.notifications.engine;
      report += `- **Status**: ${engine.status || 'unknown'}\n`;
      report += `- **Cron Schedule**: ${engine.cron_schedule || 'N/A'}\n`;
      report += `- **Last Run**: ${engine.last_run || 'Unknown'}\n`;
    }
    report += '\n';
  }

  // Analytics Results
  if (results.tests.analytics) {
    report += `## 📈 Analytics Validation

### Before Test
`;
    const analytics = results.tests.analytics;
    if (analytics.before) {
      report += `- Total Shifts: ${analytics.before.total_shifts}\n`;
      report += `- Open Shifts: ${analytics.before.open_shifts}\n`;
      report += `- Completed Shifts: ${analytics.before.completed_shifts}\n`;
      report += `- Revenue: £${analytics.before.revenue?.toFixed(2) || '0.00'}\n`;
    }
    
    report += '\n### After Test\n';
    if (analytics.after4) {
      report += `- Total Shifts: ${analytics.after4.total_shifts}\n`;
      report += `- Open Shifts: ${analytics.after4.open_shifts}\n`;
      report += `- Completed Shifts: ${analytics.after4.completed_shifts}\n`;
      report += `- Revenue: £${analytics.after4.revenue?.toFixed(2) || '0.00'}\n`;
    }
    
    if (analytics.before && analytics.after4) {
      const revChange = (analytics.after4.revenue || 0) - (analytics.before.revenue || 0);
      report += `\n### Changes\n`;
      report += `- Revenue Change: £${revChange.toFixed(2)}\n`;
    }
    report += '\n';
  }

  // UI Tests
  if (results.tests.ui) {
    report += `## 🎭 UI Tests

Playwright tests executed. See Playwright report for detailed results.

`;
  }

  // Recommendations
  report += `## 💡 Recommendations

`;
  
  if (results.issues.some(i => i.category === 'Notifications' && i.severity === 'CRITICAL')) {
    report += `1. **URGENT**: Fix post-shift timesheet reminders - currently not working (same as Base44)\n`;
  }
  
  if (results.summary.warnings > 0) {
    report += `2. Review ${results.summary.warnings} warnings for potential improvements\n`;
  }
  
  if (results.tests.data?.integrity?.orphaned_records?.length > 0) {
    report += `3. Clean up ${results.tests.data.integrity.orphaned_records.length} orphaned records in database\n`;
  }
  
  report += `\n---\n\n*Report generated by Hybrid Test Suite*\n`;

  // Write report to file
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return reportPath;
}





