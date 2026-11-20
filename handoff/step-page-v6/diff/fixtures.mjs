// Review-only fixtures. interaction-demo.mp4 was recorded on the mockup, which carries three things the LMS
// must NOT ship: the black MOCKUP bar, the "Text styles (review)" link in On this page, and the
// "Text styles for long steps" section under the footer. To compare a deployed page with the video (or with
// the mockup), the test adds the same three things to the target page first, copied from mockup/step-2.html.
// Everything else on the page must then line up on its own. Nothing is added if the page already has them.
import { readFileSync } from 'node:fs';

const MOCKUP = readFileSync(new URL('../mockup/step-2.html', import.meta.url), 'utf8');
const cut = (start, end) => { const a = MOCKUP.indexOf(start); const b = MOCKUP.indexOf(end, a) + end.length; if (a < 0 || b < end.length) throw new Error('fixture not found: ' + start); return MOCKUP.slice(a, b); };

// The mockup's inline styles use its own token names (var(--s5)); the step page's CSS names them --sp-* (step-page.tokens.css).
const tokenized = (html) => html.replace(/var\(--(?!sp-|aim-)([a-z0-9-]+)\)/g, 'var(--sp-$1)');
export const FIXTURES = {
  flag: tokenized(cut('<div class="mock-flag">', '</div>')),
  link: tokenized(cut('<a class="rail-link" href="#styles"', '</a>')),
  review: tokenized(cut('<section class="review', '</section>')),
};

/** Adds the missing review-only fixtures to the page. Returns the list of what it added. */
export async function addFixtures(page) {
  return page.evaluate(({ flag, link, review }) => {
    const added = [];
    const pageBox = document.querySelector('.page');
    if (!document.querySelector('.mock-flag') && pageBox) { pageBox.insertAdjacentHTML('beforebegin', flag); added.push('mock-flag'); }
    if (!document.querySelector('.rail a[href="#styles"]')) {
      const ref = document.querySelector('.rail nav.card a[href="#reference"]');
      if (ref) { ref.insertAdjacentHTML('afterend', link); added.push('styles-link'); }
    }
    if (!document.getElementById('styles')) {
      const after = document.getElementById('live') || document.getElementById('foot');
      if (after) { after.insertAdjacentHTML('afterend', review); added.push('review-section'); }
    }
    return added;
  }, FIXTURES);
}
