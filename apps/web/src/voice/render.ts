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
  callout,
  esc,
  h2,
  inline,
  logo,
  samplesBody,
  saveBody,
  screenSection,
  stepsHeader,
  stepsNav,
  voiceCopyBody,
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

/** Step 1, step 2 and Save are /ai101's own, built by its renderer (D-040, D-043). */
const samples = () => screen(1, samplesBody(anchorOf(1)));
const voiceCopy = () => screen(2, voiceCopyBody(anchorOf(2), anchorOf(1)));
const save = () => screen(3, saveBody(anchorOf(3)));

function test(): string {
  const t = VOICE.test;
  return screen(4, [
    h2(anchorOf(4), t.heading),
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
