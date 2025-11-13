import * as fs from 'fs';
import * as path from 'path';
import { SuiteResult, PipelineResult, TestResult } from './types';

export class Reporter {
  /**
   * Print console output with colors and formatting
   */
  printConsole(result: SuiteResult): void {
    console.log('\n🚀 Pipeline Test Suite - Critical Path Validation');
    console.log('═'.repeat(60));
    console.log('');
    
    // Print each pipeline
    result.pipelines.forEach((pipeline, idx) => {
      console.log(`Pipeline ${idx + 1}/${result.pipelines.length}: ${pipeline.pipeline}`);
      
      if (pipeline.status === 'SKIPPED') {
        console.log(`  ⏭️  Skipped (previous pipeline failed)`);
      } else {
        // Print each test
        pipeline.results.forEach(test => {
          if (test.passed) {
            console.log(`  ✅ ${test.testId}: ${test.action} (${test.duration.toFixed(2)}s)`);
            if (test.details) {
              const detailStr = JSON.stringify(test.details);
              if (detailStr.length < 100) {
                console.log(`     Details: ${detailStr}`);
              }
            }
          } else {
            console.log(`  ❌ ${test.testId}: ${test.action} FAILED`);
            console.log(`     Error: ${test.error}`);
          }
        });
        
        // Print skipped tests
        const skippedCount = pipeline.total - pipeline.results.length;
        if (skippedCount > 0) {
          console.log(`  ⏭️  ${skippedCount} tests skipped (fail fast)`);
        }
        
        // Pipeline summary
        if (pipeline.status === 'PASSED') {
          console.log(`  ✅ Pipeline ${idx + 1}: PASSED (${pipeline.passed}/${pipeline.total} tests in ${pipeline.duration.toFixed(1)}s)`);
        } else {
          console.log(`  ❌ Pipeline ${idx + 1}: FAILED (${pipeline.passed}/${pipeline.total} tests)`);
          if (pipeline.failedAt) {
            console.log(`     Failed at: ${pipeline.failedAt}`);
          }
        }
      }
      console.log('');
    });
    
    console.log('═'.repeat(60));
    console.log(`PIPELINE SUITE RESULT: ${result.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');
    console.log('Pipelines Summary:');
    result.pipelines.forEach(p => {
      const icon = p.status === 'PASSED' ? '✅' : p.status === 'SKIPPED' ? '⏭️' : '❌';
      const percentage = p.total > 0 ? ((p.passed / p.total) * 100).toFixed(0) : '0';
      console.log(`  ${icon} ${p.pipeline}: ${p.passed}/${p.total} (${percentage}%)`);
    });
    
    console.log('');
    console.log(`Overall: ${result.summary.passed}/${result.summary.totalTests} tests passed (${((result.summary.passed / result.summary.totalTests) * 100).toFixed(0)}%)`);
    
    if (result.status === 'FAILED') {
      console.log('');
      console.log('⚠️  SYSTEM NOT PRODUCTION READY');
      
      // Find first failure
      for (const pipeline of result.pipelines) {
        const failedTest = pipeline.results.find(t => !t.passed);
        if (failedTest) {
          console.log(`Critical failure detected in ${pipeline.pipeline} (${failedTest.testId})`);
          console.log('');
          console.log(`Failure Impact: Check CSV for ${failedTest.testId} failure impact`);
          console.log(`Fix Required: Implement/verify ${failedTest.action}`);
          break;
        }
      }
    } else {
      console.log('');
      console.log('🎉 ALL TESTS PASSED - SYSTEM PRODUCTION READY');
    }
    
    console.log('═'.repeat(60));
  }
  
  /**
   * Generate JSON report
   */
  async generateJSON(result: SuiteResult): Promise<void> {
    const reportPath = path.join(process.cwd(), 'PIPELINE_TEST_REPORT.json');
    const json = JSON.stringify(result, null, 2);
    fs.writeFileSync(reportPath, json, 'utf-8');
    console.log(`\n📄 JSON report saved: ${reportPath}`);
  }
  
  /**
   * Generate Markdown report
   */
  async generateMarkdown(result: SuiteResult): Promise<void> {
    const reportPath = path.join(process.cwd(), 'PIPELINE_TEST_REPORT.md');
    
    let md = `# Pipeline Test Suite Report\n\n`;
    md += `**Generated**: ${new Date(result.timestamp).toLocaleString()}  \n`;
    md += `**Duration**: ${result.duration.toFixed(1)}s  \n`;
    md += `**Status**: ${result.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}  \n\n`;
    
    md += `## Executive Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${result.summary.totalTests} |\n`;
    md += `| ✅ Passed | ${result.summary.passed} |\n`;
    md += `| ❌ Failed | ${result.summary.failed} |\n`;
    md += `| ⏭️  Skipped | ${result.summary.skipped} |\n`;
    md += `| Success Rate | ${((result.summary.passed / result.summary.totalTests) * 100).toFixed(1)}% |\n\n`;
    
    md += `## Pipeline Results\n\n`;
    
    result.pipelines.forEach((pipeline, idx) => {
      const icon = pipeline.status === 'PASSED' ? '✅' : pipeline.status === 'SKIPPED' ? '⏭️' : '❌';
      md += `### ${idx + 1}. ${icon} ${pipeline.pipeline}\n\n`;
      md += `**Status**: ${pipeline.status}  \n`;
      md += `**Tests Passed**: ${pipeline.passed}/${pipeline.total}  \n`;
      md += `**Duration**: ${pipeline.duration.toFixed(1)}s  \n`;
      
      if (pipeline.failedAt) {
        md += `**Failed At**: ${pipeline.failedAt}  \n`;
      }
      
      md += `\n#### Test Results\n\n`;
      md += `| Test ID | Action | Status | Duration |\n`;
      md += `|---------|--------|--------|----------|\n`;
      
      pipeline.results.forEach(test => {
        const status = test.passed ? '✅ PASS' : '❌ FAIL';
        md += `| ${test.testId} | ${test.action} | ${status} | ${test.duration.toFixed(2)}s |\n`;
      });
      
      if (pipeline.status === 'FAILED' || pipeline.status === 'SKIPPED') {
        const failedTest = pipeline.results.find(t => !t.passed);
        if (failedTest) {
          md += `\n**Error**: ${failedTest.error}\n`;
        }
      }
      
      md += `\n`;
    });
    
    md += `## Verdict\n\n`;
    if (result.status === 'PASSED') {
      md += `✅ **SYSTEM PRODUCTION READY**\n\n`;
      md += `All 6 pipelines passed all tests. The system is fully validated and ready for production deployment.\n`;
    } else {
      md += `❌ **SYSTEM NOT PRODUCTION READY**\n\n`;
      md += `One or more pipelines failed. Review the failures above and implement fixes before deploying to production.\n\n`;
      
      md += `### Action Items\n\n`;
      result.pipelines.forEach(pipeline => {
        const failedTest = pipeline.results.find(t => !t.passed);
        if (failedTest) {
          md += `- **${pipeline.pipeline}**: Fix ${failedTest.testId} - ${failedTest.action}\n`;
          md += `  - Error: ${failedTest.error}\n`;
        }
      });
    }
    
    fs.writeFileSync(reportPath, md, 'utf-8');
    console.log(`📄 Markdown report saved: ${reportPath}`);
  }
  
  /**
   * Generate all reports
   */
  async generateAll(result: SuiteResult): Promise<void> {
    this.printConsole(result);
    await this.generateJSON(result);
    await this.generateMarkdown(result);
  }
}





