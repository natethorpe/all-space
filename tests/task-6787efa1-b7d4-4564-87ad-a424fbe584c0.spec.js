
    const { test, expect } = require('@playwright/test');
    test('Task 6787efa1-b7d4-4564-87ad-a424fbe584c0', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  