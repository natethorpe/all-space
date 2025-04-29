// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\playwright.config.js
// Historical Note: Updated through 04/23/2025; see original comments.
// Updated: 04/07/2025 - Enhanced notes.

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    { command: 'cd backend && npm start', port: 8888, timeout: 120 * 1000, reuseExistingServer: true },
    { command: 'cd frontend && npm run dev', port: 3000, timeout: 120 * 1000, reuseExistingServer: true },
  ],
  expect: { timeout: 30000 },
});

/*
 * Detailed Notes for Future Chats:
 * - File Path: Matches 04/23/2025.
 * - Config: Robust for today’s tests; no changes needed.
 * - Next Steps: Run tests; check report with npx playwright show-report.
 */
