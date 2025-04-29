
          const { chromium } = require('playwright');
          (async () => {
            const browser = await chromium.launch({ headless: false });
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto('http://localhost:3000/employee-log');
            await page.fill('#email', 'admin@idurarapp.com');
            await page.fill('#password', 'admin123');
            await page.click('#login-button');
            console.log('Browser open for manual review. Close when done.');
            // No auto-close here
          })();
        