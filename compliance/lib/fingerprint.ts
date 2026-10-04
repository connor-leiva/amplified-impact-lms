import type { Page } from '@playwright/test';

/**
 * A typography and copy fingerprint: every visible element with its own text, plus every form field.
 * It is compared exactly, so it catches wrong copy, wrong case, wrong size, weight, line-height,
 * letter-spacing or color, and missing or extra text.
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
    const rows: string[] = [];
    root.querySelectorAll('*').forEach((el) => {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (!own || !visible(el)) return;
      const cs = getComputedStyle(el);
      rows.push(
        [
          own,
          cs.fontFamily.split(',')[0]!.replace(/["']/g, '').trim(),
          cs.fontSize,
          cs.fontWeight,
          cs.lineHeight,
          cs.letterSpacing,
          cs.textTransform,
          cs.color,
        ].join(' | '),
      );
    });
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const f = el as HTMLInputElement;
      if (!visible(f)) return;
      rows.push(['[field]', f.type, f.placeholder ?? '', f.type === 'checkbox' ? String(f.checked) : f.value].join(' | '));
    });
    return rows;
  }, selector);
}
