
    const { test, expect } = require('@playwright/test');
    test('Task 25b9ebda-982b-48ad-bc72-f04e5f26e7c7', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  