// Print an HTML file to PDF with Playwright's Chromium, with a "made-up example" line at the top of every page,
// the way a browser's Print to PDF looks. Usage: node html_to_pdf.cjs input.html output.pdf "PRACTICE FILE: made-up example"
const { chromium } = require('playwright');

(async () => {
  const [input, output, mark] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + require('path').resolve(input), { waitUntil: 'load' });
  await page.pdf({
    path: output,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#a00;font-family:Arial">${mark}</div>`,
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666;font-family:Arial">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: '0.6in', bottom: '0.6in', left: '0.5in', right: '0.5in' },
  });
  await browser.close();
})();
