// Prints the HTML pages make_files.py wrote to PDF, with the practice stamp on every page.
// Usage: node html_to_pdf.cjs LIST_JSON   (a list of { html, pdf } with absolute paths)
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const { html, pdf } of list) {
    await page.goto('file://' + html);
    await page.pdf({
      path: pdf,
      format: 'Letter',
      margin: { top: '0.7in', bottom: '0.6in', left: '0.6in', right: '0.6in' },
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="font-size:8pt;font-family:Arial;color:#b00;width:100%;text-align:center;font-weight:bold">PRACTICE FILE: made-up example</div>',
      footerTemplate:
        '<div style="font-size:8pt;font-family:Arial;color:#555;width:100%;text-align:center">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    console.log('printed', pdf);
  }
  await browser.close();
})();
