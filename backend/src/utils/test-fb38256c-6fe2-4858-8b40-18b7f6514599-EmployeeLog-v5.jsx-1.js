
        const { chromium } = require('playwright');
        (async () => {
          const browser = await chromium.launch({ headless: false });
          const context = await browser.newContext();
          const page = await context.newPage();
          await page.goto('http://localhost:3000/employee-log');
          
          // Prefill admin credentials by default
          const isStaffTest = false;
          if (isStaffTest) {
            await page.fill('#email', 'staff@idurarapp.com');
            await page.fill('#password', 'StaffPass123!');
          } else {
            await page.fill('#email', 'admin@idurarapp.com');
            await page.fill('#password', 'AdminPass456!');
          }
          await page.click('#login-button');

          const errors = await page.evaluate(() => window.errors || []);
          const content = await page.content();
          const title = await page.title();
          await page.screenshot({ path: 'screenshot-EmployeeLog-v5.jsx-1.png' });
          if (errors.length > 0) {
            console.log('Errors: ' + JSON.stringify(errors));
            process.exit(1);
          }
          if (content.includes('undefined')) {
            console.log('Rendering issue: Undefined detected');
            process.exit(1);
          }
          console.log('Page loaded successfully: ' + title);
          // No auto-close - browser persists
        })();
      