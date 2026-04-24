import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "test/playwright" directory
  testDir: 'test/playwright',
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use
  reporter: 'html',
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        // Use prepared browser for better performance
        baseURL: 'http://localhost:7474',
        // Record video
        video: 'on-first-retry',
        // Record trace 
        trace: 'on-first-retry',
      },
    },
  ],
  // Run local development server before starting the tests
  webServer: {
    command: 'npm run dev:vite',
    url: 'http://localhost:7474',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
