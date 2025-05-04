
    const { test, expect } = require('@playwright/test');
    test('Task 86f957ae-2e75-4890-b536-f62a795a8366', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  