
          const { chromium } = require('playwright');
          (async () => {
            const browser = await chromium.launch({ headless: false }); // Visible browser
            const page = await browser.newPage();
            await page.goto('http://localhost:3000/employee-log'); // Frontend route
            const errors = await page.evaluate(() => window.errors || []);
            const content = await page.content();
            const title = await page.title();
            await page.screenshot({ path: 'screenshot-EmployeeLog.jsx-1.png' });
            if (errors.length > 0) {
              console.log('Errors: ' + JSON.stringify(errors));
              process.exit(1);
            }
            if (content.includes('undefined')) {
              console.log('Rendering issue: Undefined detected');
              process.exit(1);
            }
            console.log('Page loaded successfully: ' + title);
            // No process.exit(0) or browser.close() - keep browser open
          })();
        