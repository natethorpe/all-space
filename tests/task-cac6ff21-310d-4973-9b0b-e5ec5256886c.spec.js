
    const { test, expect } = require('@playwright/test');
    test('Task cac6ff21-310d-4973-9b0b-e5ec5256886c', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  