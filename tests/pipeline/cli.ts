#!/usr/bin/env node

import { CSVParser } from './csv-parser';
import { PipelineExecutor } from './pipeline-executor';
import { Reporter } from './reporter';

interface CLIOptions {
  pipeline?: string;
  stopAt?: string;
  skip?: string[];
  verbose?: boolean;
  ci?: boolean;
  continueOnError?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    skip: [],
    verbose: false,
    ci: false,
    continueOnError: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--pipeline' && i + 1 < args.length) {
      options.pipeline = args[++i];
    } else if (arg === '--stop-at' && i + 1 < args.length) {
      options.stopAt = args[++i];
    } else if (arg === '--skip' && i + 1 < args.length) {
      options.skip = args[++i].split(',');
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--continue-on-error' || arg === '--no-fail-fast') {
      options.continueOnError = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Pipeline Test Suite - Critical Path Validation

Usage:
  npm run test:pipelines [options]

Options:
  --pipeline <name>         Run specific pipeline only
                           Example: --pipeline "Shift Journey Pipeline"
  
  --stop-at <test-id>      Stop after specific test
                           Example: --stop-at sj-010
  
  --skip <test-ids>        Skip specific tests (comma-separated)
                           Example: --skip sj-001,auto-002
  
  --continue-on-error      Continue running tests even if some fail
  --no-fail-fast           (alias for --continue-on-error)
  
  --verbose, -v            Print detailed test execution logs
  
  --ci                     CI mode (strict error handling)
  
  --help, -h               Show this help message

Examples:
  # Run all pipelines
  npm run test:pipelines

  # Run only Shift Journey pipeline
  npm run test:pipelines -- --pipeline="Shift Journey Pipeline"

  # Run with verbose output
  npm run test:pipelines -- --verbose

  # Continue on error (show all failures)
  npm run test:pipelines -- --continue-on-error

  # Stop at specific test
  npm run test:pipelines -- --stop-at=sj-010

Pipeline-specific shortcuts:
  npm run test:pipeline:shift-journey
  npm run test:pipeline:automation
  npm run test:pipeline:financial
  npm run test:pipeline:communication
  npm run test:pipeline:analytics
  npm run test:pipeline:integrations
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const options = parseArgs();
  
  try {
    console.log('🔧 Initializing Pipeline Test Suite...\n');
    
    // Parse CSV
    const parser = new CSVParser();
    const pipelines = parser.parse();
    
    console.log(`📋 Loaded ${pipelines.length} pipelines with ${pipelines.reduce((sum, p) => sum + p.totalTests, 0)} total tests\n`);
    
    if (options.verbose) {
      pipelines.forEach(p => {
        console.log(`  - ${p.name}: ${p.totalTests} tests`);
      });
      console.log('');
    }
    
    // Execute tests
    const executor = new PipelineExecutor({
      verbose: options.verbose,
      stopOnError: !options.continueOnError
    });
    
    const result = await executor.runAllPipelines(pipelines, {
      onlyPipeline: options.pipeline,
      stopAt: options.stopAt,
      skipPipelines: options.skip
    });
    
    // Generate reports
    const reporter = new Reporter();
    await reporter.generateAll(result);
    
    // Exit with appropriate code
    if (result.status === 'FAILED') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ Pipeline test suite crashed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run CLI
main();

