
    const { test, expect } = require('@playwright/test');
    test('Task ce0a95de-c424-4e56-86bf-fb674fe752e7', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  