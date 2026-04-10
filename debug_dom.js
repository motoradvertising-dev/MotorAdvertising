const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        const path = require('path');
        const fileUrl = 'file://' + path.join(__dirname, 'index.html');
        await page.goto(fileUrl, { waitUntil: 'load' });

        // Scroll into the section
        await page.evaluate(() => window.scrollBy(0, 800));
        await new Promise(r => setTimeout(r, 500));

        const scrolledData = await page.evaluate(() => {
            const msg = document.querySelector('.conversation-msg');
            const bubble = msg.querySelector('.msg-bubble');
            const rect = bubble.getBoundingClientRect();
            return {
                isVisibleClass: msg.classList.contains('visible'),
                msgClassList: Array.from(msg.classList),
                bubbleClassList: Array.from(bubble.classList),
                opacity: window.getComputedStyle(bubble).opacity,
                transform: window.getComputedStyle(bubble).transform,
                rectJSON: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            };
        });
        console.log("Scrolled Data msg 1:", scrolledData);

        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
