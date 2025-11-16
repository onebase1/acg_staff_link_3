import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ACG StaffLink
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run for
  timeout: 60 * 1000,
  
  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI, // Fail if test.only in CI
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: 1, // Run one test at a time
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1920, height: 1080 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Timeout for each action
    actionTimeout: 15000,
    
    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev server before starting tests
  // Uncomment if you want Playwright to start the dev server automatically
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});

