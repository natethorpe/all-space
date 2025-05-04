
    const { test, expect } = require('@playwright/test');
    test('Task 97fa7df7-7836-4ae0-b121-3b2ebee576ff', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  