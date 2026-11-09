// Prints the HTML files make_files.py wrote to PDF, with the file's stamp at the top of every page and
// page numbers and initials at the bottom.
// Usage: node html_to_pdf.cjs HTML_DIR SKILL_DIR
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [htmlDir, skillDir] = process.argv.slice(2);
  const list = JSON.parse(fs.readFileSync(path.join(htmlDir, 'pdfs.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const { html, pdf, stamp, footer } of list) {
    await page.goto('file://' + path.join(htmlDir, html));
    const target = path.join(skillDir, pdf);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.pdf({
      path: target,
      format: 'Letter',
      margin: { top: '0.75in', bottom: '0.7in', left: '0.6in', right: '0.6in' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8pt;font-family:Arial;color:#b00;width:100%;text-align:center;font-weight:bold">${stamp}</div>`,
      footerTemplate: `<div style="font-size:7.5pt;font-family:Arial;color:#333;width:100%;text-align:center">Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;&nbsp; ${footer}</div>`,
    });
    console.log('printed', pdf);
  }
  await browser.close();
})();
