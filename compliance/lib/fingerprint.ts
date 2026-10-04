import type { Page } from '@playwright/test';

/**
 * A typography and copy fingerprint: every run of visible text with the typography it is rendered
 * in, plus every form field. Compared exactly, so it catches wrong copy, wrong case, wrong size,
 * weight, line-height, letter-spacing, text-transform or colour, and missing or extra text.
 *
 * Text runs are collected per text NODE and then merged with their neighbours when they share both
 * the same typography and the same nearest block-level ancestor. That makes the fingerprint
 * invariant to how a renderer happens to split text across elements, while losing none of the
 * signal above.
 *
 * This matters because the reference prototype's template engine wraps every `{{ }}` binding in a
 * `<span class="sc-interp">`, so `Session {n} · {title}` arrives as three sibling text runs, while
 * React emits one. Without merging, every interpolation in the app would have to be wrapped in a
 * meaningless span purely to imitate a prototyping runtime's DOM. Layout differences are not this
 * function's job — the pixel diff covers those.
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

    /** The nearest ancestor that establishes its own line box, so runs never merge across rows. */
    const blockOf = (el: Element): Element => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const d = getComputedStyle(e).display;
        if (d !== 'inline' && d !== 'contents') return e;
      }
      return document.body;
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

    const runs: { text: string; style: string; block: Element }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const raw = n.textContent ?? '';
      if (!raw.trim()) continue;
      const parent = n.parentElement;
      if (!parent || !visible(parent)) continue;
      const style = styleOf(parent);
      const block = blockOf(parent);
      const prev = runs[runs.length - 1];
      if (prev && prev.style === style && prev.block === block) prev.text += raw;
      else runs.push({ text: raw, style, block });
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
