// /voice-profile's markup, as one string, from `content.ts`. DECISIONS.md D-040.
//
// Built from /ai101's own building blocks (`../ai101/render.ts`), so the screens look, read and work
// exactly as Part I does there, and run on /ai101's script (`../ai101/main.ts`): the step-through,
// the two blanks that fill the prompt, Copy & Open, the Claude / ChatGPT switch and the app-store
// links. Only the welcome screen and the gate are this page's own.
//
// THE GATE. The welcome screen is `data-gate`: its form is the opt-in, and every screen after it is
// in the markup but out of reach until the visitor signs up. With the script, `main.ts` holds the
// step-through at the gate and opens the next screen once the API has stored the sign-up (and on every
// later visit from that device). Without it, the screens after the gate sit in `#unlocked`, hidden
// until the form's 303 lands there and `:target` shows them. A soft gate, as lead magnets are.
//
// Every string goes through `esc()`; nothing here runs in the browser.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import {
  HONEYPOT_LABEL,
  NEW_TAB,
  callout,
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
} from '../ai101/render';
import { UI } from '../ai101/content';
import { VOICE } from './content';

const screen = (index: number, body: string[], className = '', extraAttrs = '') =>
  screenSection(VOICE.screens[index]!, index, body, className, extraAttrs);
const anchorOf = (index: number) => VOICE.screens[index]!.anchor;

/** The <head> lines that come from `content.ts`: the title and the link-preview metadata. */
export function renderVoiceHead(): string {
  const { title, description, url, siteName } = VOICE.meta;
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
 * The opt-in, on /ai101's dark waitlist card. Without JavaScript a plain POST (native validation; no
 * `novalidate` in the markup), answered with a 303 to `#unlocked` or `#guide-error`. With it,
 * `../guides/optin.ts` posts JSON and `main.ts` opens the next screen.
 */
function gateCard(): string {
  const g = VOICE.gate;
  const form = [
    `<form id="gate-form" class="wl-form" method="post" action="/api/${esc(VOICE.slug)}">`,
    gateField('firstName', g.fields.firstName, 'type="text" required autocomplete="given-name" maxlength="80"'),
    gateField('email', g.fields.email, 'type="email" required autocomplete="email" maxlength="254" inputmode="email"'),
    `<div class="field-website" aria-hidden="true">`,
    `<label for="gate-website">${esc(HONEYPOT_LABEL)}</label>`,
    `<input id="gate-website" name="website" type="text" tabindex="-1" autocomplete="off">`,
    `</div>`,
    `<p class="form-error" id="guide-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="btn btn-cream">${esc(g.button)}</button>`,
    `<p class="wl-legal">${inline(g.legal)}</p>`,
    `</form>`,
  ].join('\n');
  return [
    `<div class="gate">`,
    `<p class="gate-title">${esc(g.heading)}</p>`,
    `<p class="wl-body">${esc(g.body)}</p>`,
    `<p id="gate-joined" class="wl-success" tabindex="-1">${esc(g.success)}</p>`,
    form,
    `</div>`,
  ].join('\n');
}

function welcome(): string {
  const w = VOICE.welcome;
  return screen(
    0,
    [
      logo(signatureSvg, w.logoAlt, 'logo'),
      `<p class="eyebrow">${esc(w.eyebrow)}</p>`,
      `<h1 id="${esc(anchorOf(0))}-heading" tabindex="-1">${esc(w.title)}</h1>`,
      `<p class="lede">${esc(w.intro)}</p>`,
      gateCard(),
    ],
    '',
    ` data-gate data-unlock-key="${esc(VOICE.unlockKey)}"`,
  );
}

/** /ai101's "First: get the app and sign in" card, as this page's first step after the gate. */
function getApp(): string {
  const g = VOICE.getApp;
  const apps = g.apps
    .map(
      ({ label, href }) =>
        `<a class="btn btn-outline" href="${esc(href.web)}" ${NEW_TAB} data-ios="${esc(href.ios)}" ` +
        `data-android="${esc(href.android)}" data-get-app>${esc(label)}</a>`,
    )
    .join('');
  return screen(1, [
    h2(anchorOf(1), g.heading),
    `<p class="lede">${esc(g.body)}</p>`,
    `<div class="row">${apps}</div>`,
  ]);
}

function samples(): string {
  const s = VOICE.samples;
  return screen(2, [
    h2(anchorOf(2), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    `<ul class="tiles" role="list">${s.items.map((i) => `<li class="card tile">${esc(i)}</li>`).join('')}</ul>`,
    callout(esc(s.tip), 'tip'),
  ]);
}

function voiceCopy(): string {
  const v = VOICE.voiceCopy;
  const id = `${anchorOf(2)}-prompt`; // "voice-profile-prompt", as on /ai101
  return screen(3, [
    h2(anchorOf(3), v.heading),
    fillFields(v.fields),
    `<div class="stack">${v.open.map((o) => copyOpenButton(o, id)).join('')}</div>`,
    stepsCard(v.thenHeading, v.then),
    promptBlock(VOICE.voicePrompt, id, v.showPrompt),
    `<p class="note">${esc(v.note)}</p>`,
  ]);
}

/** Save it: /ai101's Claude / ChatGPT switch over two panels. */
function save(): string {
  const s = VOICE.save;
  const panel = (key: 'claude' | 'chatgpt') => {
    const p = s[key];
    return (
      `<div class="card pick-panel" data-pick-panel="${key}">` +
      `<h3 class="pick-title">${esc(p.tab)}</h3>` +
      `<ol class="numbered" role="list">${p.steps.map((st) => `<li><span>${inline(st)}</span></li>`).join('')}</ol>` +
      linkButton(p.button, 'primary') +
      `<p class="small muted">${esc(p.note)}</p></div>`
    );
  };
  const pick = (key: 'claude' | 'chatgpt', pressed: boolean) =>
    `<button type="button" data-pick="${key}" aria-pressed="${pressed}">${esc(s[key].tab)}</button>`;
  return screen(4, [
    h2(anchorOf(4), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    `<div class="picker" role="group" aria-label="${esc(s.pickLabel)}" hidden data-js-only>${pick('claude', true)}${pick('chatgpt', false)}</div>`,
    panel('claude'),
    panel('chatgpt'),
  ]);
}

function test(): string {
  const t = VOICE.test;
  return screen(5, [
    h2(anchorOf(5), t.heading),
    `<p class="lede">${esc(t.intro)}</p>`,
    `<div class="pair">` +
      `<div class="card pair-card"><span class="pair-label">${esc(t.before.label)}</span><strong>${esc(t.before.text)}</strong></div>` +
      `<div class="card pair-card pair-after"><span class="pair-label">${esc(t.after.label)}</span><strong>${esc(t.after.text)}</strong></div>` +
      `</div>`,
    callout(esc(t.done), 'tip', true),
  ]);
}

/** Everything inside <body>: the header, the gate, the gated steps, the footer, and the toast. */
export function renderVoiceBody(): string {
  return [
    stepsHeader(VOICE.screens),
    `<main class="page" data-steps data-state-key="${esc(VOICE.stateKey)}">`,
    welcome(),
    `<div id="${esc(VOICE.gate.unlockedAnchor)}" class="gated">`,
    getApp(),
    samples(),
    voiceCopy(),
    save(),
    test(),
    `</div>`,
    `</main>`,
    stepsNav(VOICE.screens, VOICE.nav),
    // /ai101's one polite live region, by the id its script looks for.
    `<p id="ai101-live" class="toast" role="status" aria-live="polite"></p>`,
  ].join('\n');
}
