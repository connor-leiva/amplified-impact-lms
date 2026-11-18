import type { Page } from '@playwright/test';

// The `@lms-mobile` checks (`e2e/lms-mobile.spec.ts`), word for word, as the #172 flip has them (with its
// one addition: a visually hidden element, the learner shell's breadcrumb, is read and never tapped). Its
// `findings` is module-private in a spec file, and importing a spec file would register its tests here, so
// the function is copied rather than shared. If that file's checks change, change this copy with them.
//
//   overflow   nothing scrolls sideways (the document, or a <main> that scrolls)
//   font       on a phone (under 768px), every visible run of text is 16px or more
//   tap        on a phone, every control is at least 44 by 44px (48 tall for a primary action)

/** lms.css's phone query is `max-width: 767px`: the font floor and the tap sizes hold below this. */
export const PHONE_BELOW = 768;

/** Every finding on the page as `check: detail`. Runs in the browser. */
export async function findings(page: Page): Promise<{ overflow: string[]; font: string[]; tap: string[] }> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return false;
        // Visually hidden (`clip: rect(0 0 0 0)` in a 1px box), as `learn-v2-phone.spec.ts` reads it: the
        // learner shell's breadcrumb (D-177), which the mockup does not draw, is read and never tapped.
        if (
          cs.position === 'absolute' &&
          cs.overflow === 'hidden' &&
          parseFloat(cs.width) <= 1 &&
          parseFloat(cs.height) <= 1
        )
          return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
    };
    const label = (el: Element) => {
      const t = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title') || '')
        .trim()
        .replace(/\s+/g, ' ');
      return `${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 40)}"` : ''}`;
    };

    // Overflow: the document, and the shell's scroller.
    const overflow: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) overflow.push(`document ${doc.scrollWidth} > ${doc.clientWidth}`);
    const main = document.querySelector('main');
    // Only a <main> that scrolls can scroll sideways; one that clips (the sign-in art) cannot.
    if (main && /auto|scroll/.test(getComputedStyle(main).overflowX) && main.scrollWidth > main.clientWidth + 1) {
      // Allowed when the overflow is contained by an intentional scroll region inside it.
      const regions = Array.from(main.querySelectorAll('*')).filter(
        (e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth,
      );
      const mainRect = main.getBoundingClientRect();
      const escapees = Array.from(main.querySelectorAll('*')).filter((e) => {
        if (regions.some((r) => r !== e && r.contains(e))) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > mainRect.right + 1;
      });
      if (escapees.length)
        overflow.push(`main ${main.scrollWidth} > ${main.clientWidth}: ${escapees.slice(0, 3).map(label).join(', ')}`);
    }

    // Min font: every visible text node's typography.
    const font = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? '').trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('svg, script, style, noscript') || !visible(p)) continue;
      const size = Number.parseFloat(getComputedStyle(p).fontSize);
      if (size < 16) font.add(`${label(p)} ${size}px`);
    }

    // Tap targets.
    const tap = new Set<string>();
    const controls = document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=radio], [role=checkbox]',
    );
    for (const el of Array.from(controls)) {
      if (!visible(el) || (el as HTMLButtonElement).disabled) continue;
      const cs = getComputedStyle(el);
      // A link inside running text: inline, with other words beside it in the same block, bare or in
      // sibling spans ("From Session 1 · <link> · 45 Min Build"). WCAG 2.5.8's inline exception: the
      // target is "constrained by the line-height of non-target text".
      if (el.tagName === 'A' && cs.display === 'inline') {
        const block = el.parentElement;
        const words = block
          ? Array.from(block.childNodes).some((c) => c !== el && /[\p{L}\p{N}]/u.test(c.textContent ?? ''))
          : false;
        if (words) continue;
      }
      // A visually hidden native input behind a styled control is measured through its label.
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'text' && Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      const primary =
        /\bprimary\b|_primary_/.test(el.className.toString()) ||
        /--action-primary\)/.test(el.getAttribute('style') ?? '');
      const minH = primary ? 48 : 44;
      if (r.width < 44 - 0.5 || r.height < minH - 0.5)
        tap.add(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}${primary ? ' (primary)' : ''}`);
    }
    return { overflow, font: [...font], tap: [...tap] };
  });
}
