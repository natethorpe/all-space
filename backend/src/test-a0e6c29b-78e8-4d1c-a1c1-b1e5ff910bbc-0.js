
        const { chromium } = require('playwright');
        (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto('http://localhost:8888/temp/server.js');
          const errors = await page.evaluate(() => window.errors || []);
          const content = await page.content();
          const title = await page.title();
          await page.screenshot({ path: 'screenshot-0.png' });
          await browser.close();
          if (errors.length > 0) {
            console.log('Errors: ' + JSON.stringify(errors));
            process.exit(1);
          }
          if (content.includes('undefined') || !content.includes('Sponsor Profile')) {
            console.log('Rendering issue: ' + (content.includes('undefined') ? 'Undefined detected' : 'Missing expected content'));
            process.exit(1);
          }
          console.log('Page loaded successfully: ' + title);
          process.exit(0);
        })();
      