// Prints the HTML files make_files.py wrote to PDF, with the practice stamp at the top of every page. Each
// form page already carries its own footer ("Page 2 of 6", initials), so the printer adds no page numbers.
// It fails if a PDF does not have exactly the pages the generator meant (a page that overflowed).
// Usage: node html_to_pdf.cjs HTML_DIR SKILL_DIR
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [htmlDir, skillDir] = process.argv.slice(2);
  const list = JSON.parse(fs.readFileSync(path.join(htmlDir, 'pdfs.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let bad = 0;
  for (const { html, pdf, pages } of list) {
    await page.goto('file://' + path.join(path.resolve(htmlDir), html));
    const target = path.join(skillDir, pdf);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const buf = await page.pdf({
      path: target,
      format: 'Letter',
      margin: { top: '0.7in', bottom: '0.45in', left: '0.6in', right: '0.6in' },
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="font-size:8pt;font-family:Arial;color:#b00;width:100%;text-align:center;font-weight:bold">PRACTICE FILE: made-up example</div>',
      footerTemplate: '<div></div>',
    });
    const count = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const ok = count === pages;
    if (!ok) bad++;
    console.log(`${ok ? 'printed' : 'PAGE COUNT MISMATCH'} ${pdf} (${count} of ${pages} pages)`);
  }
  await browser.close();
  if (bad) process.exit(1);
})();
