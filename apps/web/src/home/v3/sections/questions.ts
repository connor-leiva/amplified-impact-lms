// S15, the questions (`section.faq`, #questions): "Good questions. Straight answers." (brief § 4, S15).
//
// THE KIT'S QUESTIONS, which are the mockup's numbered accordion drawn on <details>: the same layout,
// numbers, plus-to-minus and answer, from the kit's stylesheet, and it opens and closes from the
// keyboard, and with no script at all. The first is open, as in the mockup. One open at a time (brief
// § 5): the <details> share a `name`, so opening one closes the other, natively.
//
// The light band the mockup draws is `.inverse`, so it swaps with the page's theme (D8).

import { HELP_EMAIL } from '@ai/core/offer';
import { esc } from '../../../ai101/render';
import { faq } from '../../../kit/parts';
import { QUESTIONS } from '../content';

export function questions(): string {
  const q = QUESTIONS;
  const aside = `<p>${esc(q.aside)}</p><a class="inline-link" href="mailto:${esc(HELP_EMAIL)}">${esc(HELP_EMAIL)}</a>`;
  const html = faq(q.items, { title: q.title, id: 'questions', aside });
  if (!html.includes('class="sec faq"') || !html.includes('<details')) throw new Error('The kit’s questions changed shape: fix S15.');
  return html.replace('class="sec faq"', 'class="sec faq inverse"').replaceAll('<details', '<details name="v3-questions"');
}
