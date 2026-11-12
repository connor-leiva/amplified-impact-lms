// /insiders, Amplified Insiders' own page, as strings: the v2 mockup's InsidersPage on the kit
// (`../kit/`), with /pricing's Insiders card's words, price, terms and Payment Links (`./content.ts` says
// why). Built once by `../site/vite-plugin.ts` into `dist/insiders.html`, then FILLED PER REQUEST by the
// API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): the two Insiders carts' state
// and Payment Links. The kit's script only animates; every link is in the markup.
//
// The proof line sits right under every buy button, showing exactly when it does.

import { MEMBERSHIP_NAME, PLAN_SETS } from '@ai/core/offer';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { esc } from '../ai101/render';
import { brandIcon, glyph, ringDot, ripple, type BrandIconName } from '../kit/icons';
import { KIT_PROGRAMS } from '../kit/content';
import { button, checks, closeCta, eyebrow, faq, headline, pad2, proofLine, proofSection } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { ENTRIES, FREE_FIVE, LIBRARY, TOPICS, type Entry } from '../library/content';
import { CARD_STATES, FACT_LABELS, OFFERS } from '../offer/content';
import { END, FAQ } from '../pricing/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { cartsOf, linkToken, offerActions, offerPrice, SHARE_IMAGE, stateToken } from '../site/offers';
import { siteHead } from '../site/render';
import { PROOF } from '../team-build/content';
import { INSIDERS_META, V2_INSIDERS } from './content';

const c = OFFERS.membership;

export function renderInsidersHead(): string {
  return siteHead({ ...INSIDERS_META, image: SHARE_IMAGE });
}

// --- What Insiders opens: the catalog's owner and ops set, by its Library cards ---------------------

/** One skill or template Insiders opens: its Library card, its catalog line, and its group. */
export interface InsidersSkill {
  entry: Entry;
  summary: string;
  group: keyof typeof TOPICS;
}

/** Each group's brand icon, in the order the page shows the groups. */
const GROUP_ICONS: Readonly<Partial<Record<keyof typeof TOPICS, BrandIconName>>> = {
  'team-ops': 'team-hub',
  bookkeeping: 'analytics',
  transactions: 'checklist',
  setup: 'settings',
  content: 'video-lesson',
};
const GROUP_ORDER = Object.keys(GROUP_ICONS) as (keyof typeof TOPICS)[];

/**
 * Every skill and Grok Bot template in a set Insiders opens (`PLAN_SETS.membership`, and the ones in
 * both sets), in the Library's order, each by its Library card. Its group is the Grok Bot shelf it sits
 * on, or else the first of its Library topics past "Claude Skills". A build error if one has no group.
 */
export function insidersSkills(): readonly InsidersSkill[] {
  const opens = new Set<string>([...PLAN_SETS.membership, 'both']);
  const catalog = new Map<string, { summary: string; sets: string }>();
  for (const s of SKILL_CATALOG) catalog.set(s.id, s);
  for (const t of GROK_TEMPLATES) catalog.set(t.id, t);
  return ENTRIES.flatMap((entry) => {
    const item = entry.href ? catalog.get(entry.href.slice(1)) : undefined;
    if (!item || !opens.has(item.sets)) return [];
    const group = entry.collection ?? entry.topics.find((t) => t !== 'skills');
    if (!group || !(group in GROUP_ICONS))
      throw new Error(`/insiders has no group for ${entry.href}. Add its topic to GROUP_ICONS.`);
    return [{ entry, summary: item.summary, group }];
  });
}

const FREE = new Set(FREE_FIVE.map((slug) => `/${slug}`));

// --- The page ---------------------------------------------------------------------------------------

/** The hero's art: the owner and ops shelf, two columns drifting past. A picture; the list is below. */
function shelf(skills: readonly InsidersSkill[]): string {
  const half = Math.ceil(skills.length / 2);
  const col = (list: readonly InsidersSkill[], i: number) =>
    `<div class="shelf-col shelf-col-${i}"><div class="shelf-track">${[...list, ...list]
      .map(
        (s) =>
          `<span class="shelf-item">${brandIcon(GROUP_ICONS[s.group]!, 16)}<span>${esc(s.entry.title)}</span></span>`,
      )
      .join('')}</div></div>`;
  return [
    `<div class="shelf" aria-hidden="true">`,
    `<div class="shelf-top"><span class="mono shelf-k">${esc(c.lines[0]!)}</span><span class="shelf-badge">${ringDot(14)}${esc(c.lines[1]!)}</span></div>`,
    `<div class="shelf-cols">${col(skills.slice(0, half), 0)}${col(skills.slice(half), 1)}</div>`,
    `</div>`,
  ].join('');
}

/** The price and the two carts' buttons, the card's own, with its state from its first cart. */
function buy(): string {
  const first = cartsOf('membership')[0]!;
  return [
    `<div class="plan buy in-buy fade-2" id="join" data-state="${stateToken(first)}">`,
    offerPrice('membership'),
    offerActions('membership', { proof: true }),
    `<p class="in-starts">${esc(c.starts[0]!)}</p>`,
    `</div>`,
  ].join('');
}

function hero(skills: readonly InsidersSkill[]): string {
  return [
    `<section class="sec in-hero" aria-labelledby="insiders-title" data-scroll="exit">`,
    `<div class="in-ripple" aria-hidden="true">${ripple(820, { intro: true })}</div>`,
    `<div class="wrap in-hero-grid">`,
    `<div class="in-hero-copy">`,
    eyebrow(MEMBERSHIP_NAME, { icon: 'resource-vault' }),
    `<h1 id="insiders-title" class="h-hero in-title">${headline(V2_INSIDERS.title)}</h1>`,
    `<p class="lead fade-1">${esc(c.forWho)}</p>`,
    buy(),
    `</div>`,
    `<div class="in-hero-art">${shelf(skills)}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** What you get: every owner and ops skill, by group, each a link to its page. */
function inside(skills: readonly InsidersSkill[]): string {
  const groups = GROUP_ORDER.map((g) => ({ g, list: skills.filter((s) => s.group === g) })).filter(
    (x) => x.list.length,
  );
  const nav = groups
    .map(
      ({ g, list }) =>
        `<li><a class="itab" href="#in-${g}">${brandIcon(GROUP_ICONS[g]!, 22)}<span class="itab-label">${esc(TOPICS[g])}</span><span class="mono itab-n tnum">${list.length}</span></a></li>`,
    )
    .join('');
  const panels = groups
    .map(({ g, list }) => {
      const items = list
        .map((s, i) => {
          const tags = [
            FREE.has(s.entry.href!) ? `<span class="mono free-tag">${esc(LIBRARY.access.free)}</span>` : '',
            s.entry.collection ? `<span class="mono gb-tag">${esc(s.entry.kind)}</span>` : '',
          ].join('');
          return `<li><a class="iskill" href="${esc(s.entry.href!)}"><span class="mono iskill-idx" aria-hidden="true">${pad2(i + 1)}</span><span class="iskill-txt"><span class="iskill-name">${esc(
            s.entry.title,
          )}${tags}</span><span class="iskill-desc">${esc(s.summary)}</span></span>${glyph('arrow', 18, 'iskill-go')}</a></li>`;
        })
        .join('');
      return `<div class="igroup" id="in-${g}"><h3 class="igroup-h">${brandIcon(GROUP_ICONS[g]!, 22)}<span>${esc(TOPICS[g])}</span></h3><ul class="ilist" role="list">${items}</ul></div>`;
    })
    .join('');
  return [
    `<section id="what" class="sec inside" aria-labelledby="inside-title">`,
    `<div class="wrap">`,
    `<div class="inside-head rv">${eyebrow(FACT_LABELS.lines, { mark: true })}<h2 id="inside-title" class="h-section">${esc(c.lines[0]!)}</h2></div>`,
    `<div class="inside-grid">`,
    `<nav class="inside-tabs" aria-labelledby="inside-title"><ul role="list">${nav}</ul></nav>`,
    `<div class="inside-panel">${panels}</div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The first sentence of a line, and the rest: the same words, set as the mockup's title and line. */
export function splitFirst(p: string): readonly [string, string] {
  const m = /^(.+?[.?])\s+(.+)$/.exec(p);
  return m ? [m[1]!, m[2]!] : [p, ''];
}

/** How it runs: the card's own words, as the mockup's three columns. */
function runs(): string {
  const [self, rest] = splitFirst(c.howItRuns);
  const [use, bring] = splitFirst(rest);
  const [join, login] = splitFirst(c.starts[0]!);
  const items: readonly (readonly [string, string])[] = [
    [self, use],
    [c.lines[2]!, bring],
    [join, login],
  ];
  return [
    `<section class="sec in-runs" aria-labelledby="in-runs-title">`,
    `<div class="wrap">`,
    `<div class="in-runs-head rv"><h2 id="in-runs-title" class="h-section">${esc(FACT_LABELS.howItRuns)}</h2></div>`,
    `<div class="in-runs-grid">`,
    items
      .map(
        ([k, t], i) =>
          `<div class="irun rv" style="--d:${i * 90}ms"><span class="mono irun-idx" aria-hidden="true">${pad2(i + 1)}</span><h3 class="irun-k">${esc(k)}</h3><p class="irun-t">${esc(t)}</p></div>`,
      )
      .join(''),
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The monthly line ("Or pay <amount> a month") into its amount and its unit, so the monthly price is the card's, never retyped. */
export function monthlyFigure(more: string): readonly [string, string] {
  const m = /(\$\d{1,3}(?:,\d{3})*)\s+(.+)$/.exec(more);
  if (!m) throw new Error(`/insiders can't find the monthly price in "${more}". Fix src/offer/content.ts.`);
  return [m[1]!, m[2]!];
}

/** One way to pay: its cart's own state, price, terms and button, with the proof line under it. */
function plan(
  cart: string,
  amount: string,
  unit: string,
  terms: readonly string[],
  label: string,
  variant: 'primary' | 'secondary',
  cls = '',
): string {
  return [
    `<article class="in-plan plan${cls ? ` ${cls}` : ''} rv" data-state="${stateToken(cart)}">`,
    `<p class="price-line"><span class="price tnum">${esc(amount)}</span> <span class="mono price-note">${esc(unit)}</span></p>`,
    checks(terms),
    `<div class="plan-actions"><div class="act-link"><a class="btn btn-${variant}" href="${linkToken(cart)}">${esc(label)}</a>${proofLine()}</div><p class="act-soon">${esc(CARD_STATES.soon)}</p></div>`,
    `</article>`,
  ].join('');
}

/** Two ways to pay, on the other theme: the year and the month, each the card's own words and cart. */
function pricing(): string {
  const [year, monthly] = cartsOf('membership') as [string, string];
  const more = c.more[monthly as keyof typeof c.more]!;
  const [mAmount, mUnit] = monthlyFigure(more);
  const [yearTerm, afterYear, monthTerm] = c.price.terms;
  if (!yearTerm || !afterYear || !monthTerm)
    throw new Error('/insiders expected the Insiders card to have three terms.');
  const [free, counts] = splitFirst(yearTerm);
  return [
    `<section id="pricing" class="sec in-pricing inverse" aria-labelledby="in-pricing-title">`,
    `<div class="wrap">`,
    `<div class="in-pricing-head rv"><h2 id="in-pricing-title" class="h-section">${esc(V2_INSIDERS.plans)}</h2></div>`,
    `<div class="in-plans">`,
    plan(year, c.price.amount, c.price.unit, [yearTerm, afterYear], c.button, 'primary', 'is-year'),
    plan(monthly, mAmount, mUnit, [monthTerm], more, 'secondary'),
    `</div>`,
    `<div class="stub" data-in aria-hidden="true">`,
    `<div class="stub-l"><span class="mono">${esc(c.price.unit)}</span><span class="stub-amt tnum">${esc(c.price.amount)}</span></div>`,
    `<div class="stub-perf"></div>`,
    `<div class="stub-r"><span class="mono">${esc(free)}</span><span class="stub-to">${esc(counts)}</span></div>`,
    `</div>`,
    `<p class="in-cancel rv">${ringDot(16)}<span>${esc(c.lines[3]!)}</span></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Who it's for, and /pricing's "Which plan do I need?": the other three programs, by their own lines. */
function fit(): string {
  const which = FAQ.items.find((f) => f.q === 'Which plan do I need?');
  if (!which) throw new Error('/insiders expected /pricing to ask "Which plan do I need?".');
  const others = KIT_PROGRAMS.filter((p) => p.label !== MEMBERSHIP_NAME);
  return [
    `<section class="sec in-fit" aria-labelledby="in-fit-title">`,
    `<div class="wrap in-fit-grid">`,
    `<div class="in-fit-col rv"><h2 id="in-fit-title" class="h-sub">${esc(FACT_LABELS.forWho)}</h2>${checks([c.forWho])}</div>`,
    `<div class="in-fit-col in-fit-not rv" style="--d:100ms"><h2 class="h-sub">${esc(which.q)}</h2><ul class="elsewhere" role="list">${others
      .map(
        (p) =>
          `<li><a class="else" href="${esc(p.href)}"><span class="else-who">${esc(p.who)}</span><span class="else-go">${esc(p.label)} ${glyph('arrow', 16)}</span></a></li>`,
      )
      .join('')}</ul></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** /pricing's own questions that are about Insiders, word for word. */
const QUESTIONS = [
  'Can I cancel?',
  'Can I buy one skill?',
  'Do I need Claude or ChatGPT?',
  'What’s the refund policy?',
] as const;

function questions(): string {
  const items = QUESTIONS.map((q) => {
    const item = FAQ.items.find((f) => f.q === q);
    if (!item) throw new Error(`/insiders expected /pricing to ask "${q}".`);
    return item;
  });
  return faq(items, { title: FAQ.heading });
}

/** Everything inside <body>. */
export function renderInsidersBody(): string {
  const skills = insidersSkills();
  return [
    kitSkip(),
    kitHeader(INSIDERS_META.path),
    `<main id="main" tabindex="-1">`,
    hero(skills),
    inside(skills),
    runs(),
    pricing(),
    fit(),
    proofSection(PROOF),
    questions(),
    closeCta({
      title: END.heading,
      lead: END.body,
      actions: button(END.button, FREE_SKILLS_HREF),
      free: true,
      cls: 'end',
    }),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderInsidersHead;
export const renderBody = renderInsidersBody;
