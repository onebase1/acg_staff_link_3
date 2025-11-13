// Core types for the Pipeline Test Suite

export interface TestDefinition {
  pipeline: string;
  testId: string;
  action: string;
  description: string;
  module: string;
  uiLocation: string;
  dependencies: string[];
  failureImpact: string;
  testCommand: string;
}

export interface Pipeline {
  name: string;
  tests: TestDefinition[];
  totalTests: number;
}

export interface TestResult {
  testId: string;
  action: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
  timestamp: string;
}

export interface PipelineResult {
  pipeline: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  passed: number;
  total: number;
  duration: number;
  failedAt?: string;
  results: TestResult[];
}

export interface SuiteResult {
  timestamp: string;
  duration: number;
  status: 'PASSED' | 'FAILED';
  pipelines: PipelineResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export type TestFunction = (context: TestContext) => Promise<TestResult>;

export interface TestRegistry {
  [testId: string]: TestFunction;
}

// Test Context for sharing state between tests
import { SupabaseTestClient } from '../helpers/supabase-queries';
import { FunctionTester } from '../helpers/function-tester';
import { TEST_CONFIG } from '../test-config';

export class TestContext {
  // Shared state accumulated during pipeline execution
  createdShiftId?: string;
  createdTimesheetId?: string;
  createdInvoiceId?: string;
  assignedStaffId?: string;
  createdBookingId?: string;
  uploadedFileUrl?: string;
  aiConfidenceScore?: number;
  emailWebhookId?: string;
  
  // Services
  db: SupabaseTestClient;
  functions: FunctionTester;
  
  // Configuration
  config: typeof TEST_CONFIG;
  
  // Cleanup tracking
  private cleanupTasks: (() => Promise<void>)[] = [];
  
  constructor() {
    this.db = new SupabaseTestClient();
    this.functions = new FunctionTester();
    this.config = TEST_CONFIG;
  }
  
  // Shift management
  setShiftId(id: string): void {
    this.createdShiftId = id;
  }
  
  getShiftId(): string {
    if (!this.createdShiftId) {
      throw new Error('No shift ID available in context');
    }
    return this.createdShiftId;
  }
  
  // Timesheet management
  setTimesheetId(id: string): void {
    this.createdTimesheetId = id;
  }
  
  getTimesheetId(): string {
    if (!this.createdTimesheetId) {
      throw new Error('No timesheet ID available in context');
    }
    return this.createdTimesheetId;
  }
  
  // Invoice management
  setInvoiceId(id: string): void {
    this.createdInvoiceId = id;
  }
  
  getInvoiceId(): string {
    if (!this.createdInvoiceId) {
      throw new Error('No invoice ID available in context');
    }
    return this.createdInvoiceId;
  }
  
  // Staff management
  setStaffId(id: string): void {
    this.assignedStaffId = id;
  }
  
  getStaffId(): string {
    if (!this.assignedStaffId) {
      throw new Error('No staff ID available in context');
    }
    return this.assignedStaffId;
  }
  
  // Register cleanup task
  registerCleanup(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }
  
  // Cleanup all created resources
  async cleanup(): Promise<void> {
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    }
    this.cleanupTasks = [];
  }
  
  // Authenticate
  async authenticate(): Promise<void> {
    await this.db.authenticate();
    await this.functions.authenticate();
  }
}

