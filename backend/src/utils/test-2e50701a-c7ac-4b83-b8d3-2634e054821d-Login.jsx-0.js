
          const { chromium } = require('playwright');
          (async () => {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto('http://localhost:8888/temp/Login.jsx');
            const errors = await page.evaluate(() => window.errors || []);
            const content = await page.content();
            const title = await page.title();
            await page.screenshot({ path: 'screenshot-Login.jsx-0.png' });
            await browser.close();
            if (errors.length > 0) {
              console.log('Errors: ' + JSON.stringify(errors));
              process.exit(1);
            }
            if (content.includes('undefined')) {
              console.log('Rendering issue: Undefined detected');
              process.exit(1);
            }
            console.log('Page loaded successfully: ' + title);
            process.exit(0);
          })();
        