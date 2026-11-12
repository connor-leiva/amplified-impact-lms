// /agents, the Amplified Agent Plan's sales page, as strings (DECISIONS.md D-114): the v2 mockup's
// AgentPlanPage, built on the kit (`../kit/`), with every word, date, price, link and state the live
// page has: `content.ts`, the card's own words (`AGENT_PLAN`) and the shared sales pieces.
//
// Built once by `../site/vite-plugin.ts` into `dist/agents.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /pricing: the two carts' state and Payment Links, and the login line's
// day. Both links, monthly and yearly, are in the markup and show together; nothing swaps an href.
//
// NO SCRIPT NEEDED. The mockup's skill cards and starter-path cards (`./examples.ts`) are made up, and
// off. Every string goes through `esc()`.

import { OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { AGENT_CARTS, offerActions, offerPrice, proofLine, SHARE_IMAGE, stateToken } from '../site/offers';
import { siteHead } from '../site/render';
import { glyph, ripple } from '../kit/icons';
import { button, closeCta, exTag, eyebrow, faq, headline, pad2, proofSection, status } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { PROOF } from '../team-build/content';
import {
  AFTER_BUY,
  AGENTS_END,
  AGENTS_FAQ,
  AGENTS_HERO,
  AGENTS_META,
  OFFICE_HOURS,
  ROTATION,
  STARTER,
} from './content';
import { EXAMPLES_ON, FAN, STARTER_CARDS } from './examples';

/** The Library card for a slug: a build error when there is none, so a link never names a missing page. */
export function libraryCard(slug: string): Entry {
  const e = ENTRIES.find((x) => x.href === `/${slug}`);
  if (!e) throw new Error(`/agents names /${slug}, but no Library card links to it. Fix src/agents/content.ts.`);
  return e;
}

export function renderAgentsHead(): string {
  return siteHead({ ...AGENTS_META, image: SHARE_IMAGE });
}

/** The price and the two carts' links, both showing, the proof right under them; "Opens soon." until they sell. */
function buy(): string {
  return [
    `<div class="plan buy ag-buy" id="join" data-state="${stateToken(AGENT_CARTS[0])}">`,
    offerPrice('agentPlan'),
    offerActions('agentPlan', { proof: true }),
    `</div>`,
  ].join('');
}

/** The mockup's three skill cards, fanned: made up, tagged, never by the price or a button. */
function fan(): string {
  const slots = ['front', 'right', 'left'];
  const cards = FAN.map((c, i) => {
    const e = libraryCard(c.slug);
    const body =
      c.body.kind === 'bubble'
        ? `<p class="fan-bubble">${esc(c.body.text)}</p>`
        : c.body.kind === 'copy'
          ? `<p class="fan-copy">${esc(c.body.text)}</p>`
          : `<dl class="fan-terms">${c.body.rows
              .map(
                ([k, v, r]) =>
                  `<div><dt>${esc(k)}</dt><dd class="tnum">${esc(v)}${r ? `<span class="mono fan-risk">${esc(r)}</span>` : ''}</dd></div>`,
              )
              .join('')}</dl>`;
    const front = i === 0;
    return `<article class="fan-card is-${slots[i]}"${front ? '' : ' aria-hidden="true"'}><header class="fan-head"><span class="mono fan-tag">${esc(c.tag)}</span><a class="fan-name" href="${esc(
      e.href!,
    )}"${front ? '' : ' tabindex="-1"'}>${esc(e.title)}</a></header><p class="mono fan-meta">${esc(c.meta)}</p>${body}<ul class="fan-foot" role="list">${c.foot
      .map((f) => `<li>${glyph('check', 14)}${esc(f)}</li>`)
      .join('')}</ul></article>`;
  }).join('');
  return `<div class="fan"><div class="fan-stage">${cards}</div><div class="fan-dots">${exTag()}</div></div>`;
}

function hero(examples: boolean): string {
  const h = AGENTS_HERO;
  return [
    `<section class="sec ag-hero" aria-labelledby="ag-title" data-scroll="exit">`,
    `<div class="ag-ripple" aria-hidden="true">${ripple(860, { intro: true })}</div>`,
    `<div class="wrap ag-hero-grid${examples ? '' : ' is-solo'}">`,
    `<div class="ag-hero-copy">`,
    eyebrow(h.eyebrow, { icon: 'ai-employee' }),
    `<h1 id="ag-title" class="h-hero ag-title">${headline(h.title)}</h1>`,
    `<p class="lead lede fade-1">${esc(h.lede)}</p>`,
    buy(),
    `</div>`,
    examples ? `<div class="ag-hero-art">${fan()}</div>` : '',
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** A step's small made-up card (`./examples.ts`), by its place on the path. */
function starterCard(i: number): string {
  const c = STARTER_CARDS;
  if (i === 0)
    return `<dl class="fs-card fs-brain">${c.brain.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  if (i === 1)
    return `<div class="fs-card fs-voice">${[c.voice.generic, c.voice.you]
      .map(
        (v, j) =>
          `<div class="fs-say${j ? ' is-you' : ''}"><p class="mono fs-who">${esc(v.label)}</p><p class="fs-quote${j ? ' is-you' : ''}">${esc(v.text)}</p></div>`,
      )
      .join('')}</div>`;
  return `<div class="fs-card fs-pick"><p class="mono fs-count">${esc(c.pick.count)}</p><p class="fs-chips">${c.pick.slugs
    .map(
      (s, j) =>
        `<span class="fs-chip${j < c.pick.picked ? ' is-on' : ''}">${j < c.pick.picked ? glyph('check', 14) : ''}${esc(libraryCard(s).title)}</span>`,
    )
    .join('')}</p></div>`;
}

/** Your first week: the starter path's three steps, numbered along a line. */
function starter(examples: boolean): string {
  const steps = STARTER.steps
    .map((s, i) => {
      const e = s.slug ? libraryCard(s.slug) : null;
      const title = e ? `<a href="${esc(e.href!)}">${esc(e.title)}</a>` : esc('title' in s ? s.title : '');
      return `<li class="fs" style="--si:${i}"><span class="fs-node mono" aria-hidden="true">${pad2(i + 1)}</span><h3 class="fs-name">${title}</h3><p class="fs-text">${esc(
        s.body,
      )}</p>${examples ? starterCard(i) : ''}</li>`;
    })
    .join('');
  return [
    `<section class="sec first starter" aria-labelledby="starter-title">`,
    `<div class="wrap">`,
    `<div class="first-head rv"><h2 id="starter-title" class="h-section">${esc(STARTER.heading)}</h2><p class="first-note section-lede">${esc(STARTER.lede)}${
      examples ? ` ${exTag()}` : ''
    }</p></div>`,
    `<ol class="first-steps steps" role="list" data-in>${steps}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/**
 * One live training a week: the four weeks' topics around the mockup's wheel (a drawing, hidden from
 * screen readers), and each week's three skills by their Library cards beside it.
 */
function rotation(): string {
  const r = ROTATION;
  const panels = r.weeks
    .map(
      (w) =>
        `<li class="rot-panel week"><div class="rot-k"><p class="mono week-n">${esc(r.weekLabel)} ${w.n}</p><h3 class="mono rot-topic">${esc(w.topic)}</h3></div><ul class="rot-skills week-skills" role="list">${w.skills
          .map((s, i) => {
            const e = libraryCard(s);
            return `<li style="--ri:${i}"><a class="rot-skill" href="${esc(e.href!)}"><span class="rot-sn">${esc(e.title)}</span>${glyph('arrow', 18, 'rot-go')}</a></li>`;
          })
          .join('')}</ul></li>`,
    )
    .join('');
  const stations = r.weeks
    .map(
      (w, i) =>
        `<div class="station" style="--a:${i * 90}deg"><span class="station-in${i === 0 ? ' is-on' : ''}"><span class="mono">${esc(r.weekLabel)} ${w.n}</span><span class="station-t">${esc(
          w.topic,
        )}</span></span></div>`,
    )
    .join('');
  return [
    `<section id="training" class="sec rot rotation-section" aria-labelledby="rotation-title">`,
    `<div class="wrap rot-grid">`,
    `<div class="rot-copy rv"><h2 id="rotation-title" class="h-section">${esc(r.heading)}</h2><p class="intro section-lede">${esc(r.lede)}</p>${status(
      esc(r.when),
      {
        tone: 'muted',
        cls: 'rotation-when',
      },
    )}<ol class="rot-panels week-grid" role="list">${panels}</ol></div>`,
    `<div class="rot-art" aria-hidden="true"><div class="ring" style="--r:0deg"><div class="ring-rp">${ripple(640, { center: false })}</div><div class="ring-rot">${stations}</div><div class="ring-center"><span class="mono">${esc(
      r.weekLabel,
    )}</span><span class="ring-num tnum">${r.weeks[0]!.n}</span></div></div></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Office hours, with the hour drawn on a clock: its day, start and length are the body's own words. */
function officeHours(): string {
  const o = OFFICE_HOURS;
  const m = /^Every (\w+day), (\d+):(\d\d) PM (\w+), (\d+) minutes/.exec(o.body);
  if (!m)
    throw new Error('OFFICE_HOURS no longer reads "Every <Day>, H:MM PM <Zone>, N minutes". Fix src/agents/render.ts.');
  const [, day, hh, mm, zone, minutes] = m;
  const end = Number(hh) + Number(minutes) / 60;
  const endH = Math.floor(end);
  const endM = Math.round((end - endH) * 60);
  const time = `${hh}:${mm} to ${endH}:${String(endM).padStart(2, '0')} PM`;
  const ticks = Array.from(
    { length: 12 },
    (_, i) =>
      `<line class="clock-tick${i % 3 === 0 ? ' is-major' : ''}" x1="160" y1="22" x2="160" y2="${i % 3 === 0 ? 38 : 32}" transform="rotate(${i * 30} 160 160)"/>`,
  ).join('');
  return [
    `<section class="sec oh" aria-labelledby="oh-title">`,
    `<div class="wrap oh-grid">`,
    `<div class="oh-copy rv"><h2 id="oh-title" class="h-section">${esc(o.heading)}</h2><p class="lead section-lede">${esc(o.body)}</p>${status(esc(o.recorded), { tone: 'muted', cls: 'section-lede' })}</div>`,
    `<div class="clock" aria-hidden="true" data-in><svg viewBox="0 0 320 320" aria-hidden="true" focusable="false"><circle class="clock-face" cx="160" cy="160" r="150"/>${ticks}<circle class="clock-arc" cx="160" cy="160" r="122" pathLength="1" transform="rotate(-90 160 160)"/><line class="clock-hour" x1="160" y1="160" x2="160" y2="92"/><line class="clock-min" x1="160" y1="160" x2="160" y2="56"/><circle class="clock-hub" cx="160" cy="160" r="6"/></svg><p class="clock-label"><span class="mono">${esc(
      day!,
    )}</span><span class="clock-t">${esc(time)}</span><span class="mono">${esc(zone!)}</span></p></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** What happens after you buy, on the other theme: four numbered steps on a rail. */
function after(): string {
  const steps = AFTER_BUY.steps
    .map((s, i) => {
      const body =
        'body' in s
          ? esc(s.body)
          : `<span class="invites-held">${esc(s.held.before)}${T.loginDay}${esc(s.held.after)}</span><span class="invites-sent">${esc(s.sent)}</span>`;
      return `<li class="after-step" style="--i:${i}"><span class="after-node mono" aria-hidden="true">${pad2(i + 1)}</span><div class="after-txt"><h3 class="after-name">${esc(
        s.title,
      )}</h3><p class="after-text">${body}</p></div></li>`;
    })
    .join('');
  return [
    `<section class="sec after after-buy inverse" aria-labelledby="after-title">`,
    `<div class="wrap after-grid">`,
    `<div class="after-head rv"><h2 id="after-title" class="h-section">${esc(AFTER_BUY.heading)}</h2></div>`,
    `<ol class="after-list steps" role="list">${steps}<li class="after-rail" aria-hidden="true"><span></span></li></ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The close: "Start the week of January 4.", its button back to the buy block, the proof, and not-ready. */
function end(): string {
  const e = AGENTS_END;
  return closeCta({
    title: e.heading,
    actions: `${button(e.button, '#join')}${proofLine()}<p class="end-more">${esc(e.notReadyBefore)}<a class="inline-link" href="${esc(FREE_SKILLS_HREF)}">${esc(e.notReadyLink)}</a>${esc(
      e.notReadyAfter,
    )}</p>`,
    free: true,
    cls: 'end',
  });
}

/** Everything inside <body>, in Spring's order. `examples` turns on the made-up illustrations. */
export function renderAgentsBody({ examples = EXAMPLES_ON } = {}): string {
  return [
    kitSkip(),
    kitHeader('/agents'),
    `<main id="main" tabindex="-1">`,
    hero(examples),
    proofSection(PROOF),
    starter(examples),
    rotation(),
    officeHours(),
    after(),
    faq(AGENTS_FAQ.items, { title: AGENTS_FAQ.heading }),
    end(),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderAgentsHead;
export const renderBody = (): string => renderAgentsBody();
