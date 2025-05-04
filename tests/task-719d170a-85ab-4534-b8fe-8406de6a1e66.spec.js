
    const { test, expect } = require('@playwright/test');
    test('Task 719d170a-85ab-4534-b8fe-8406de6a1e66', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  