// /free, Free Resources, as strings (DECISIONS.md D-116): the v2 mockup's FreeResourcesPage, built on the
// kit (`../kit/`), with the live page's words and links: Spring's two columns, each resource by its
// Library card (`../library/content.ts`), and the AI 101 sign-up on Spring's own site.
//
// NO SCRIPT NEEDED and no token: the page is the same for everyone. The kit's script only animates. The
// mockup's previews and panels (`./examples.ts`) are made up, and off. Every string goes through `esc()`.

import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { siteHead } from '../site/render';
import { brandIcon, glyph, ringDot, ripple, type BrandIconName } from '../kit/icons';
import { button, closeCta, exTag, eyebrow, headline, pad2 } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { AI101_SIGNUP, COLUMNS, FREE_HERO, FREE_META, OPEN_LABEL, SKILLS, V2_LABELS } from './content';
import { AGENT_PREVIEWS, EXAMPLES_ON, OWNER_PANELS } from './examples';

/** A resource's Library card, by its page: a build error when there is none. */
export function resource(slug: string): Entry {
  const e = ENTRIES.find((x) => x.href === `/${slug}`);
  if (!e) throw new Error(`/free names /${slug}, but no Library card links to it. Fix src/free/content.ts.`);
  return e;
}

export function renderFreeHead(): string {
  return siteHead(FREE_META);
}

/** Each column's section id and brand icon, in `COLUMNS` order: the agents', then the owners'. */
const COLUMN_LOOK: readonly { id: string; icon: BrandIconName }[] = [
  { id: 'agents', icon: 'ai-employee' },
  { id: 'owners', icon: 'team-hub' },
];
const OWNER_ICONS: readonly BrandIconName[] = ['analytics', 'checklist', 'ai-employee'];

/** A column's items: its resources' titles, and for the agents', AI 101's sign-up. */
const namesOf = (i: number) => [
  ...COLUMNS[i]!.slugs.map((s) => resource(s).title),
  ...(i === 0 ? [AI101_SIGNUP.label] : []),
];

/** The mockup's two doors: a link to each column, with what's in it. */
function doors(): string {
  return COLUMNS.map((c, i) => {
    const look = COLUMN_LOOK[i]!;
    const names = namesOf(i);
    return `<a class="door" href="#${look.id}"><span class="door-top"><span class="door-ic">${brandIcon(look.icon, 24)}</span><span class="mono door-n">${esc(
      V2_LABELS.doorCount(names.length),
    )}</span></span><span class="door-name">${esc(c.heading)}</span><ul class="door-list" role="list">${names
      .map((n) => `<li>${ringDot(12)}<span>${esc(n)}</span></li>`)
      .join('')}</ul><span class="door-go">${esc(V2_LABELS.doorGo)} ${glyph('arrow', 18)}</span></a>`;
  }).join('');
}

function hero(): string {
  const h = FREE_HERO;
  return [
    `<section class="sec fr-hero free-hero" aria-labelledby="free-title" data-scroll="exit">`,
    `<div class="wrap fr-hero-in">`,
    eyebrow(h.eyebrow, { icon: 'checklist', cls: 'eyebrow' }),
    `<h1 id="free-title" class="h-hero fr-title">${headline(h.title)}</h1>`,
    `<p class="lead section-lede fade-1">${esc(h.lede)}</p>`,
    `</div>`,
    `<div class="wrap"><div class="doors"><div class="doors-rp" aria-hidden="true">${ripple(900, { intro: true, center: false })}</div>${doors()}</div></div>`,
    `</section>`,
  ].join('\n');
}

/** A made-up preview over an agents' card (`./examples.ts`). */
function agentPreview(key: keyof typeof AGENT_PREVIEWS): string {
  const p = AGENT_PREVIEWS[key];
  if (p.kind === 'voice')
    return `<div class="pv-voice">${[p.generic, p.you]
      .map(
        (v, j) =>
          `<p class="mono pv-who">${esc(v.label)}</p><p class="pv-quote${j ? ' is-you' : ''}">${esc(v.text)}</p>`,
      )
      .join('')}</div>`;
  if (p.kind === 'slide')
    return `<div class="pv-car"><div class="pv-slide"><span class="mono pv-slide-k">${esc(p.n)}</span><span class="pv-slide-t">${esc(p.text)}</span><span class="mono pv-slide-s">${esc(
      p.foot,
    )}</span></div></div>`;
  return `<div class="pv-live"><div class="pv-live-top"><span class="mono">${esc(p.title)}</span><span class="pv-live-on"><span class="pv-live-dot"></span><span class="mono">${esc(
    p.live,
  )}</span></span></div><p class="pv-live-t">${esc(p.text)}</p><p class="mono pv-live-host">${esc(p.host)}</p></div>`;
}

/** One agents' card: its kind, its title as the link, its card's description, and Open. */
function agentCard(e: Entry, slug: string, examples: boolean, i: number): string {
  const pv = examples
    ? `<div class="fr-pv">${slug === 'signup' ? '' : `<span class="fr-pv-tag">${exTag()}</span>`}${agentPreview(slug as keyof typeof AGENT_PREVIEWS)}</div>`
    : '';
  return `<li class="fr-card card res rv" style="--d:${i * 100}ms">${pv}<div class="fr-body"><p class="mono fr-type">${esc(e.kind)}</p><h3 class="fr-name"><a href="${esc(
    e.href!,
  )}">${esc(e.title)}</a></h3><p class="fr-text">${esc(e.description)}</p><p class="fr-open res-open" aria-hidden="true">${esc(OPEN_LABEL)} ${glyph('arrow', 18)}</p></div></li>`;
}

function agents(examples: boolean): string {
  const c = COLUMNS[0]!;
  const cards = c.slugs.map((s, i) => agentCard(resource(s), s, examples, i));
  // AI 101's registration goes with the agents' column (Spring's plan), on Spring's site.
  const signup = `<li class="fr-card card res res-ext rv" style="--d:${c.slugs.length * 100}ms">${
    examples ? `<div class="fr-pv">${agentPreview('signup')}</div>` : ''
  }<div class="fr-body"><p class="mono fr-type">${esc(V2_LABELS.signupKind)}</p><h3 class="fr-name"><a href="${esc(AI101_SIGNUP.href)}" rel="noopener">${esc(
    AI101_SIGNUP.label,
  )}</a></h3><p class="fr-text">${esc(AI101_SIGNUP.body)}</p><p class="fr-open res-open" aria-hidden="true">ai.springb.co ${glyph('out', 18)}</p></div></li>`;
  return [
    `<section id="agents" class="sec fr-agents free-col" aria-labelledby="col-0">`,
    `<div class="wrap">`,
    `<div class="fr-head rv">${eyebrow(V2_LABELS.colCount(namesOf(0).length), { mark: true })}<h2 id="col-0" class="h-section">${esc(c.heading)}</h2></div>`,
    `<ul class="fr-cards res-list" role="list">${cards.join('')}${signup}</ul>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The made-up panels beside the owners' three (`./examples.ts`), shown together. */
function ownerPanels(): string {
  const a = OWNER_PANELS['ops-time-audit'];
  const total = a.rows.reduce((n, [, h]) => n + h, 0);
  const ai = a.rows.filter(([, , x]) => x).reduce((n, [, h]) => n + h, 0);
  const top = Math.max(...a.rows.map(([, h]) => h));
  const s = OWNER_PANELS['task-sync-starter'];
  const r = OWNER_PANELS.retool;
  return [
    `<div class="own-panels">`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(resource('ops-time-audit').title)}</span>${exTag()}</div><ul class="audit" role="list">${a.rows
      .map(
        ([t, h, x]) =>
          `<li class="${x ? 'is-ai' : ''}" style="--w:${h / top}"><span class="audit-t">${esc(t)}</span><span class="audit-bar"><span></span></span><span class="audit-h tnum">${h}h</span><span class="mono audit-tag">${
            x ? esc(a.tag) : ''
          }</span></li>`,
      )
      .join(
        '',
      )}</ul><p class="audit-sum"><span class="audit-big tnum">${ai}</span><span>${esc(`${a.totalBefore} ${total} ${a.totalAfter}`)}</span></p></div>`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(resource('task-sync-starter').title)}</span>${exTag()}</div><div class="sync-notes"><p class="mono sync-k">${esc(
      s.notes,
    )}</p>${s.promises
      .map(
        ([who, said, when]) =>
          `<p class="sync-line"><span class="sync-who">${esc(who)}:</span> <span class="sync-said">${esc(said)}</span> ${esc(when)}</p>`,
      )
      .join('')}</div><ul class="sync-tasks" role="list">${s.promises
      .map(
        ([, , , task, owner, due, next]) =>
          `<li><span class="sync-check" aria-hidden="true"></span><span class="sync-task"><span class="sync-name">${esc(task)}</span><span class="sync-next">${esc(`${s.nextLabel} ${next}`)}</span></span><span class="mono sync-owner">${esc(
            owner,
          )}</span><span class="mono sync-due">${esc(due)}</span></li>`,
      )
      .join('')}</ul></div>`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(resource('retool').title)}</span><span class="mono panel-meta">${esc(r.meta)}</span></div><ol class="rt" role="list">${r.steps
      .map(
        (t, i) =>
          `<li class="rt-step"><span class="mono rt-n">${pad2(i + 1)}</span><span class="rt-t">${esc(t)}</span>${
            i === 1 ? `<span class="rt-emp">${brandIcon('ai-employee', 20)}<span>${esc(r.employee)}</span></span>` : ''
          }</li>`,
      )
      .join('')}</ol><p class="jp-tag">${exTag()}</p></div>`,
    `</div>`,
  ].join('');
}

/** The owners' three, on the other theme: each its kind, title, description and Open, as one link. */
function owners(examples: boolean): string {
  const c = COLUMNS[1]!;
  const steps = c.slugs
    .map((slug, i) => {
      const e = resource(slug);
      return `<li class="own-step card res"><span class="own-ic">${brandIcon(OWNER_ICONS[i]!, 20)}</span><div class="own-txt"><p class="mono own-type">${esc(e.kind)}</p><h3 class="own-name"><a href="${esc(
        e.href!,
      )}">${esc(e.title)}</a></h3><p class="own-text">${esc(e.description)}</p></div><p class="own-open res-open" aria-hidden="true">${esc(OPEN_LABEL)} ${glyph('arrow', 16)}</p></li>`;
    })
    .join('');
  return [
    `<section id="owners" class="sec fr-owners free-col inverse" aria-labelledby="col-1">`,
    `<div class="wrap own-grid${examples ? '' : ' is-solo'}">`,
    `<div class="own-copy rv"><div class="own-head">${eyebrow(V2_LABELS.colCount(c.slugs.length), { mark: true })}<h2 id="col-1" class="h-section">${esc(
      c.heading,
    )}</h2></div><ol class="own-steps res-list" role="list">${steps}</ol></div>`,
    examples ? `<div class="own-stage">${ownerPanels()}</div>` : '',
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>. `examples` turns on the made-up previews and panels. */
export function renderFreeBody({ examples = EXAMPLES_ON } = {}): string {
  return [
    kitSkip(),
    kitHeader('/free'),
    `<main id="main" tabindex="-1">`,
    hero(),
    agents(examples),
    owners(examples),
    closeCta({
      title: SKILLS.heading,
      lead: SKILLS.body,
      actions: `${button(SKILLS.button, FREE_SKILLS_HREF)}${button(SKILLS.more, '/pricing', { variant: 'link' })}`,
      free: true,
      cls: 'free-skills',
    }),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderFreeHead;
export const renderBody = (): string => renderFreeBody();
