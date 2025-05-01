
    const { test, expect } = require('@playwright/test');
    test('Task 3031b9b3-9fe2-41e8-ae36-cb30bdead8dc', async ({ page }) => {
  
      await page.goto('http://localhost:3000/login');
      await expect(page.locator('form')).toBeVisible();
      await page.goto('http://localhost:3000/dashboard');
      await expect(page.locator('nav')).toBeVisible();
      await page.goto('http://localhost:3000/sponsor/1');
      await expect(page.locator('.sponsor-profile')).toBeVisible();
      await page.goto('http://localhost:3000/employee-log');
      await expect(page.locator('button.add-employee')).toBeVisible();
      await page.goto('http://localhost:3000/settings');
      await expect(page.locator('.settings')).toBeVisible();
    
    });
  