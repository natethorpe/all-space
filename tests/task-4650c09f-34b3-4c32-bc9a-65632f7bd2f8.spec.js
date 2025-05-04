
    const { test, expect } = require('@playwright/test');
    test('Task 4650c09f-34b3-4c32-bc9a-65632f7bd2f8', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  