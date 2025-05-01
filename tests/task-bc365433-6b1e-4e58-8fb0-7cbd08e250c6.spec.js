
    const { test, expect } = require('@playwright/test');
    test('Task bc365433-6b1e-4e58-8fb0-7cbd08e250c6', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  