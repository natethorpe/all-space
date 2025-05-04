
    const { test, expect } = require('@playwright/test');
    test('Task 19e0726d-4c53-4e0f-8cd6-723e04da5591', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  