// formPdfHtml(): one form's answers as a print-ready HTML document (US Letter). No dependencies; runs in Node or the
// browser. Print it to PDF with headless Chrome (tools/make-pdf.mjs does exactly that: page.setContent(html), then
// page.pdf({ preferCSSPageSize: true, printBackground: true })). Chrome 131 or newer, for the page-margin footer.
//
//   form      { id, ui, intake } (src/forms/*.json); `intake` is the LMS's CourseIntake
//   answers   { fieldId: string | string[] }
//   meta      { team, owner, cohort, status: 'Submitted' | 'Draft', date: 'Nov 19, 2026' }
//   fonts     { sans, mono }  URLs (or data: URIs) of the Geist and Geist Mono variable woff2 files
//   logo      URL (or data: URI) of brand/logos/amplified-impact-academy-reversed.svg, for the forest band
//
// Looks: the LMS tokens (Forest, Energy, Bone, Geist, Geist Mono). An editorial layout: a Forest opening band with
// the title and who it's from, then each section as a narrow label column beside its questions and answers.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const has = (v) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');

export function formPdfHtml({ form, answers, meta, fonts, logo }) {
  const { ui, intake } = form;
  const fields = intake.sections.flatMap((s) => s.questions);
  const answered = fields.filter((f) => has(answers[f.id])).length;
  const answer = (f) => {
    const v = answers[f.id];
    if (!has(v)) return '<p class="a a-none">Not answered</p>';
    if (f.kind === 'multi') return `<ul class="a a-list">${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (f.kind === 'long') return `<p class="a a-long">${esc(v)}</p>`;
    return `<p class="a">${esc(v)}</p>`;
  };
  const foot = `${ui.title} · ${meta.team || meta.owner}`.replace(/["\\]/g, '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(ui.title)} · ${esc(meta.team || meta.owner)}</title>
<style>
@font-face{font-family:'Geist';src:url('${fonts.sans}') format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url('${fonts.mono}') format('woff2');font-weight:100 900}
:root{--forest:#1f4d40;--energy:#1f8a5c;--energy-bright:#6fd3a5;--bone:#f1f0eb;--black:#0a0d0c;--on-forest:#f5f5f2;
  --ink-2:rgb(10 13 12 / .68);--ink-3:rgb(10 13 12 / .6);--line:rgb(10 13 12 / .12);--on-forest-82:rgb(245 245 242 / .82);--on-forest-16:rgb(245 245 242 / .16);
  --font:'Geist',ui-sans-serif,system-ui,sans-serif;--mono:'Geist Mono',ui-monospace,monospace}
/* side margins are 0 so the opening band can run edge to edge (Chrome clips anything pushed into a page margin) */
@page{size:Letter;margin:.8in 0 .95in;
  @bottom-left{content:"amplified impact academy";font:650 10pt/1 'Geist',sans-serif;letter-spacing:-.03em;color:#0a0d0c;padding:0 0 .35in .8in}
  @bottom-center{content:"${foot}";font:400 8pt/1 'Geist',sans-serif;color:rgb(10 13 12 / .6);padding-bottom:.35in}
  @bottom-right{content:counter(page) " / " counter(pages);font:500 8pt/1 'Geist Mono',monospace;letter-spacing:.06em;color:rgb(10 13 12 / .6);padding:0 .8in .35in 0}}
@page :first{margin-top:0}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:var(--black);font:400 10.5pt/1.5 var(--font);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
h1,h2,p,ul,dl,dd{margin:0}ul{padding:0;list-style:none}
.mono{font:500 7.5pt/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
/* the opening band, edge to edge */
.band{padding:.6in .8in .55in;background:var(--forest);color:var(--on-forest)}
.band-top{display:flex;justify-content:space-between;align-items:center;gap:.3in}
.logo{display:block;height:.21in;width:auto}
.wordmark{font:650 13pt/1 var(--font);letter-spacing:-.03em}
.band-top .mono{color:var(--on-forest-82)}
.kick{margin-top:.8in;color:var(--energy-bright)}
h1{margin-top:.14in;font:650 40pt/1.02 var(--font);letter-spacing:-.035em}
.team{margin-top:.1in;font:400 17pt/1.25 var(--font);letter-spacing:-.01em;color:var(--on-forest-82)}
.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.3in;margin-top:.5in;padding-top:.2in;border-top:1px solid var(--on-forest-16)}
.facts dt{color:var(--energy-bright)}
.facts dd{margin-top:.09in;font:500 10.5pt/1.3 var(--font)}
.facts dd svg{display:inline-block;vertical-align:-2px;margin-right:6px}
/* sections: a label column and the questions */
/* The rule over a section belongs to its first row, so a page break can't strand it at the foot of a page.
   The label column is positioned, not a grid column: Chrome won't break a grid row across pages. */
.sec{position:relative;margin-top:.3in;padding-left:1.9in}
.sec:first-of-type{margin-top:.4in}
.sec-h{position:absolute;left:0;top:0;width:1.9in;padding:.3in .35in 0 0;border-top:1.5px solid var(--black)}
.sec-no{color:var(--energy)}
.sec-t{margin-top:.1in;font:650 13pt/1.2 var(--font);letter-spacing:-.01em}
.sec-d{margin-top:.08in;font-size:8.5pt;line-height:1.45;color:var(--ink-2)}
.qa{padding:.13in 0;border-top:1px solid var(--line);break-inside:avoid}
.qa:nth-child(2){break-before:avoid}
.qa:first-child{padding-top:.3in;border-top:1.5px solid var(--black)}
.q{font-size:9pt;line-height:1.4;color:var(--ink-2)}
.a{margin-top:.04in;font:500 12pt/1.4 var(--font);letter-spacing:-.005em}
.a-long{margin-top:.08in;padding-left:.16in;border-left:2px solid var(--energy);font:400 12.5pt/1.5 var(--font)}
.a-none{font-weight:400;color:var(--ink-3)}
.a-list{display:flex;flex-wrap:wrap;gap:.07in;margin-top:.08in}
.a-list li{padding:.05in .13in;border:1px solid var(--line);border-radius:99px;background:var(--bone);font:500 9.5pt/1.2 var(--font)}
.end{margin-top:.45in;padding-top:.16in;border-top:1px solid var(--line);font-size:8pt;line-height:1.5;color:var(--ink-3);break-inside:avoid}
main{padding:0 .8in}
</style></head>
<body>
<header class="band">
  <div class="band-top">${logo ? `<img class="logo" src="${logo}" alt="Amplified Impact Academy">` : '<span class="wordmark">amplified impact academy</span>'}<span class="mono">${esc(meta.cohort)}</span></div>
  <p class="mono kick">${esc(ui.kicker)}</p>
  <h1>${esc(ui.title)}</h1>
  ${meta.team ? `<p class="team">${esc(meta.team)}</p>` : ''}
  <dl class="facts">
    <div><dt class="mono">From</dt><dd>${esc(meta.owner)}</dd></div>
    <div><dt class="mono">${esc(meta.status)}</dt><dd>${meta.status === 'Submitted' ? '<svg width="12" height="12" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.500" fill="none" stroke="#6fd3a5" stroke-width="2"/><circle cx="11" cy="11" r="4" fill="#6fd3a5"/></svg>' : ''}${esc(meta.date)}</dd></div>
    <div><dt class="mono">Answers</dt><dd>${answered} of ${fields.length}</dd></div>
  </dl>
</header>
<main>
${intake.sections.map((s, i) => `<section class="sec">
  <div class="sec-h"><p class="mono sec-no">${String(i + 1).padStart(2, '0')}</p><h2 class="sec-t">${esc(s.title)}</h2>${s.intro ? `<p class="sec-d">${esc(s.intro)}</p>` : ''}</div>
  <div>${s.questions.map((f) => `<div class="qa"><p class="q">${esc(f.label)}</p>${answer(f)}</div>`).join('')}</div>
</section>`).join('\n')}
<p class="end">${meta.status === 'Submitted' ? 'Submitted' : 'Saved as a draft'} ${esc(meta.date)} through learn.amplifiedimpact.io. The current answers are in the learner's profile.</p>
</main>
</body></html>`;
}
