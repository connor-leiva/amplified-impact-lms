// Prints the HTML files make_files.py wrote to PDF, with the practice stamp and page numbers on every page.
// Usage: node html_to_pdf.cjs HTML_DIR SKILL_DIR
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [htmlDir, skillDir] = process.argv.slice(2);
  const list = JSON.parse(fs.readFileSync(path.join(htmlDir, 'pdfs.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const { html, pdf, landscape } of list) {
    await page.goto('file://' + path.join(path.resolve(htmlDir), html));
    const target = path.join(skillDir, pdf);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.pdf({
      path: target,
      format: 'Letter',
      landscape: Boolean(landscape),
      margin: { top: '0.7in', bottom: '0.6in', left: '0.5in', right: '0.5in' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:8pt;font-family:Arial;color:#b00;width:100%;text-align:center;font-weight:bold">PRACTICE FILE: made-up example</div>',
      footerTemplate: '<div style="font-size:8pt;font-family:Arial;color:#555;width:100%;text-align:center">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    console.log('printed', pdf);
  }
  await browser.close();
})();
