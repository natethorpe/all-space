
    const { test, expect } = require('@playwright/test');
    test('Task 2a562d93-28e0-4ac7-8ff3-3b092a574b0c', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  