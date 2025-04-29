// tests/grok.test.js
const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@idurarapp.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Login")', { timeout: 60000 });
  await page.waitForURL('http://localhost:3000/dashboard', { timeout: 60000 });
}

test('SponsorHub loads', async ({ page }) => {
  await login(page);
  await page.goto('http://localhost:3000/sponsor/1'); // Assuming SponsorHub is this route
  await expect(page.locator('h2')).toHaveText(/Sponsor Profile|Default Sponsor/);
});

test('Grok edit workflow', async ({ page }) => {
  await login(page);
  await page.goto('http://localhost:3000/grok');
  await page.fill('textarea', 'Generate SponsorProfile.jsx');
  await page.click('button:has-text("Submit")'); // Adjust selector as needed
  await page.waitForSelector('.task-completed', { timeout: 60000 });
});
