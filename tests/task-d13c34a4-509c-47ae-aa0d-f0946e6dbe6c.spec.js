
    const { test, expect } = require('@playwright/test');
    test('Task d13c34a4-509c-47ae-aa0d-f0946e6dbe6c', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  