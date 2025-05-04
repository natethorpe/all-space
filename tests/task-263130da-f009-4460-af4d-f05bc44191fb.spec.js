
    const { test, expect } = require('@playwright/test');
    test('Task 263130da-f009-4460-af4d-f05bc44191fb', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  