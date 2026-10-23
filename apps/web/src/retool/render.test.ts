import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI } from '../ai101/content';
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

/** What the page adds to the end of Kit B, at Connor's ask (D-048): plain words, and a table a phone can show. */
const KIT_B_PLAIN = `

Write it all in plain language for someone new to AI: short sentences, no tech terms. Keep each Why to a few words so the table fits on a phone.`;

/**
 * The build request (D-047, D-049): which AI employee, asked in the chat that already has the map;
 * then Connor's own ask from the live session ("Give me a simple step-by-step instruction list...
 * Make it so that a 10th grader could follow this on their own"); then the page's own lines.
 */
const BUILD = `Now help me build the first AI employee from the task map above. Use the one you recommended, or the one I said I'd rather build.

I have no clue how to get started on building this. Give me a simple step-by-step instruction list, as comprehensive as possible, that I can follow to get this built. Make it so that a 10th grader could follow this on their own.

- Build it as a Project in this app, with no code, not a custom GPT. Explain what a Project is in one sentence. If a step needs a paid plan, tell me before that step.
- Give it what a new hire gets: a job description, a training binder, a first assignment, and a manager. The manager will be my ops leader. Write the job description out in full so I can paste it in.
- Keep my map's buckets. A human approves anything marked DRAFT before it goes out. Anything marked OWN stays with a person.
- If this AI employee would need to connect to my CRM, email, or texts, tell me first. Then give me a version that works when I paste in or upload what it needs.
- Before I use any real client information, show me how to turn off the setting that lets this app learn from my chats.
- Have me practice on a made-up example first, and keep wire instructions out of every file.
- Start with a list of what to gather. Split the steps into short parts with a heading for each, so I can stop after any part and pick up later.
- Use plain words with no tech terms. One action per step, and tell me exactly what to tap, click, or type. If you're not sure what a button is called today, tell me where on the screen to look.`;

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe("Retool, Don't Replace: AI 101 for Team Owners · Amplified Impact");
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/retool');
  });
});

describe('the step-through', () => {
  it('follows the talk: the problem, the sort, the map and the build, the gate, the ready-made one, the talk, the plan', () => {
    const screens = $$('section[data-screen]').map((s) => [
      s.id,
      s.getAttribute('data-stage'),
      s.getAttribute('data-count'),
      s.getAttribute('data-next'),
    ]);
    expect(screens).toEqual([
      ['welcome', 'Welcome', null, 'Start'],
      ['three-doors', 'The Problem', null, 'Show Me the Buckets'],
      ['run-draft-own', 'Run, Draft, Own', null, 'Map My Team'],
      ['audit', 'Your Task Map', '1 of 2', 'I Have My Map'],
      ['read-your-map', 'Your Task Map', '2 of 2', 'Next: Build It'],
      ['build-steps', 'Your AI Employee', null, 'Get the Full Kit'],
      ['kit', 'The Full Kit', null, 'Continue'],
      ['coordinator', 'Optional: A Ready-Made One', '1 of 2', 'Next: The Binder'],
      ['first-file', 'Optional: A Ready-Made One', '2 of 2', 'Next: The Talk'],
      ['retool-conversation', 'Talk With Your Ops Leader', null, 'Make the Plan'],
      ['thirty-day-plan', 'Your 30-Day Plan', null, 'Last Step'],
      ['two-ways', "What's Next", null, null],
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

  it('copies Kit B word for word, but for the second [number], with the plain-language lines at its end', () => {
    expect(prompt('audit-prompt')).toBe(
      KIT_B.replace('about [number] closings', 'about [how many] closings') + KIT_B_PLAIN,
    );
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

  it('asks for an answer in every box, says to read the steps before tapping, and that a free account works', () => {
    expect(text($('#audit .lede'))).toBe(
      "Type an answer in each box below. Rough guesses are fine. The gray words in each box are only examples. ChatGPT or Claude will use your answers to make a task map. A task map is a table of your ops leader's weekly tasks, the hours each task takes, and the bucket (Run, Draft, or Own) each task goes in.",
    );
    expect($$('#audit .field')).toHaveLength(6);
    expect(text($('#audit .path-lead'))).toBe(
      'Read the four steps under the buttons first, because the button takes you away from this page. Then tap Copy & Open ChatGPT or Copy & Open Claude. The button copies your answers and opens that app. Use the one you have an account with. No account yet? Either one is free.',
    );
    // Before the buttons, so it is read first.
    const lead = $('#audit .path-lead')!;
    const firstButton = $('#audit a[data-copy-open]')!;
    expect(lead.compareDocumentPosition(firstButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says to sign in, how to paste on a phone and a computer, and how to come back with the chat kept', () => {
    expect($$('#audit ol.numbered li').map((li) => text(li))).toEqual([
      "Sign in, or sign up if you're new. A free account works. Sign in even if ChatGPT lets you skip it, because ChatGPT only saves chats when you're signed in, and you'll need this chat again.",
      'Paste into the message box at the bottom of the screen, where you type. On a phone: press and hold the box, then tap Paste. On a computer: click the box, then press Ctrl+V (Cmd+V on a Mac).',
      'Tap the send arrow next to the message box. The AI takes about a minute to answer. Wait until the AI stops writing.',
      "Come back to this page. On a phone, switch back to Safari or Chrome. If this page isn't showing, tap the tabs button and pick this page. On a computer, click this page's tab at the top of the window. Keep the ChatGPT or Claude chat open, because you'll type in that same chat on the next two screens.",
    ]);
  });

  it('teaches the sort with the same rules the prompt sorts by, as a rule AI follows, not a quiz', () => {
    expect($$('#run-draft-own .tile strong').map((s) => text(s))).toEqual(['Run', 'Draft', 'Own']);
    expect(text($('#run-draft-own .card-title'))).toBe(
      "You won't sort anything yourself. In a few minutes, ChatGPT or Claude will sort every task using these rules:",
    );
    expect($$('#run-draft-own ol.numbered li').map((li) => text(li))).toEqual([
      'Money, wire instructions, or a decision about a person, like hiring or pay? Own.',
      'Anything sent to a client, an agent, a lender, or title, or anything that sets or changes a contract date? Draft.',
      "Everything else? Run. When the AI isn't sure, the AI picks the bucket where a person checks more.",
    ]);
    // A contract date is Draft, so no Run example may be one (D-049).
    expect(text($('#run-draft-own .tile'))).not.toMatch(/deadline/i);
    expect(text($('#run-draft-own .callout'))).toBe(
      "Three things always stay with a person: wire instructions, getting a lead's OK before you send them automatic texts, and checking listing wording for fair housing.",
    );
  });
});

describe('the open part: checking the map, then building from it in the same chat', () => {
  it("checks the AI's response with fixes typed into that same chat: the ones the build uses", () => {
    expect(text($('#read-your-map h2'))).toBe("Check the AI's response");
    expect(text($('#read-your-map .lede'))).toContain('Where you see [brackets], type your own words instead');
    expect($$('#read-your-map ol.numbered li').map((li) => text(li))).toEqual([
      // Connor's own wording, word for word (2026-10-22).
      "Remove what doesn't apply to your ops team. Tasks marked (added) in the response are guesses the AI made about your team. If one isn't something your team does, type: \"Remove [task]. We don't do that.\"",
      'Make sure you read every message before it goes out. In the AI\'s table, look at the Bucket column. Any task that sends an email or text to a client, an agent, a lender, or title should say Draft. If one says Run instead, type: "Move [task] to Draft."',
      'Ask the AI which AI employee to build first. Type: "With my fixes, which AI employee should I build first?" The AI\'s answer names one job, like a Contract-to-Close Coordinator. That job is your first AI employee. Want a different one? Type: "I\'d rather build [your choice] first."',
    ]);
    // The talk's "multiply those hours by what your ops leader costs" builds nothing (D-049).
    expect(text($('#read-your-map'))).not.toMatch(/\$|an hour|worth/);
  });

  it('copies the build request: which AI employee, then the ask for steps a 10th grader could follow', () => {
    expect(prompt('build-prompt')).toBe(BUILD);
    expect($('#build-prompt')?.getAttribute('data-prompt')).toBe('retool_build');
    expect($('#build-prompt')?.closest('#build-steps')).not.toBeNull();
    // Nothing to fill: the map is already in the chat it is pasted into.
    expect($$('#build-prompt mark.placeholder')).toEqual([]);
    expect($$('#build-steps [data-field]')).toEqual([]);
    expect(UI.slots.retool_build).toBeUndefined();
  });

  it('asks in the same chat as the map: a copy-only button, no new chat opened', () => {
    expect($$('#build-steps a[data-copy-open]')).toEqual([]);
    const button = $('#build-steps button[data-copy-prompt]') as HTMLButtonElement;
    expect(button.getAttribute('data-copy-prompt')).toBe('build-prompt');
    expect(text(button)).toBe('Copy the Request');
    expect(button.hidden).toBe(true);
    expect(button.hasAttribute('data-js-only')).toBe(true);
    expect(text($('#build-steps .path-lead'))).toBe(
      "Tap Copy the Request. The button copies a message asking the AI for build steps. The button doesn't open ChatGPT or Claude.",
    );
    expect($$('#build-steps ol.numbered li').map((li) => text(li))).toEqual([
      'Go back to the ChatGPT or Claude chat with your task map. On a phone, switch to that app or tab. On a computer, click that tab at the top of the window.',
      'Paste the request into the message box, the same way as before.',
      'Tap the send arrow.',
      'Follow the AI\'s steps, one at a time. A computer is easiest for this part. Need to stop? The steps stay saved in that same chat. Stuck on a step? In that same chat, type: "I\'m stuck on step [number]."',
    ]);
  });

  it('sends a map that picked contract-to-close to the ready-made one first, before any copying', () => {
    const skip = $('#build-steps .callout-tip')!;
    expect(text(skip)).toBe(
      'Did the AI pick contract-to-close? Skip this screen. The full kit, next, has a Contract-to-Close Coordinator that is already written for you. Tap Get the Full Kit at the bottom of this screen.',
    );
    expect(
      skip.compareDocumentPosition($('#build-steps button[data-copy-prompt]')!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('warns about real client information before the build, for owners who never see the Coordinator', () => {
    expect(text($('#build-steps .callout-warn'))).toBe(
      "Before you put any real client information into ChatGPT or Claude, turn off the setting that lets the app learn from your chats. The AI's steps will show you how.",
    );
    expect(prompt('build-prompt')).toContain(
      'show me how to turn off the setting that lets this app learn from my chats',
    );
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
    expect(text($('#gate-joined'))).toBe("You're in. The rest of the kit is open.");
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
    // Only the build request names one, to rule it out.
    const outsidePrompts = Array.from(doc.body.querySelectorAll('*'))
      .filter((el) => !el.closest('pre') && el.children.length === 0)
      .map((el) => el.textContent ?? '')
      .join(' ');
    expect(outsidePrompts).not.toMatch(/custom GPT|GPT builder|gpts\/editor/i);
    expect(prompt('build-prompt')).toContain('not a custom GPT');
  });

  it('copies the Retool Conversation script (Kit E), shown open, with a copy-only button', () => {
    expect(prompt('retool-script').startsWith('[Name], I want to talk about your seat, not your performance.')).toBe(
      true,
    );
    expect($('#retool-script details')?.hasAttribute('open')).toBe(true);
    // Connor's words but for one clause: the owner has already built by now (D-049).
    expect(prompt('retool-script')).toContain("Before we use it on real work, let's agree where your time goes");
    expect(prompt('retool-script')).not.toContain('Before we build anything');
    expect($$('#retool-script mark.placeholder').map((m) => m.textContent)).toEqual([
      '[Name]',
      '[X]',
      '[Y]',
      '[agent accountability / client experience / owning the scorecard]',
    ]);
    const button = $('button[data-copy-prompt="retool-script"]') as HTMLButtonElement;
    expect(button.getAttribute('data-copy-prompt')).toBe('retool-script');
    expect(text(button)).toBe('Copy the Script');
    // It needs the script to do anything, so it shows only with it.
    expect(button.hidden).toBe(true);
    expect(button.hasAttribute('data-js-only')).toBe(true);
    expect($('#retool-script')?.closest('#retool-conversation')).not.toBeNull();
  });

  it('is the optional, ready-made one, with a link past it for anyone who built their own', () => {
    expect(text($('#coordinator .lede'))).toBe(
      "Optional: use this AI employee if the AI picked contract-to-close. The Coordinator's instructions are already written, so you can use them instead of the AI's build steps.",
    );
    const skip = $('#coordinator a.skip')!;
    expect(skip.getAttribute('href')).toBe('#retool-conversation');
    expect(text(skip)).toBe('Built a different AI employee? Skip to the talk with your ops leader');
  });

  it('says to make the Project on a computer, with the button names each app uses today', () => {
    expect(text($$('#coordinator .path-lead').filter((p) => text(p).startsWith('Do this part'))[0])).toBe(
      "Do this part on a computer. Setting up a Project is hard on a phone. A Project is a folder in ChatGPT or Claude that keeps an AI employee's instructions and files together. Type your team's name and your city and state in the two boxes below, then tap the app you use.",
    );
    expect($$('#coordinator [data-pick-panel="claude"] li').map((li) => text(li))).toEqual([
      'Click New project in the top right.',
      'In the first box, type Contract-to-Close Coordinator. Leave the second box blank, and click Create project.',
      'On the right side, click Set project instructions.',
      'Paste the instructions, then click Save instructions.',
    ]);
    expect($$('#coordinator [data-pick-panel="chatgpt"] li').map((li) => text(li))).toEqual([
      'On the left side of ChatGPT, click New project.',
      'Type Contract-to-Close Coordinator as the name, then click Create project.',
      'Click the three dots (•••) at the top right of the Project page, then click Project settings.',
      'Click in the Instructions box, paste the instructions, then click Save.',
    ]);
  });

  it('turns off training before anything is uploaded, and keeps the binder to four files', () => {
    const guard = $('#first-file .callout-warn')!;
    // First on the screen, before the binder.
    expect(guard.compareDocumentPosition($('#first-file .card')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text(guard)).toContain(
      'In ChatGPT: click your name in the bottom left corner, then Settings, then Data controls. Turn off Improve the model for everyone, then click Done.',
    );
    expect(text(guard)).toContain(
      'In Claude: click your name in the bottom left corner, then Settings, then Privacy. Turn off the switch that starts with Help improve.',
    );
    expect(text(guard)).toContain("don't tap thumbs up or thumbs down");
    expect(text($('#first-file'))).toContain('Upload four files to the Project, one for each item below.');
    expect(text($('#first-file'))).toContain(
      'In Claude: on the Project page, click the + on the right side. Upload one file at a time.',
    );
    expect(text($('#first-file'))).toContain(
      'In ChatGPT: open the Project, and click the Sources tab. Add one file at a time.',
    );
  });

  it('speaks plainly: no EOS terms, no AI-builder jargon, no riddles left from the first draft', () => {
    const words = doc.body.textContent ?? '';
    for (const banned of [
      /\bEOS\b/,
      /Gets? [Ii]t|Wants? [Ii]t|Capacity/,
      /\bRock\b|scorecard on|\bbaseline\b/i,
      /redacted|\bramp\b|zero context|\bTCPA\b/i,
      /Strike one|Overrule one|share of the week|Four questions/,
      /regular chat, not a Project/,
    ])
      expect(words, String(banned)).not.toMatch(banned);
  });

  it('lays out the 30-day plan (Kit D) for an owner who has built: Talk, Test, Use, Decide', () => {
    expect($$('#thirty-day-plan .plan-week .week-pillar').map((w) => text(w))).toEqual([
      'Talk',
      'Test',
      'Use',
      'Decide',
    ]);
    // Week 4 compares the workload number Week 1 took.
    expect(text($$('#thirty-day-plan .plan-week')[0])).toContain('rate their workload from 1 to 10');
    // The next seats, where Week 4 says to pick one.
    expect(text($('#thirty-day-plan'))).toContain('More AI employees to build later');
    expect($('#first-file')?.textContent).not.toContain('More AI employees');
    expect($$('#thirty-day-plan .plan-week')).toHaveLength(4);
  });

  it('ends on the two ways forward, the booking link only once there is one', () => {
    const book = $$('#two-ways a').filter((a) => text(a) === 'Book a Retool Review');
    if (RETOOL.forward.review.button.href) {
      expect(book.map((a) => a.getAttribute('href'))).toEqual([RETOOL.forward.review.button.href]);
      expect(RETOOL.forward.review.button.href).toMatch(/^https:\/\//);
    } else {
      expect(book).toEqual([]);
      expect(text($('#two-ways'))).toContain('On a live call? Type RETOOL in the Zoom chat to get the booking link.');
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
