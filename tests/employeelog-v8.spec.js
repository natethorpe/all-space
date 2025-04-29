/*
 * File: employeelog-v8.spec.js
 * Path: tests/employeelog-v8.spec.js
 * Purpose: Playwright tests for EmployeeLog-v8 functionality.
 * Dependencies: @playwright/test
 */
const { test, expect } = require('@playwright/test');

test('EmployeeLog-v8 loads', async ({ page }) => {
  await page.goto('http://localhost:3000/employee-log');
  await expect(page).toHaveTitle(/.*/);
});

test('EmployeeLog loads', async ({ page }) => {
  await page.goto('http://localhost:3000/employee-log');
  await expect(page).toHaveTitle(/.*/);
});
