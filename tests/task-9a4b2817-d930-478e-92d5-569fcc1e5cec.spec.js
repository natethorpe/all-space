
    const { test, expect } = require('@playwright/test');
    test('Task 9a4b2817-d930-478e-92d5-569fcc1e5cec', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  