import * as fs from 'fs';
import * as path from 'path';
import { TestDefinition, Pipeline } from './types';

export class CSVParser {
  private csvPath: string;
  
  constructor(csvPath?: string) {
    this.csvPath = csvPath || path.join(process.cwd(), 'critical_path_testing_matrix.csv');
  }
  
  /**
   * Parse CSV file into structured test definitions
   */
  parse(): Pipeline[] {
    const content = fs.readFileSync(this.csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse header
    const header = this.parseCSVLine(lines[0]);
    this.validateHeader(header);
    
    // Parse test definitions
    const tests: TestDefinition[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length < 9) continue; // Skip incomplete rows
      
      const test: TestDefinition = {
        pipeline: values[0],
        testId: values[1],
        action: values[2],
        description: values[3],
        module: values[4],
        uiLocation: values[5],
        dependencies: this.parseDependencies(values[6]),
        failureImpact: values[7],
        testCommand: values[8]
      };
      
      tests.push(test);
    }
    
    // Group tests by pipeline
    return this.groupByPipeline(tests);
  }
  
  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last value
    if (current) {
      values.push(current.trim());
    }
    
    return values;
  }
  
  /**
   * Validate CSV header structure
   */
  private validateHeader(header: string[]): void {
    const expected = [
      'Pipeline',
      'Test ID',
      'Action',
      'Description',
      'Module',
      'UI Location',
      'Dependencies',
      'Failure Impact',
      'Test Command'
    ];
    
    for (let i = 0; i < expected.length; i++) {
      if (header[i] !== expected[i]) {
        throw new Error(`Invalid CSV header. Expected "${expected[i]}" at position ${i}, got "${header[i]}"`);
      }
    }
  }
  
  /**
   * Parse dependencies string into array
   */
  private parseDependencies(deps: string): string[] {
    if (!deps || deps === 'N/A') return [];
    return deps.split(',').map(d => d.trim()).filter(d => d);
  }
  
  /**
   * Group tests by pipeline maintaining order
   */
  private groupByPipeline(tests: TestDefinition[]): Pipeline[] {
    const pipelineMap = new Map<string, TestDefinition[]>();
    const pipelineOrder: string[] = [];
    
    for (const test of tests) {
      if (!pipelineMap.has(test.pipeline)) {
        pipelineMap.set(test.pipeline, []);
        pipelineOrder.push(test.pipeline);
      }
      pipelineMap.get(test.pipeline)!.push(test);
    }
    
    return pipelineOrder.map(name => ({
      name,
      tests: pipelineMap.get(name)!,
      totalTests: pipelineMap.get(name)!.length
    }));
  }
  
  /**
   * Get specific pipeline by name
   */
  getPipeline(pipelines: Pipeline[], name: string): Pipeline | undefined {
    return pipelines.find(p => p.name === name);
  }
  
  /**
   * Get test by ID from all pipelines
   */
  getTest(pipelines: Pipeline[], testId: string): TestDefinition | undefined {
    for (const pipeline of pipelines) {
      const test = pipeline.tests.find(t => t.testId === testId);
      if (test) return test;
    }
    return undefined;
  }
}






