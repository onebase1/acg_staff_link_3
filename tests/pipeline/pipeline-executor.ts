import { TestDefinition, Pipeline, TestResult, PipelineResult, SuiteResult, TestContext } from './types';
import { getTestFunction, isTestImplemented } from './test-registry';

export class PipelineExecutor {
  private verbose: boolean;
  private stopOnError: boolean;
  
  constructor(options: { verbose?: boolean; stopOnError?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.stopOnError = options.stopOnError !== false; // Default true
  }
  
  /**
   * Run a single test
   */
  private async runTest(
    test: TestDefinition,
    context: TestContext
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      if (!isTestImplemented(test.testId)) {
        throw new Error(`Test ${test.testId} not implemented`);
      }
      
      const testFn = getTestFunction(test.testId);
      const result = await testFn(context);
      
      return {
        ...result,
        duration: result.duration || (Date.now() - startTime) / 1000
      };
    } catch (error: any) {
      return {
        testId: test.testId,
        action: test.action,
        passed: false,
        duration: (Date.now() - startTime) / 1000,
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Run a single pipeline with fail-fast logic
   */
  async runPipeline(
    pipeline: Pipeline,
    context: TestContext
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    if (this.verbose) {
      console.log(`\n🔄 Running pipeline: ${pipeline.name} (${pipeline.totalTests} tests)`);
    }
    
    for (const test of pipeline.tests) {
      if (this.verbose) {
        console.log(`  ⏳ ${test.testId}: ${test.action}...`);
      }
      
      const result = await this.runTest(test, context);
      results.push(result);
      
      if (this.verbose) {
        if (result.passed) {
          console.log(`  ✅ ${test.testId}: PASSED (${result.duration.toFixed(2)}s)`);
        } else {
          console.log(`  ❌ ${test.testId}: FAILED`);
          console.log(`     Error: ${result.error}`);
        }
      }
      
      // FAIL FAST - stop pipeline immediately on failure
      if (!result.passed && this.stopOnError) {
        const duration = (Date.now() - startTime) / 1000;
        return {
          pipeline: pipeline.name,
          status: 'FAILED',
          passed: results.filter(r => r.passed).length,
          total: pipeline.totalTests,
          duration,
          failedAt: test.testId,
          results
        };
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    const passed = results.filter(r => r.passed).length;
    
    return {
      pipeline: pipeline.name,
      status: passed === pipeline.totalTests ? 'PASSED' : 'FAILED',
      passed,
      total: pipeline.totalTests,
      duration,
      failedAt: passed < pipeline.totalTests ? results.find(r => !r.passed)?.testId : undefined,
      results
    };
  }
  
  /**
   * Run all pipelines sequentially
   */
  async runAllPipelines(
    pipelines: Pipeline[],
    options: {
      skipPipelines?: string[];
      onlyPipeline?: string;
      stopAt?: string;
    } = {}
  ): Promise<SuiteResult> {
    const startTime = Date.now();
    const pipelineResults: PipelineResult[] = [];
    let shouldStop = false;
    
    // Filter pipelines
    let pipelinesToRun = pipelines;
    if (options.onlyPipeline) {
      pipelinesToRun = pipelines.filter(p => p.name === options.onlyPipeline);
      if (pipelinesToRun.length === 0) {
        throw new Error(`Pipeline "${options.onlyPipeline}" not found`);
      }
    }
    if (options.skipPipelines) {
      pipelinesToRun = pipelinesToRun.filter(p => !options.skipPipelines!.includes(p.name));
    }
    
    // Create shared context for all tests
    const context = new TestContext();
    await context.authenticate();
    
    try {
      for (const pipeline of pipelinesToRun) {
        if (shouldStop) {
          // Skip remaining pipelines
          pipelineResults.push({
            pipeline: pipeline.name,
            status: 'SKIPPED',
            passed: 0,
            total: pipeline.totalTests,
            duration: 0,
            results: []
          });
          continue;
        }
        
        const result = await this.runPipeline(pipeline, context);
        pipelineResults.push(result);
        
        // Check if we should stop at a specific test
        if (options.stopAt) {
          const foundTest = result.results.find(r => r.testId === options.stopAt);
          if (foundTest) {
            shouldStop = true;
          }
        }
        
        // Stop on first pipeline failure (optional)
        if (result.status === 'FAILED' && this.stopOnError) {
          shouldStop = true;
        }
      }
    } finally {
      // Cleanup resources
      await context.cleanup();
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Calculate summary
    const summary = {
      totalTests: pipelineResults.reduce((sum, p) => sum + p.total, 0),
      passed: pipelineResults.reduce((sum, p) => sum + p.passed, 0),
      failed: pipelineResults.reduce((sum, p) => sum + (p.results.filter(r => !r.passed).length), 0),
      skipped: pipelineResults.reduce((sum, p) => {
        if (p.status === 'SKIPPED') return sum + p.total;
        return sum + (p.total - p.results.length);
      }, 0)
    };
    
    const allPassed = pipelineResults.every(p => p.status === 'PASSED' || p.status === 'SKIPPED');
    
    return {
      timestamp: new Date().toISOString(),
      duration,
      status: allPassed && summary.failed === 0 ? 'PASSED' : 'FAILED',
      pipelines: pipelineResults,
      summary
    };
  }
}





