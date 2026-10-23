// /retool's markup, as one string, from `content.ts`. DECISIONS.md D-046.
//
// Built from /ai101's own building blocks (`../ai101/render.ts`), as /voice-profile is (D-040), so
// the screens look, read and work as /ai101's do and run on /ai101's script (`../ai101/main.ts`):
// the step-through, the fields that fill the prompts, Copy & Open, the Claude / ChatGPT switch. What
// is this page's own: the screens' words and layout, the team-size opt-in, and "Copy the Script".
//
// THE GATE sits part way down, on its own screen (`#kit`), not on the welcome screen as on
// /voice-profile: the audit, reading its map and its build steps (D-047) before it are open to
// anyone, as the talk needs (content.ts has why). It is `data-gate`, and `main.ts` treats a gate
// anywhere in the list the same way: until this device has signed up, no screen after it can be
// shown. Without the script, the screens after it sit in
// `#unlocked`, hidden until the form's 303 lands there and `:target` shows them. A soft gate, as lead
// magnets are.
//
// Every string goes through `esc()`; nothing here runs in the browser.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import {
  HONEYPOT_LABEL,
  callout,
  card,
  circled,
  copyOpenButton,
  esc,
  fillFields,
  h2,
  inline,
  linkButton,
  logo,
  promptBlock,
  screenSection,
  stepsCard,
  stepsHeader,
  stepsNav,
  switchOf,
} from '../ai101/render';
import { UI } from '../ai101/content';
import { RETOOL } from './content';

const screen = (index: number, body: string[], className = '', extraAttrs = '') =>
  screenSection(RETOOL.screens[index]!, index, body, className, extraAttrs);
const anchorOf = (index: number) => RETOOL.screens[index]!.anchor;

/** The prompt blocks' ids: anchors a link can point at, and what the buttons that copy them name. */
export const BLOCK = {
  audit: 'audit-prompt',
  build: 'build-prompt',
  coordinator: 'coordinator-prompt',
  script: 'retool-script',
} as const;

/** The <head> lines that come from `content.ts`: the title and the link-preview metadata. */
export function renderRetoolHead(): string {
  const { title, description, url, siteName } = RETOOL.meta;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
}

/** A card of titled tiles: the three doors, the three buckets. */
function tiles(items: ReadonlyArray<{ title: string; body: string; examples?: string }>, className = ''): string {
  const rows = items
    .map(
      (t) =>
        `<li class="card tile${className ? ` ${className}` : ''}"><strong>${esc(t.title)}</strong>` +
        `<span>${esc(t.body)}</span>` +
        (t.examples ? `<span class="muted">${esc(t.examples)}</span>` : '') +
        `</li>`,
    )
    .join('');
  return `<ul class="tiles" role="list">${rows}</ul>`;
}

/**
 * A button that only copies a prompt block's text, as filled in right now, and stays on the page
 * (`data-copy-prompt`, main.ts): for words the visitor pastes into a chat already open (the build
 * steps, D-049) or says out loud (the script). Hidden until the script runs, which it needs.
 */
const copyPromptButton = (blockId: string, copy: { label: string; toast: string }) =>
  `<button type="button" class="btn btn-primary" data-copy-prompt="${esc(blockId)}" ` +
  `aria-describedby="${esc(blockId)}-label" data-toast="${esc(copy.toast)}" hidden data-js-only>` +
  `${esc(copy.label)}</button>`;

/** A list with terracotta dots, as /ai101's "What you own" has it. */
const dotted = (items: readonly string[]) =>
  `<ul class="dotted" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

function welcome(): string {
  const w = RETOOL.welcome;
  return screen(0, [
    logo(signatureSvg, w.logoAlt, 'logo'),
    `<p class="eyebrow">${esc(w.eyebrow)}</p>`,
    `<h1 id="${esc(anchorOf(0))}-heading" tabindex="-1">${esc(w.title)}</h1>`,
    `<p class="lede">${esc(w.intro)}</p>`,
    `<div class="builds"><p class="builds-lead">${esc(w.buildsLead)}</p>` +
      circled(w.builds.map((b) => `<span><strong>${esc(b.name)}</strong>${esc(b.detail)}</span>`)) +
      `</div>`,
    `<p class="muted">${esc(w.plain)}</p>`,
    `<a class="skip" href="${esc(w.skip.href)}">${esc(w.skip.label)}</a>`,
  ]);
}

function doors(): string {
  const d = RETOOL.doors;
  return screen(1, [
    h2(anchorOf(1), d.heading),
    `<p class="lede">${esc(d.intro)}</p>`,
    tiles(d.doors, 'door'),
    callout(esc(d.question), 'tip', true),
  ]);
}

function sort(): string {
  const s = RETOOL.sort;
  return screen(2, [
    h2(anchorOf(2), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    tiles(s.buckets, 'bucket'),
    stepsCard(s.questionsHeading, s.questions),
    callout(esc(s.never), 'warn', true),
  ]);
}

function audit(): string {
  const a = RETOOL.audit;
  return screen(3, [
    h2(anchorOf(3), a.heading),
    `<p class="lede">${esc(a.intro)}</p>`,
    fillFields(a.fields),
    `<p class="path-lead">${esc(a.pick)}</p>`,
    `<div class="stack">${a.open.map((o) => copyOpenButton(o, BLOCK.audit)).join('')}</div>`,
    stepsCard(a.thenHeading, a.then),
    promptBlock(RETOOL.auditPrompt, BLOCK.audit, a.showPrompt),
  ]);
}

function read(): string {
  const r = RETOOL.read;
  return screen(4, [
    h2(anchorOf(4), r.heading),
    `<p class="lede">${esc(r.intro)}</p>`,
    stepsCard(null, r.steps),
    callout(esc(r.session), 'tip'),
  ]);
}

/**
 * The build (D-047), asked in the same chat as the map (D-049): first the way past it for a map that
 * picked contract-to-close (the kit has that one written), then one copy-only button, the way the
 * script's is (`data-copy-prompt`), and the steps back in that chat. Nothing to paste into this page
 * and no new chat to open. The button needs the script, so it is `hidden data-js-only`; without it the
 * request is in the block below, to select and copy.
 */
function build(): string {
  const b = RETOOL.build;
  return screen(5, [
    h2(anchorOf(5), b.heading),
    callout(esc(b.skip), 'tip'),
    `<p class="lede">${esc(b.intro)}</p>`,
    `<p class="path-lead">${esc(b.copyLead)}</p>`,
    copyPromptButton(BLOCK.build, b.copy),
    stepsCard(b.thenHeading, b.then),
    `<p class="small muted">${inline(b.lost)}</p>`,
    callout(esc(b.safety), 'warn'),
    promptBlock(RETOOL.buildPrompt, BLOCK.build, b.showPrompt),
  ]);
}

/** A gate input with a visually hidden label (the placeholder shows, as on /ai101's waitlist). */
function gateField(name: 'firstName' | 'email', placeholder: string, attrs: string): string {
  const id = `gate-${name}`;
  return (
    `<div class="wl-field"><label class="visually-hidden" for="${id}">${esc(placeholder)}</label>` +
    `<input id="${id}" name="${name}" placeholder="${esc(placeholder)}" ${attrs}>` +
    `<p class="field-error" id="${name}-error"></p></div>`
  );
}

/**
 * The team size, a <select> drawn like the inputs. Its first option is the prompt, "Team size",
 * empty and not choosable again, so `required` holds a form posted without the script, and the
 * script (main.ts) reads '' as "not chosen" and says so. The values are the API's `TEAM_SIZES`.
 */
function teamSizeField(): string {
  const g = RETOOL.gate;
  const options = g.teamSizes.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  return (
    `<div class="wl-field"><label class="visually-hidden" for="gate-teamSize">${esc(g.fields.teamSize)}</label>` +
    `<select id="gate-teamSize" name="teamSize" required>` +
    `<option value="" selected disabled>${esc(g.fields.teamSize)}</option>${options}</select>` +
    `<p class="field-error" id="teamSize-error"></p></div>`
  );
}

/**
 * The opt-in, on /ai101's dark waitlist card, as its own screen. Without JavaScript a plain POST
 * (native validation; no `novalidate` in the markup), answered with a 303 to `#unlocked` or
 * `#guide-error`. With it, `main.ts` posts JSON and opens the next screen.
 */
function gate(): string {
  const g = RETOOL.gate;
  const form = [
    `<form id="gate-form" class="wl-form" method="post" action="/api/${esc(RETOOL.slug)}">`,
    gateField('firstName', g.fields.firstName, 'type="text" required autocomplete="given-name" maxlength="80"'),
    gateField('email', g.fields.email, 'type="email" required autocomplete="email" maxlength="254" inputmode="email"'),
    teamSizeField(),
    `<div class="wl-sms"><input id="gate-december" name="decemberInterest" type="checkbox" value="on">` +
      `<label for="gate-december">${esc(g.december)}</label></div>`,
    `<div class="field-website" aria-hidden="true">`,
    `<label for="gate-website">${esc(HONEYPOT_LABEL)}</label>`,
    `<input id="gate-website" name="website" type="text" tabindex="-1" autocomplete="off">`,
    `</div>`,
    `<p class="form-error" id="guide-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="btn btn-cream">${esc(g.button)}</button>`,
    `<p class="wl-legal">${inline(g.legal)}</p>`,
    `</form>`,
  ].join('\n');
  return screen(
    6,
    [
      logo(signatureReversedSvg, g.logoAlt, 'logo logo-reversed'),
      `<p class="eyebrow eyebrow-mint">${esc(g.eyebrow)}</p>`,
      h2(anchorOf(6), g.heading),
      `<p class="wl-body">${esc(g.body)}</p>`,
      `<p id="gate-joined" class="wl-success" tabindex="-1">${esc(g.success)}</p>`,
      form,
    ],
    'waitlist kit-gate',
    ` data-gate data-unlock-key="${esc(RETOOL.unlockKey)}"`,
  );
}

/**
 * Hire the Coordinator: the four parts, the two blanks, then a Claude / ChatGPT switch (`data-pick`,
 * /ai101's Save switch, remembered the same way) over each app's Copy & Open and its steps. Without the
 * script both panels show, each under its app's name.
 */
function coordinator(): string {
  const c = RETOOL.coordinator;
  const panel = (key: 'claude' | 'chatgpt') => {
    const p = c[key];
    return (
      `<div class="card pick-panel" data-pick-panel="${key}">` +
      `<h3 class="pick-title">${esc(p.tab)}</h3>` +
      copyOpenButton(p.open, BLOCK.coordinator) +
      `<ol class="numbered" role="list">${p.steps.map((st) => `<li><span>${inline(st)}</span></li>`).join('')}</ol>` +
      `</div>`
    );
  };
  return screen(7, [
    h2(anchorOf(7), c.heading),
    `<p class="lede">${esc(c.intro)}</p>`,
    `<a class="skip" href="${esc(c.skip.href)}">${esc(c.skip.label)}</a>`,
    `<p class="path-lead">${esc(c.partsLead)}</p>`,
    circled(c.parts.map((p) => `<span><strong>${esc(p.name)}</strong>${esc(p.detail)}</span>`)),
    `<p class="path-lead">${esc(c.fieldsLead)}</p>`,
    fillFields(c.fields),
    switchOf('data-pick', c.pickLabel, [
      ['claude', c.claude.tab],
      ['chatgpt', c.chatgpt.tab],
    ]),
    panel('claude'),
    panel('chatgpt'),
    promptBlock(RETOOL.coordinatorPrompt, BLOCK.coordinator, c.showPrompt),
    callout(esc(c.keyLines), 'tip'),
  ]);
}

function firstFile(): string {
  const f = RETOOL.firstFile;
  const titled = (heading: string, inner: string) =>
    card(`<h3 class="card-title card-title-lg">${esc(heading)}</h3>${inner}`);
  return screen(8, [
    h2(anchorOf(8), f.heading),
    // Before the binder, so nothing is uploaded before it is read (D-049).
    callout(inline(f.guardrails), 'warn', true),
    titled(
      f.binder.heading,
      `<p class="muted">${esc(f.binder.intro)}</p>${dotted(f.binder.items)}` +
        f.binder.how.map((h) => `<p class="small muted">${inline(h)}</p>`).join(''),
    ),
    titled(f.assignment.heading, `<p class="muted">${esc(f.assignment.body)}</p>`),
    titled(f.manager.heading, `<p class="muted">${esc(f.manager.body)}</p>`),
    `<p class="note">${esc(f.crm)}</p>`,
  ]);
}

/**
 * The Retool Conversation. Its script is words to say, not to paste into an app, so it shows open and
 * its button only copies (`data-copy-prompt`, main.ts), staying on the page. The button needs the
 * script, so it is `hidden data-js-only`, like the fields that fill it.
 */
function conversation(): string {
  const c = RETOOL.conversation;
  return screen(9, [
    h2(anchorOf(9), c.heading),
    `<p class="lede">${esc(c.intro)}</p>`,
    circled(c.moves.map((m) => `<span>${esc(m)}</span>`)),
    `<p class="path-lead">${esc(c.scriptLead)}</p>`,
    fillFields(c.fields),
    copyPromptButton(BLOCK.script, c.copy),
    promptBlock(RETOOL.scriptPrompt, BLOCK.script, c.showScript, true),
    callout(esc(c.worried), 'tip'),
    callout(esc(c.honest), 'warn'),
  ]);
}

function plan(): string {
  const p = RETOOL.plan;
  const weeks = p.weeks
    .map(
      (w) =>
        `<li class="card plan-week">` +
        `<p class="plan-head"><span class="week-label">${esc(w.week)}<span class="visually-hidden">:</span></span> ` +
        `<span class="week-pillar">${esc(w.focus)}</span></p>` +
        `<p>${esc(w.doThis)}</p>` +
        `<p class="small muted"><strong>${esc(p.measureLabel)}:</strong> ${esc(w.measure)}</p>` +
        `</li>`,
    )
    .join('');
  return screen(10, [
    h2(anchorOf(10), p.heading),
    `<p class="lede">${esc(p.intro)}</p>`,
    `<ol class="plan" role="list">${weeks}</ol>`,
    // Under Week 4, which says to pick the next one (D-049).
    card(`<h3 class="card-title card-title-lg">${esc(p.next.heading)}</h3>${dotted(p.next.items)}`),
    callout(esc(p.dayThirty), 'tip', true),
  ]);
}

function forward(): string {
  const f = RETOOL.forward;
  const y = f.yourself;
  const r = f.review;
  // The booking button only once there is a link to book on; until then, the talk's own ask.
  const book = r.button.href ? linkButton(r.button, 'primary') : `<p class="small muted">${esc(r.pending)}</p>`;
  return screen(11, [
    h2(anchorOf(11), f.heading),
    card(
      `<h3 class="card-title card-title-lg">${esc(y.title)}</h3><p class="muted">${esc(y.body)}</p>` +
        `<a class="skip" href="${esc(y.link.href)}">${esc(y.link.label)}</a>`,
      'card-roomy',
    ),
    card(
      `<h3 class="card-title card-title-lg">${esc(r.title)}</h3><p class="muted">${esc(r.body)}</p>${book}`,
      'card-roomy card-accent',
    ),
  ]);
}

/** Everything inside <body>: the header, the open screens, the gate, the gated ones, the footer, the toast. */
export function renderRetoolBody(): string {
  return [
    stepsHeader(RETOOL.screens),
    `<main class="page" data-steps data-state-key="${esc(RETOOL.stateKey)}">`,
    welcome(),
    doors(),
    sort(),
    audit(),
    read(),
    build(),
    gate(),
    `<div id="${esc(RETOOL.gate.unlockedAnchor)}" class="gated">`,
    coordinator(),
    firstFile(),
    conversation(),
    plan(),
    forward(),
    `</div>`,
    `</main>`,
    stepsNav(RETOOL.screens, RETOOL.nav),
    // /ai101's one polite live region, by the id its script looks for.
    `<p id="ai101-live" class="toast" role="status" aria-live="polite"></p>`,
  ].join('\n');
}
