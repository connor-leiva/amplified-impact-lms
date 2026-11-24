// D-241: a one-page PDF of a few lines of text, for the fixture build's intake download. The real file is printed on
// the server by headless Chromium (`apps/api/src/pdf/render.ts`), which the fixture build has no server for. Fixture
// only: nothing in http mode calls this.

/** Printable ASCII only, with PDF's string escapes: the stand-in's Helvetica has no other glyphs. */
const pdfText = (t: string): string =>
  t
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[\\()]/g, (c) => `\\${c}`);

/** US Letter, the first line as a 20 pt title, the rest at 11 pt. */
export function onePagePdf(lines: readonly string[]): Blob {
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 20 : 11} Tf 72 ${720 - i * 28} Td (${pdfText(l)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  // Every character is ASCII, so a string offset is a byte offset, which is what the cross-reference table counts.
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}
