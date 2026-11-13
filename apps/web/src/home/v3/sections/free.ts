// S10, the five free skills (`section.fh`, #free): "Five free hires. No interviews." (brief § 4, S10).
//
// The five are the Library's (`FREE_FIVE`, in its order), each linking to its page, with the tools its
// record names; the names and lines are the mockup's. "Get the 5 Free Skills" goes where the live site's
// free button goes (`FREE_SKILLS_HREF`), with the proof line beside it (rule), and never fades in.
//
// The list is settled in the markup (`is-in`); on a wide screen with motion allowed, a list arriving
// from below rises in row by row (`client/proof.ts`). The light band is `.inverse` (D8).

import { esc } from '../../../ai101/render';
import { button, proofLine } from '../../../kit/parts';
import { ENTRIES, FREE_FIVE, TOOLS } from '../../../library/content';
import { FREE_SKILLS_HREF } from '../../../site/content';
import { FREE } from '../content';
import { glyph, ringDot } from '../icons';

export function free(): string {
  const f = FREE;
  const rows = FREE_FIVE.map((slug, i) => {
    const item = f.items.find((x) => x.slug === slug);
    const entry = ENTRIES.find((e) => e.href === `/${slug}`);
    if (!item || !entry?.href) throw new Error(`S10 has no words, or the Library no page, for "${slug}"`);
    const tools = entry.tools.map((t) => `<span class="mono fh-tool">${esc(TOOLS[t])}</span>`).join('');
    return `<li style="--i:${i}"><a href="${esc(entry.href)}" class="fh-row"><span class="mono fh-idx">${String(i + 1).padStart(2, '0')}</span><span class="fh-mark" aria-hidden="true">${ringDot(
      22,
    )}</span><span class="fh-name">${esc(item.name)}</span><span class="fh-text">${esc(item.text)}</span><span class="fh-tools">${tools}</span>${glyph(
      'arrow',
      18,
      'fh-arrow',
    )}</a></li>`;
  }).join('');
  return [
    `<section id="free" class="sec fh inverse" aria-labelledby="fh-title">`,
    `<div class="wrap">`,
    `<div class="fh-head"><div class="rv fh-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(f.eyebrow)}</span></p><h2 id="fh-title" class="h-section">${esc(
      f.title,
    )}</h2><p class="intro">${esc(f.intro)}</p></div><div class="fh-cta cta-group"><div class="actions">${button(f.cta, FREE_SKILLS_HREF, {
      size: 'lg',
    })}</div>${proofLine()}</div></div>`,
    `<ol class="fh-list is-in" role="list" data-fh>${rows}</ol>`,
    `<p class="mono fh-foot">${esc(f.foot)}</p>`,
    `</div>`,
    `</section>`,
  ].join('');
}
