
    const { test, expect } = require('@playwright/test');
    test('Task 29987171-47b9-49ea-8c6b-582652e2ea71', async ({ page }) => {
  
      await page.goto('http://localhost:3000/grok');
      await expect(page.locator('body')).toBeVisible();
    
    });
  