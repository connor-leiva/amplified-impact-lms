import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE as AI101 } from '../ai101/content';
import { CONSENT, SENDERS } from '../legal/content';
import { VOICE, VOICE_SENDERS } from './content';
import { renderVoiceBody, renderVoiceHead } from './render';

// /voice-profile's markup contract (D-040), on the parsed DOM. What /ai101's script does with it is
// `main.test.ts`'s; that the API serves it is `apps/api/test/guides.test.ts`'s.
//
// Values a visitor sees or a link depends on are typed out here, not read from `content.ts`.

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderVoiceHead()}</head><body>${renderVoiceBody()}</body></html>`,
  'text/html',
);
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe('Sounds Like You: Your AI Voice Profile · Amplified Impact');
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/voice-profile');
  });
});

describe('the step-through', () => {
  it("is /ai101's Part I with no Part II: the gate, the app, then the four steps", () => {
    const screens = $$('section[data-screen]').map((s) => [
      s.id,
      s.getAttribute('data-stage'),
      s.getAttribute('data-count'),
      s.getAttribute('data-next'),
    ]);
    expect(screens).toEqual([
      ['welcome', 'Welcome', null, 'Start'],
      ['get-the-app', 'Before You Start', null, "I'm Signed In"],
      ['voice-profile', 'Voice Profile', '1 of 4', 'I Have My Samples'],
      ['voice-profile-copy', 'Voice Profile', '2 of 4', 'I Have My Profile'],
      ['voice-profile-save', 'Voice Profile', '3 of 4', 'Saved It'],
      ['voice-profile-test', 'Voice Profile', '4 of 4', null],
    ]);
    expect($$('section[data-screen]').map((s) => s.getAttribute('data-screen'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('keeps its place apart from /ai101, under its own key', () => {
    expect($('main')?.getAttribute('data-state-key')).toBe('voice-profile-v1');
  });

  it("has /ai101's header, footer and toast, which its script looks for", () => {
    expect($('header[data-steps-chrome] [data-stage-label]')).not.toBeNull();
    expect($('nav[data-steps-chrome] button[data-next]')).not.toBeNull();
    expect($('nav[data-steps-chrome] button[data-restart]')).not.toBeNull();
    expect($('#ai101-live')?.getAttribute('role')).toBe('status');
  });

  it('never mentions the Carousel Creator, Part II, the brand, the waitlist or the conference', () => {
    const all = doc.body.textContent ?? '';
    for (const gone of [
      /carousel/i,
      /Part II/,
      /Part I\b/,
      /design system/i,
      /waitlist/i,
      /December/,
      /eXpCon/,
      /laptop handoff/i,
    ]) {
      expect(all, String(gone)).not.toMatch(gone);
    }
    expect($$('[data-share], [data-copy-chip], #waitlist-form, a[href*="carousel"]')).toEqual([]);
  });

  it('follows the house rule: no em dashes in its own copy', () => {
    // The voice prompt is /ai101's, word for word, and bans em dashes in what it writes; its own text
    // names them, so the check is on everything but the prompt.
    const copy = Array.from(doc.body.querySelectorAll('*'))
      .filter((el) => !el.closest('pre') && el.children.length === 0)
      .map((el) => el.textContent ?? '')
      .join(' ');
    expect(copy).not.toContain('—');
  });

  it('uses no id twice', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the gate', () => {
  it('is the welcome screen, under its own unlock key, with every other screen behind it', () => {
    const welcome = $('#welcome')!;
    expect(welcome.hasAttribute('data-gate')).toBe(true);
    expect(welcome.getAttribute('data-unlock-key')).toBe('vp-unlocked');
    const gated = $('#unlocked')!;
    expect(gated.classList.contains('gated')).toBe(true);
    expect(Array.from(gated.querySelectorAll('section[data-screen]')).map((s) => s.id)).toEqual([
      'get-the-app',
      'voice-profile',
      'voice-profile-copy',
      'voice-profile-save',
      'voice-profile-test',
    ]);
    expect(welcome.closest('#unlocked')).toBeNull();
  });

  it('is a plain POST to its own route that works with no script, with the honeypot hidden', () => {
    const form = $('#gate-form') as HTMLFormElement;
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe('/api/voice-profile');
    expect(form.hasAttribute('novalidate')).toBe(false);
    expect($$('#gate-form input').map((i) => (i as HTMLInputElement).name)).toEqual(['firstName', 'email', 'website']);
    const trap = $('#gate-website') as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(text($('#gate-form button[type="submit"]'))).toBe('Get the Setup');
    expect($('#guide-error')?.getAttribute('role')).toBe('alert');
    expect($('#firstName-error')).not.toBeNull();
    expect($('#email-error')).not.toBeNull();
  });

  it('has no phone field and no SMS box: the API refuses to record either from a guide (D-038)', () => {
    expect($$('input[name="phone"], input[name="smsConsent"], input[type="tel"], input[type="checkbox"]')).toEqual([]);
  });

  it('names Spring among the senders, because Spring posts it, exactly as the Terms quote (D-040)', () => {
    expect(text($('#gate-form .wl-legal'))).toBe(
      'By signing up, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor. Unsubscribe anytime.',
    );
    expect(text($('#gate-form .wl-legal'))).toBe(CONSENT.voice);
    expect(VOICE_SENDERS).toBe(SENDERS);
    expect($$('#gate-form .wl-legal a').map((a) => [a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      ['/terms', '_blank'],
      ['/privacy', '_blank'],
    ]);
  });

  it('says "You\'re in" once open, in a line the CSS shows in place of the form', () => {
    expect(text($('#gate-joined'))).toBe("You're in. Tap Start to begin.");
  });
});

describe("the steps, /ai101's own", () => {
  it("copies /ai101's voice profile prompt, word for word", () => {
    expect($('#voice-profile-prompt pre[data-prompt-text]')?.textContent).toBe(AI101.voicePrompt.text);
    expect($('#voice-profile-prompt')?.getAttribute('data-prompt')).toBe('voice_profile');
  });

  it('fills it from the same two blanks, and opens a blank ChatGPT or Claude chat', () => {
    expect($$('[data-field]').map((f) => f.getAttribute('data-field'))).toEqual(['market', 'clients']);
    expect(
      $$('a[data-copy-open]').map((a) => [text(a), a.getAttribute('href'), a.getAttribute('data-copy-open')]),
    ).toEqual([
      ['Copy & Open ChatGPT', 'https://chatgpt.com/', 'voice-profile-prompt'],
      ['Copy & Open Claude', 'https://claude.ai/new', 'voice-profile-prompt'],
    ]);
  });

  it('gets the app first, with the store links the script swaps in on a phone', () => {
    expect(text($('#get-the-app-heading'))).toBe('First: get the app and sign in');
    expect($$('#get-the-app a[data-get-app]').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get ChatGPT', 'https://chatgpt.com/'],
      ['Get Claude', 'https://claude.ai/'],
    ]);
  });

  it('saves it in a Claude Project or ChatGPT Custom instructions, as /ai101 says', () => {
    expect($$('[data-pick-panel]').map((p) => p.getAttribute('data-pick-panel'))).toEqual(['claude', 'chatgpt']);
    expect($$('[data-pick-panel] a.btn').map((a) => a.getAttribute('href'))).toEqual([
      'https://claude.ai/projects',
      'https://chatgpt.com/settings/personalization?instructions=chatgpt',
    ]);
  });

  it('ends on the test, with no handoff to a laptop', () => {
    expect(text($('#voice-profile-test .callout'))).toBe('Done. Your voice profile is set up.');
    expect($('#voice-profile-test .card-accent')).toBeNull();
  });
});

describe('the stylesheet and the shell', () => {
  it('hides the gated steps until the 303 lands on them, or the script runs', () => {
    const css = read('./voice.css');
    expect(css).toContain("@import '../ai101/ai101.css';");
    expect(css).toMatch(/\.gated \{\s*display: none;/);
    expect(css).toMatch(/\.gated:target,\s*\.steps-on \.gated \{\s*display: flex;/);
    expect(css).toMatch(/\.screen\[data-state='unlocked'\] \.gate \.wl-form \{\s*display: none;/);
  });

  it("fills its own markers and runs /ai101's script", () => {
    const shell = read('../../voice-profile.html');
    expect(shell).toContain('<!--voice:head-->');
    expect(shell).toContain('<!--voice:body-->');
    expect(shell).toContain('href="/src/voice/voice.css"');
    expect(shell).toContain('src="/src/ai101/main.ts"');
    expect(VOICE.slug).toBe('voice-profile');
  });
});
