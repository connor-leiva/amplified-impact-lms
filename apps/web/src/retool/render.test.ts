import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI } from '../ai101/content';
import { fillPrompt } from '../ai101/main';
import { CONSENT, SENDERS } from '../legal/content';
import { RETOOL, RETOOL_SENDERS } from './content';
import { renderRetoolBody, renderRetoolHead } from './render';

// /retool's markup contract (D-046), on the parsed DOM. What /ai101's script does with it is
// `main.test.ts`'s; that the API serves it and stores its sign-ups is `apps/api/test/`'s.
//
// Values a visitor sees, a link depends on, or the API checks are typed out here, not read from
// `content.ts`.

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderRetoolHead()}</head><body>${renderRetoolBody()}</body></html>`,
  'text/html',
);
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const prompt = (id: string) => $(`#${id} pre[data-prompt-text]`)?.textContent ?? '';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

/** Connor's talk notes, "Retool, Don't Replace: AI 101 for Team Owners" (2026-10-21), Kit B, verbatim. */
const KIT_B = `You're an operations analyst for real estate teams. Map my ops leader's week and show me what AI can take on.

1. My team: [number] agents, about [number] closings a month, CRM: [name]
2. Who's in ops: [for example, one full-time ops leader and a part-time TC]
3. What eats their week, rough is fine: [list]
4. If they quit tomorrow, the first thing that breaks: [answer]

Then:
- Build their likely weekly task list. Start with what I gave you, then add tasks a team this size usually has, marked (added).
- Estimate hours per task, marked (est.), so the total fits the ops team I described. If I didn't say, assume one full-time person at about 45 hours.
- Sort every task into one bucket. RUN: AI does it end to end with light oversight. DRAFT: AI prepares it and a human approves it. OWN: a human keeps it.
- Anything sent to clients, agents, lenders, or title is DRAFT at most. Anything that sets or changes a contract date is DRAFT at most. Wire instructions, money, texting consent, fair housing review, and decisions about people are always OWN. When unsure, pick the safer bucket.

Show me:
1. A table: Task | Hours | Bucket | Why
2. Hours in RUN, DRAFT, and OWN, plus RUN and DRAFT together as a percent of the week
3. The first AI employee I should build, in two sentences
4. Three questions to ask my ops leader to correct this map`;

/**
 * The build steps prompt (D-047): the map pasted back in, then Connor's own ask from the live session
 * ("Give me a simple step-by-step instruction list... Make it so that a 10th grader could follow this
 * on their own"), then four lines from this kit.
 */
const BUILD = `Here's the task map AI made of my ops leader's week:

[paste your whole map here]

I can see the first AI employee to build. I have no clue how to get started on building this. Give me a simple step-by-step instruction list, as comprehensive as possible, that I can follow to get this built. Make it so that a 10th grader could follow this on their own.

- Build it as a Project in this app, with no code.
- Give it what a new hire gets: a job description, a training binder, a first assignment, and a manager. Write the job description out in full so I can paste it in.
- Keep my map's buckets. A human approves anything marked DRAFT before it goes out. Anything marked OWN stays with a person.
- Have me practice on a made-up example first, and keep wire instructions out of every file.`;

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe("Retool, Don't Replace: AI 101 for Team Owners · Amplified Impact");
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/retool');
  });
});

describe('the step-through', () => {
  it('follows the talk: the pattern, the sort, the audit and its build steps, the gate, the kit, the plan', () => {
    const screens = $$('section[data-screen]').map((s) => [
      s.id,
      s.getAttribute('data-stage'),
      s.getAttribute('data-count'),
      s.getAttribute('data-next'),
    ]);
    expect(screens).toEqual([
      ['welcome', 'Welcome', null, 'Start'],
      ['three-doors', 'The Pattern', null, 'Show Me the Sort'],
      ['run-draft-own', 'Run, Draft, Own', null, 'Map My Team'],
      ['audit', 'Your Task Map', '1 of 3', 'I Have My Map'],
      ['read-your-map', 'Your Task Map', '2 of 3', 'Get My Build Steps'],
      ['build-steps', 'Your Task Map', '3 of 3', 'Get the Full Kit'],
      ['kit', 'The Full Kit', null, 'Build My AI Employee'],
      ['coordinator', 'Your First AI Employee', '1 of 2', "It's Hired"],
      ['first-file', 'Your First AI Employee', '2 of 2', 'The People Side'],
      ['retool-conversation', 'The Retool Conversation', null, 'Make the Plan'],
      ['thirty-day-plan', 'The 30-Day Retool Plan', null, 'Last Thing'],
      ['two-ways', 'Two Ways Forward', null, null],
    ]);
    expect($$('section[data-screen]').map((s) => s.getAttribute('data-screen'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
  });

  it('keeps its place apart from /ai101 and /voice-profile, under its own key', () => {
    expect($('main')?.getAttribute('data-state-key')).toBe('retool-v1');
  });

  it("has /ai101's header, footer and toast, which its script looks for", () => {
    expect($('header[data-steps-chrome] [data-stage-label]')).not.toBeNull();
    expect($('nav[data-steps-chrome] button[data-next]')).not.toBeNull();
    expect($('nav[data-steps-chrome] button[data-restart]')).not.toBeNull();
    expect($('#ai101-live')?.getAttribute('role')).toBe('status');
  });

  it('links straight to the audit from the welcome screen, a link that works with no script', () => {
    expect($('#welcome a.skip')?.getAttribute('href')).toBe('#audit');
    expect($('#audit')).not.toBeNull();
  });

  it('follows the house rule: no em dashes, in the copy or the prompts', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(text($('title'))).not.toContain('—');
  });

  it('uses no id twice', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has none of /ai101's other parts: no waitlist, share sheet, starter chips or app-store links", () => {
    expect($$('#waitlist, #waitlist-form, [data-share], [data-copy-chip], [data-get-app]')).toEqual([]);
  });
});

describe('the open part: the audit (Kit B)', () => {
  it('sits before the gate, outside the gated steps, so the room needs no form mid-call', () => {
    for (const id of ['welcome', 'three-doors', 'run-draft-own', 'audit', 'read-your-map', 'build-steps']) {
      expect($(`#${id}`)?.closest('#unlocked'), id).toBeNull();
    }
    for (const id of ['audit-prompt', 'build-prompt']) expect($(`#${id}`)?.closest('#unlocked'), id).toBeNull();
  });

  it('copies Kit B word for word, but for the second [number], which is [how many]', () => {
    expect(prompt('audit-prompt')).toBe(KIT_B.replace('about [number] closings', 'about [how many] closings'));
    expect($('#audit-prompt')?.getAttribute('data-prompt')).toBe('retool_audit');
  });

  it("fills every one of the prompt's blanks from a field, each blank a different one", () => {
    const blanks = $$('#audit-prompt mark.placeholder').map((m) => m.textContent);
    expect(blanks).toEqual([
      '[number]',
      '[how many]',
      '[name]',
      '[for example, one full-time ops leader and a part-time TC]',
      '[list]',
      '[answer]',
    ]);
    const slots = UI.slots.retool_audit!;
    expect(blanks.map((b) => slots[b!])).toEqual(['agents', 'closings', 'crm', 'opsTeam', 'weekEaters', 'breaksFirst']);
    expect($$('#audit [data-field]').map((f) => f.getAttribute('data-field'))).toEqual([
      'agents',
      'closings',
      'crm',
      'opsTeam',
      'weekEaters',
      'breaksFirst',
    ]);
  });

  it('opens a blank ChatGPT or Claude chat, never a prefilled one (D-032)', () => {
    expect(
      $$('#audit a[data-copy-open]').map((a) => [text(a), a.getAttribute('href'), a.getAttribute('data-copy-open')]),
    ).toEqual([
      ['Copy & Open ChatGPT', 'https://chatgpt.com/', 'audit-prompt'],
      ['Copy & Open Claude', 'https://claude.ai/new', 'audit-prompt'],
    ]);
    expect($$('a[href*="?q="], a[href*="prompt="]')).toEqual([]);
  });

  it('says to keep the chat open, since the build steps start from its answer, and to use a plain chat', () => {
    expect($$('#audit ol.numbered li').map((li) => text(li))).toEqual([
      'Paste.',
      'Fill in any blank still in [brackets].',
      'Send.',
      "Keep that chat open. You'll copy its answer in a minute.",
    ]);
    expect(text($('#audit .note'))).toBe(
      'Use a regular chat, not a Project. It works on free ChatGPT and free Claude.',
    );
  });

  it('teaches the sort with the same rules the prompt sorts by, and the three that never leave Own', () => {
    expect($$('#run-draft-own .tile strong').map((s) => text(s))).toEqual(['Run', 'Draft', 'Own']);
    expect(text($('#run-draft-own .callout'))).toBe(
      'Three things never leave Own: wire instructions, consent for automated texting under TCPA, and fair housing review of listing language.',
    );
  });
});

describe('the open part: the build steps', () => {
  it('reads the map for the AI employee it picked, which the build steps start from', () => {
    expect(text($('#read-your-map ol.numbered li:last-child'))).toBe(
      'Find the first AI employee it recommends. Not sold? Start where the Run tasks pile up.',
    );
  });

  it('copies the build steps prompt: the whole map, then the ask for steps a 10th grader could follow', () => {
    expect(prompt('build-prompt')).toBe(BUILD);
    expect($('#build-prompt')?.getAttribute('data-prompt')).toBe('retool_build');
    expect($('#build-prompt')?.closest('#build-steps')).not.toBeNull();
  });

  it('fills its one blank, the map, from a box big enough to paste the whole answer into', () => {
    expect($$('#build-prompt mark.placeholder').map((m) => m.textContent)).toEqual(['[paste your whole map here]']);
    expect(UI.slots.retool_build).toEqual({ '[paste your whole map here]': 'taskMap' });
    const fields = $$('#build-steps [data-field]');
    expect(fields.map((f) => [f.tagName, f.getAttribute('data-field')])).toEqual([['TEXTAREA', 'taskMap']]);
    expect(text($('label[for="field-taskMap"]'))).toBe(
      'Your whole map In the chat, tap the copy icon under its answer. Then paste it here.',
    );
  });

  it('takes the whole pasted answer, line breaks and table included, in place of its blank', () => {
    const pasted =
      '\n| Task | Hours | Bucket | Why |\n| CRM tagging | 3 | RUN | Rules-based |\n\nFirst AI employee: a Transaction QA agent.\n';
    const filled = fillPrompt(BUILD, UI.slots.retool_build!, { taskMap: pasted })
      .map((p) => p.text)
      .join('');
    expect(filled).toBe(BUILD.replace('[paste your whole map here]', pasted.trim()));
  });

  it('opens a blank ChatGPT or Claude chat, as the audit does', () => {
    expect(
      $$('#build-steps a[data-copy-open]').map((a) => [
        text(a),
        a.getAttribute('href'),
        a.getAttribute('data-copy-open'),
      ]),
    ).toEqual([
      ['Copy & Open ChatGPT', 'https://chatgpt.com/', 'build-prompt'],
      ['Copy & Open Claude', 'https://claude.ai/new', 'build-prompt'],
    ]);
    expect($$('#build-steps ol.numbered li').map((li) => text(li))).toEqual([
      'Paste.',
      'Send.',
      'Do one step at a time. Stuck? Tell it where, in the same chat.',
    ]);
  });
});

describe('the gate', () => {
  it('is its own screen after the audit, under its own unlock key, with every later screen behind it', () => {
    const kit = $('#kit')!;
    expect(kit.hasAttribute('data-gate')).toBe(true);
    expect(kit.getAttribute('data-unlock-key')).toBe('retool-unlocked');
    expect($$('[data-gate]')).toHaveLength(1);
    expect(kit.closest('#unlocked')).toBeNull();
    const gated = $('#unlocked')!;
    expect(gated.classList.contains('gated')).toBe(true);
    expect(Array.from(gated.querySelectorAll('section[data-screen]')).map((s) => s.id)).toEqual([
      'coordinator',
      'first-file',
      'retool-conversation',
      'thirty-day-plan',
      'two-ways',
    ]);
    // Kits C, D and E are behind it, and only they.
    for (const id of ['coordinator-prompt', 'retool-script'])
      expect($(`#${id}`)?.closest('#unlocked'), id).not.toBeNull();
  });

  it('is a plain POST to its own route that works with no script, with the honeypot hidden', () => {
    const form = $('#gate-form') as HTMLFormElement;
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe('/api/retool');
    expect(form.hasAttribute('novalidate')).toBe(false);
    expect($$('#gate-form input, #gate-form select').map((i) => (i as HTMLInputElement).name)).toEqual([
      'firstName',
      'email',
      'teamSize',
      'decemberInterest',
      'website',
    ]);
    const trap = $('#gate-website') as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(text($('#gate-form button[type="submit"]'))).toBe('Get the Kit');
    expect($('#guide-error')?.getAttribute('role')).toBe('alert');
    for (const name of ['firstName', 'email', 'teamSize']) expect($(`#${name}-error`), name).not.toBeNull();
  });

  it("asks the team size: required, nothing chosen until the visitor chooses, the API's four values", () => {
    const select = $('#gate-teamSize') as HTMLSelectElement;
    expect(select.required).toBe(true);
    expect($('label[for="gate-teamSize"]')?.textContent).toBe('Team size');
    const options = Array.from(select.options).map((o) => [o.value, o.textContent, o.disabled]);
    expect(options).toEqual([
      ['', 'Team size', true],
      ['1-10', '1 to 10 agents', false],
      ['11-25', '11 to 25 agents', false],
      ['26-50', '26 to 50 agents', false],
      ['51+', '51 or more agents', false],
    ]);
    // Nothing chosen: the empty prompt, so `required` stops a post with no size.
    expect(select.value).toBe('');
  });

  it('offers the December box, unticked, posting "on" as the API reads it', () => {
    const box = $('#gate-december') as HTMLInputElement;
    expect(box.type).toBe('checkbox');
    expect(box.checked).toBe(false);
    expect(box.value).toBe('on');
    expect(text($('label[for="gate-december"]'))).toBe('Tell me about the December leadership track.');
  });

  it('has no phone field and no SMS box: the API refuses to record either from a guide (D-038)', () => {
    expect($$('input[name="phone"], input[name="smsConsent"], input[type="tel"]')).toEqual([]);
  });

  it('names Amplified Impact, LLC alone, exactly as CONSENT.guides records (D-041)', () => {
    expect(text($('#gate-form .wl-legal'))).toBe(
      'By signing up, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
    );
    expect(text($('#gate-form .wl-legal'))).toBe(CONSENT.guides);
    expect(RETOOL_SENDERS).toBe(SENDERS);
    expect($$('#gate-form .wl-legal a').map((a) => [a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      ['/terms', '_blank'],
      ['/privacy', '_blank'],
    ]);
  });

  it('says "You\'re in" once open, in a line the CSS shows in place of the form', () => {
    expect(text($('#gate-joined'))).toBe("You're in. The full kit is open.");
  });
});

describe('the gated part: Kits C, D and E', () => {
  it('copies the Coordinator job description (Kit C), its two blanks filled from fields, [brackets] its own words', () => {
    const kitC = prompt('coordinator-prompt');
    expect(
      kitC.startsWith(
        'You are the Contract-to-Close Coordinator for [Team Name], a real estate team in [City, State].',
      ),
    ).toBe(true);
    expect(kitC.endsWith('Format for a 60-second scan: headings and tables, no filler.')).toBe(true);
    expect(kitC).toContain(
      "Put anything you don't know in [brackets]. Never include wire instructions or banking details.",
    );
    expect($$('#coordinator-prompt mark.placeholder').map((m) => m.textContent)).toEqual([
      '[Team Name]',
      '[City, State]',
    ]);
    expect($$('#coordinator [data-field]').map((f) => f.getAttribute('data-field'))).toEqual(['teamName', 'cityState']);
  });

  it('builds it in a Claude Project or a ChatGPT Project, never a custom GPT (retired Dec 11, 2026)', () => {
    expect($$('#coordinator button[data-pick]').map((b) => text(b))).toEqual(['Claude', 'ChatGPT']);
    expect(
      $$('#coordinator [data-pick-panel] a[data-copy-open]').map((a) => [
        a.closest('[data-pick-panel]')?.getAttribute('data-pick-panel'),
        a.getAttribute('href'),
        a.getAttribute('data-copy-open'),
      ]),
    ).toEqual([
      ['claude', 'https://claude.ai/projects', 'coordinator-prompt'],
      ['chatgpt', 'https://chatgpt.com/', 'coordinator-prompt'],
    ]);
    expect(doc.body.textContent).not.toMatch(/custom GPT|GPT builder|gpts\/editor/i);
  });

  it('copies the Retool Conversation script (Kit E), shown open, with a copy-only button', () => {
    expect(prompt('retool-script').startsWith('[Name], I want to talk about your seat, not your performance.')).toBe(
      true,
    );
    expect($('#retool-script details')?.hasAttribute('open')).toBe(true);
    expect($$('#retool-script mark.placeholder').map((m) => m.textContent)).toEqual([
      '[Name]',
      '[X]',
      '[Y]',
      '[agent accountability / client experience / owning the scorecard]',
    ]);
    const button = $('button[data-copy-prompt]') as HTMLButtonElement;
    expect(button.getAttribute('data-copy-prompt')).toBe('retool-script');
    expect(text(button)).toBe('Copy the Script');
    // It needs the script to do anything, so it shows only with it.
    expect(button.hidden).toBe(true);
    expect(button.hasAttribute('data-js-only')).toBe(true);
    expect($('#retool-script')?.closest('#retool-conversation')).not.toBeNull();
  });

  it('lays out the 30-day plan (Kit D) as four weeks: Map, Build, Run, Decide', () => {
    expect($$('#thirty-day-plan .plan-week .week-pillar').map((w) => text(w))).toEqual([
      'Map',
      'Build',
      'Run',
      'Decide',
    ]);
    expect($$('#thirty-day-plan .plan-week')).toHaveLength(4);
  });

  it('ends on the two ways forward, the booking link only once there is one', () => {
    const book = $$('#two-ways a').filter((a) => text(a) === 'Book a Retool Review');
    if (RETOOL.forward.review.button.href) {
      expect(book.map((a) => a.getAttribute('href'))).toEqual([RETOOL.forward.review.button.href]);
      expect(RETOOL.forward.review.button.href).toMatch(/^https:\/\//);
    } else {
      expect(book).toEqual([]);
      expect(text($('#two-ways'))).toContain('Type RETOOL in the session chat for the booking link.');
    }
    // No price, no scarcity on the page: the talk keeps both for the Review.
    expect(text($('#two-ways'))).not.toMatch(/\$|two (more )?teams|spots/i);
  });

  it('never leaves the kit with Sarah or the speaker: no Kit A, run of show or Q&A prep', () => {
    expect(doc.body.textContent).not.toMatch(/Sarah|Hi Sarah|hot seat|Run of Show|Q&A|Kit [A-E]\b/);
  });
});

describe('the stylesheet and the shell', () => {
  it('hides the gated steps until the 303 lands on them, or the script runs', () => {
    const css = read('./retool.css');
    expect(css).toContain("@import '../ai101/ai101.css';");
    expect(css).toMatch(/\.gated \{\s*display: none;/);
    expect(css).toMatch(/\.gated:target,\s*\.steps-on \.gated \{\s*display: flex;/);
    expect(css).toMatch(/\.kit-gate\[data-state='unlocked'\] \.wl-form \{\s*display: none;/);
  });

  it("fills its own markers and runs /ai101's script", () => {
    const shell = read('../../retool.html');
    expect(shell).toContain('<!--retool:head-->');
    expect(shell).toContain('<!--retool:body-->');
    expect(shell).toContain('href="/src/retool/retool.css"');
    expect(shell).toContain('src="/src/ai101/main.ts"');
    expect(RETOOL.slug).toBe('retool');
  });
});
