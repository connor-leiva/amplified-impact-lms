import type { Page } from '@playwright/test';

/**
 * A typography and copy fingerprint: every run of visible text with the typography it is rendered
 * in, plus every form field. Compared exactly, so it catches wrong copy, wrong case, wrong size,
 * weight, line-height, letter-spacing, text-transform or colour, and missing or extra text.
 *
 * Text runs are collected per text NODE in document order and merged with their neighbours whenever
 * they share the same typography. That makes the fingerprint invariant to how a renderer happens to
 * split text across elements, while losing none of the signal above: changed copy, changed case, a
 * dropped or added string, or any typography difference still shows up, because the merged sequence
 * changes.
 *
 * This matters because the prototype's template engine wraps every `{{ }}` binding in a
 * `<span class="sc-interp">` AND every imported component in a block-level host. So
 * `Session {n} · {title}` arrives as three runs and `Replay · {speed}` straddles a block boundary,
 * where React emits one run each. Matching that would mean scattering meaningless spans and
 * wrappers through every screen purely to imitate a prototyping runtime's DOM.
 *
 * Merging is deliberately NOT limited to a shared block ancestor: the prototype's wrappers are
 * exactly the block boundaries we must ignore. Layout is not this function's job — the pixel diff
 * covers that, and it is the half of the comparison that would catch text moving on screen.
 */
export async function fingerprint(page: Page, selector: string | null): Promise<string[]> {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document.body;
    if (!root) return ['<missing region>'];
    const vw = window.innerWidth;

    const visible = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        if (e.getAttribute('aria-hidden') === 'true') return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw;
    };

    const styleOf = (el: Element) => {
      const cs = getComputedStyle(el);
      return [
        cs.fontFamily.split(',')[0]!.replace(/["']/g, '').trim(),
        cs.fontSize,
        cs.fontWeight,
        cs.lineHeight,
        cs.letterSpacing,
        cs.textTransform,
        cs.color,
      ].join(' | ');
    };

    const runs: { text: string; style: string }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const raw = n.textContent ?? '';
      if (!raw.trim()) continue;
      const parent = n.parentElement;
      if (!parent || !visible(parent)) continue;
      const style = styleOf(parent);
      const prev = runs[runs.length - 1];
      if (prev && prev.style === style) prev.text += ' ' + raw;
      else runs.push({ text: raw, style });
    }

    const rows = runs.map((r) => `${r.text.replace(/\s+/g, ' ').trim()} | ${r.style}`).filter((r) => !r.startsWith(' |'));

    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const f = el as HTMLInputElement;
      if (!visible(f)) return;
      rows.push(['[field]', f.type, f.placeholder ?? '', f.type === 'checkbox' ? String(f.checked) : f.value].join(' | '));
    });
    return rows;
  }, selector);
}
