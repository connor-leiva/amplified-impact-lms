import type * as Skills from '@ai/core/skills';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { CONSENT, SENDERS } from '../legal/content';
import { GUIDE_SENDERS, GUIDES, inSkillLibrary, type Guide } from './content';
import { esc, guideFor, renderGuideBody, renderGuideHead } from './render';
import { GUIDE_HTML } from './vite-plugin';
import { TASK_SYNC_MORNING_ADD_ON, TASK_SYNC_PROMPT } from './task-sync-starter';

// The free guides' markup contract (D-038, D-039, D-045), on the parsed DOM, for every guide. What the
// script does with it is `main.test.ts`'s; that the API serves it is
// `apps/api/test/guides.test.ts`'s.
//
// Values a visitor sees or a link depends on are typed out here, not read from the content files, so
// a change to one is a change to this file too.
//
// The Reel Editor is paid (D-082): its live page shows the Skill Library card in place of the opt-in
// and the setup, which `skill-library.test.ts` holds. Its opt-in and setup stay in `reel-editor.ts` for
// the day `FREE_SKILLS` names it, so this file draws it as that day will, free, and holds them still.
vi.mock('@ai/core/skills', async (importOriginal) => {
  const real = await importOriginal<typeof Skills>();
  return { ...real, isFreeSkill: (id: string) => id === 'reel-editor' || real.isFreeSkill(id) };
});

const parse = (guide: Guide) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderGuideHead(guide)}</head><body>${renderGuideBody(guide)}</body></html>`,
    'text/html',
  );
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

/** What differs between the guides, typed out. */
const EXPECTED = {
  'task-sync-starter': {
    title: 'Task Sync Starter Kit · Amplified Impact',
    h1: 'Task Sync Starter Kit',
    anchor: 'get-the-kit',
    button: 'Get the Kit',
    file: '/downloads/task-sync-starter-kit.pdf',
    filename: 'Task Sync Starter Kit - Amplified Impact.pdf',
    magic: '%PDF-',
    minBytes: 100_000,
    unlockKey: 'tss-unlocked',
  },
  'ops-time-audit': {
    title: 'The Ops Time Audit · Amplified Impact',
    h1: 'The Ops Time Audit',
    anchor: 'get-the-guide',
    button: 'Get the Guide',
    file: '/downloads/ops-time-audit.pdf',
    filename: 'The Ops Time Audit - Amplified Impact.pdf',
    magic: '%PDF-',
    minBytes: 100_000,
    unlockKey: 'ota-unlocked',
  },
  'reel-editor': {
    title: 'Reel Editor: A Free Claude Skill · Amplified Impact',
    h1: 'Reel Editor',
    anchor: 'get-the-skill',
    button: 'Get the Skill',
    file: '/downloads/reel-editor.zip',
    filename: 'reel-editor.zip',
    // A ZIP's local file header.
    magic: 'PK\u0003\u0004',
    minBytes: 20_000,
    unlockKey: 're-unlocked',
  },
} as const;

describe('the list of guides', () => {
  it('has every guide, each with a shell the build reads and the API serves by the same slug', () => {
    expect(Object.keys(GUIDES)).toEqual([
      'task-sync-starter',
      'ops-time-audit',
      'reel-editor',
      'database-health-check',
      'recruiting-prep',
      'team-playbook-builder',
      'content-strategist',
      'perfect-week',
      'inbox-meeting-follow-through',
      'due-diligence-review',
      'repair-request-response',
      'counter-explainer',
      'offer-strategy',
      'offer-comparison',
      'pricing-conversation-prep',
      'appointment-follow-up',
      'showing-tour-prep',
      'low-appraisal-response',
      'team-pnl-review',
      'new-construction-review',
      'listing-description-writer',
      'market-update-email',
      'l10-meeting-prep',
      'open-house-follow-up',
      'sphere-touch-plan',
    ]);
    expect(GUIDE_HTML).toEqual(Object.keys(GUIDES).map((slug) => `${slug}.html`));
    for (const slug of Object.keys(GUIDES)) {
      expect(GUIDES[slug]!.slug).toBe(slug);
      const shell = read(`../../${slug}.html`);
      expect(shell, slug).toContain('<!--guide:head-->');
      expect(shell, slug).toContain('<!--guide:body-->');
      // A skill page's shell loads skills.css, the guide styles plus its own (D-052).
      expect(shell, slug).toMatch(/href="\/src\/guides\/(guides|skills)\.css"/);
      expect(shell, slug).toContain('src="/src/guides/main.ts"');
    }
  });

  it('keeps every guide apart: its own anchor, PDF and unlock key', () => {
    const guides = Object.values(GUIDES);
    for (const pick of [(g: Guide) => g.download.href, (g: Guide) => g.unlockKey, (g: Guide) => g.download.filename]) {
      expect(new Set(guides.map(pick)).size).toBe(guides.length);
    }
  });

  it('names a slug nobody wrote as a build error', () => {
    expect(() => guideFor('nope')).toThrow(/No guide has the slug "nope"/);
  });
});

describe.each(Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>)('/%s', (slug) => {
  const want = EXPECTED[slug];
  const guide = guideFor(slug);
  const doc = parse(guide);
  const $ = (selector: string) => doc.querySelector(selector);
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));

  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe(want.title);
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe(`https://www.amplifiedimpact.io/${slug}`);
    expect($$('h1').map(text)).toEqual([want.h1]);
  });

  it("posts the opt-in to the guide's own route, as a plain form that works with no script", () => {
    const form = $('#guide-form') as HTMLFormElement;
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe(`/api/${slug}`);
    expect(form.hasAttribute('novalidate')).toBe(false);
    expect($$('#guide-form input').map((i) => (i as HTMLInputElement).name)).toEqual(['firstName', 'email', 'website']);
  });

  it('asks for a first name and an email, both required', () => {
    const name = $('#guide-firstName') as HTMLInputElement;
    const email = $('#guide-email') as HTMLInputElement;
    expect([name.name, name.type, name.required, name.autocomplete]).toEqual(['firstName', 'text', true, 'given-name']);
    expect([email.name, email.type, email.required, email.autocomplete]).toEqual(['email', 'email', true, 'email']);
    expect(text($('label[for="guide-firstName"]'))).toBe('First name');
    expect(text($('label[for="guide-email"]'))).toBe('Email');
  });

  it('has no phone field and no SMS box: the API refuses to record either from a guide (D-038)', () => {
    expect($$('input[name="phone"], input[name="smsConsent"], input[type="tel"], input[type="checkbox"]')).toEqual([]);
  });

  it('hides the honeypot from people and from the tab order', () => {
    const trap = $('#guide-website') as HTMLInputElement;
    expect(trap.name).toBe('website');
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('says, under the button, exactly what CONSENT.guides records, naming only Amplified Impact, LLC (D-041)', () => {
    expect(text($('#guide-form .legal'))).toBe(
      'By signing up, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
    );
    expect(text($('#guide-form .legal'))).toBe(CONSENT.guides);
    const links = $$('#guide-form .legal a').map((a) => [text(a), a.getAttribute('href'), a.getAttribute('target')]);
    expect(links).toEqual([
      ['Terms of Service', '/terms', '_blank'],
      ['Privacy Policy', '/privacy', '_blank'],
    ]);
  });

  it('never mentions Spring or Spring B anywhere on the page (D-039)', () => {
    expect(doc.documentElement.outerHTML).not.toMatch(/Spring/);
  });

  it('has the button the reel promises, and an error line that is an alert', () => {
    expect(text($('#guide-form button[type="submit"]'))).toBe(want.button);
    expect($('#guide-error')?.getAttribute('role')).toBe('alert');
  });

  it('keeps the download in the same card as the form, behind it, under its own unlock key', () => {
    const card = $(`#${want.anchor}`)!;
    expect(card.getAttribute('data-unlock-key')).toBe(want.unlockKey);
    const download = $('#download')!;
    expect(download.closest(`#${want.anchor}`)).toBe(card);
    expect(download.classList.contains('unlocked')).toBe(true);
    expect(download.getAttribute('tabindex')).toBe('-1');
    expect($('#guide-form')!.closest('.locked')?.closest(`#${want.anchor}`)).toBe(card);
  });

  it('offers one "Download Here", saved under the guide\'s own name, from a file the build ships', () => {
    expect($$('[data-download]')).toHaveLength(1);
    const link = $('#download a[data-download]')!;
    expect(text(link)).toBe('Download Here');
    expect(link.getAttribute('href')).toBe(want.file);
    expect(link.getAttribute('download')).toBe(want.filename);
    const file = readFileSync(resolve(HERE, `../../public${want.file}`));
    expect(file.subarray(0, want.magic.length).toString('latin1')).toBe(want.magic);
    expect(file.length).toBeGreaterThan(want.minBytes);
  });

  it('has the in-app browser hint, hidden until the script finds one', () => {
    const hint = $('#download [data-in-app]') as HTMLElement;
    expect(hint.hidden).toBe(true);
    expect(text(hint)).toMatch(/Open in browser/);
  });

  it('sends the lower button back up to the opt-in', () => {
    // Outside the opt-in card: inside it, a skill's setup steps have outline buttons of their own. In the
    // library's look (D-072) it is the "What you need" band's button.
    const lower = $$('main > section:not(.optin) a.btn-outline, main > .sk-band a.sk-cta');
    expect(lower.map((a) => [text(a), a.getAttribute('href')])).toEqual([
      [want.button, `#${want.anchor}`],
    ]);
  });

  it('names every section by its own heading, with no id used twice', () => {
    for (const section of $$('section[aria-labelledby]')) {
      expect(doc.getElementById(section.getAttribute('aria-labelledby')!), section.className).not.toBeNull();
    }
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links the Terms and Privacy Policy from the footer too', () => {
    expect($$('footer a').map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy']);
  });

  it('follows the house rule: no em dashes anywhere in the copy', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(JSON.stringify(guide)).not.toContain('—');
  });
});

describe('The Ops Time Audit, its own parts (D-039)', () => {
  const doc = parse(guideFor('ops-time-audit'));
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));

  it("shows page 2's example report as a real table, with its headers and five rows", () => {
    expect($$('.report-table thead th').map(text)).toEqual(['Category', 'Est. hrs/wk', 'Evidence', 'Tag', 'AI-ready']);
    const rows = $$('.report-table tbody tr').map((tr) => [
      text(tr.querySelector('th[scope="row"]')),
      text(tr.querySelector('.hrs')),
      text(tr.querySelector('.tag')),
      text(tr.querySelector('.ready')),
    ]);
    expect(rows).toEqual([
      ['Follow-up writing', '6.5 hrs/wk', 'Draft', 'AI-ready: Yes'],
      ['Transaction coordination', '4 hrs/wk', 'Draft', 'AI-ready: Partial'],
      ['Meeting notes and action items', '3 hrs/wk', 'Run', 'AI-ready: Yes'],
      ['Lead routing and assignment', '2.5 hrs/wk', 'Run', 'AI-ready: Partial'],
      ['Reporting and scorecard assembly', '2 hrs/wk', 'Run', 'AI-ready: Yes'],
    ]);
    expect(text(doc.querySelector('.verdict'))).toMatch(/^Build this first: Follow-up writing\. It has more hours/);
  });

  it('names the three doors with the plan each needs', () => {
    const doors = $$('.tile-label').map((label) => {
      const li = label.closest('li')!;
      return [text(label), text(li.querySelector('strong')), text(li.querySelector('.tile-tag'))];
    });
    expect(doors).toEqual([
      ['Door A', 'Connected tools', 'Paid Claude plans'],
      ['Door B', 'Files or screenshots', 'Any Claude plan'],
      ['Door C', 'Interview', 'Any Claude plan'],
    ]);
  });

  it('points to the Task Sync Starter Kit in the same tab, as page 8 does', () => {
    const link = doc.querySelector('.crosslink a')!;
    expect(text(link)).toBe('The Task Sync Starter Kit');
    expect(link.getAttribute('href')).toBe('/task-sync-starter');
    expect(link.hasAttribute('target')).toBe(false);
  });
});

/**
 * The entries of a ZIP, read from its central directory, and each one's contents. Enough of the format
 * for a test: no ZIP64, no encryption, stored or deflated.
 */
function unzip(buf: Buffer): Map<string, Buffer> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('No end of central directory: not a ZIP.');
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const skip = nameLength + buf.readUInt16LE(at + 30) + buf.readUInt16LE(at + 32);
    const name = buf.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const local = buf.readUInt32LE(at + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(raw) : raw);
    at += 46 + skip;
  }
  return out;
}

describe('The Reel Editor, its own parts (D-045)', () => {
  const guide = guideFor('reel-editor');
  const doc = parse(guide);
  const $ = (selector: string) => doc.querySelector(selector);
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
  const steps = () => $$('#download .setup > li');

  it('walks through setup in the unlocked card, numbered, with the download as step 2', () => {
    expect(steps().map((li) => [text(li.querySelector('.setup-n')), text(li.querySelector('h3'))])).toEqual([
      ['1', 'Turn On Code Execution'],
      ['2', 'Download the Skill'],
      ['3', 'Add It to Claude'],
      ['4', 'Make Your First Reel'],
    ]);
    // The number is drawn, and the list already says it.
    expect(steps().every((li) => li.querySelector('.setup-n')?.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(steps()[1]!.querySelector('a[data-download]')).not.toBeNull();
    expect(steps()[1]!.querySelector('[data-in-app]')).not.toBeNull();
    expect(text(steps()[1])).toContain('Don’t unzip it.');
  });

  it("opens Claude's own settings and skills pages in a new tab, from steps 1 and 3", () => {
    const links = $$('#download .setup a:not([data-download]):not([data-copy-open])').map((a) => [
      text(a),
      a.getAttribute('href'),
      a.getAttribute('target'),
      a.getAttribute('rel'),
    ]);
    expect(links).toEqual([
      ['Open Claude Settings', 'https://claude.ai/settings/capabilities', '_blank', 'noopener'],
      ['Open Claude Skills', 'https://claude.ai/customize/skills', '_blank', 'noopener'],
    ]);
  });

  it('copies the first Reel prompt and opens a new Claude chat from its step, in a new tab (D-070)', () => {
    const open = $$('#download .setup a[data-copy-open]');
    expect(open.map((a) => [text(a), a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      ['Copy & Open Claude', 'https://claude.ai/new', '_blank'],
    ]);
    expect(open[0]?.closest('.setup-step')?.querySelector('[data-copy-text]')).not.toBeNull();
  });

  it('walks the setup one step at a time once the script runs, with Back and Next in the markup (D-070)', () => {
    const box = $('#download [data-guided]');
    expect(box?.getAttribute('data-guided-key')).toBe('re-unlocked-step-claude');
    expect(steps().map((li) => li.getAttribute('data-step'))).toEqual(['1', '2', '3', '4']);
    expect(box?.querySelector('[data-guided-progress]')?.getAttribute('data-guided-progress')).toBe('Step {n} of {total}');
    expect($$('#download [data-guided-nav] button').map(text)).toEqual(['Back', 'Next', 'Start Over']);
    // Hidden until the script turns the list into steps: with no script, every step shows.
    expect(box?.querySelector('[data-guided-nav]')?.hasAttribute('hidden')).toBe(true);
  });

  it('says, in Instagram, to open the real browser, about a ZIP rather than a PDF', () => {
    const hint = text($('#download [data-in-app]'));
    expect(hint).toMatch(/Open in browser/);
    expect(hint).not.toMatch(/PDF/);
  });

  it('ships the skill as Claude takes it: one reel-editor folder whose SKILL.md is named reel-editor', () => {
    // Claude's upload refuses a ZIP whose folder name and skill name differ, or that has no SKILL.md.
    const zip = unzip(readFileSync(resolve(HERE, '../../public/downloads/reel-editor.zip')));
    const names = [...zip.keys()];
    expect(names.every((n) => n.startsWith('reel-editor/'))).toBe(true);
    expect(names.some((n) => n.includes('__MACOSX') || n.endsWith('.DS_Store'))).toBe(false);
    const skill = zip.get('reel-editor/SKILL.md')?.toString('utf8') ?? '';
    expect(skill.match(/^---\nname: (.+)\n/)?.[1]).toBe('reel-editor');
    expect(names).toContain('reel-editor/scripts/setup.sh');
  });

  it("sends a phone to a computer: a mailto with the page, and the share sheet's title and link", () => {
    const handoff = $('#download .handoff')!;
    expect(handoff.compareDocumentPosition($('#download .setup')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const link = handoff.querySelector('a[data-share]')!;
    expect(text(link)).toBe('Send This to My Computer');
    const href = link.getAttribute('href')!;
    expect(href.startsWith('mailto:?')).toBe(true);
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe('Reel Editor: add it to Claude on your computer');
    expect(params.get('body')).toBe('Open this on your computer:\nhttps://www.amplifiedimpact.io/reel-editor#download');
    expect(link.getAttribute('data-share-title')).toBe('Reel Editor: add it to Claude on your computer');
    expect(link.getAttribute('data-share-url')).toBe('https://www.amplifiedimpact.io/reel-editor#download');
  });

  it('copies "Edit this into a Reel" from step 4, by a button named for what it does', () => {
    const chip = steps()[3]!.querySelector('button[data-copy]')!;
    expect(chip.getAttribute('type')).toBe('button');
    expect(text(chip.querySelector('[data-copy-text]'))).toBe('Edit this into a Reel');
    expect(text(chip.querySelector('.visually-hidden'))).toBe('Copy:');
    expect(chip.querySelector('.chip-tag')?.getAttribute('aria-hidden')).toBe('true');
    expect(chip.getAttribute('data-toast')).toBe('Copied. Paste it into Claude.');
  });

  it("lists what to say, in the README's three groups, each one a copy button", () => {
    const section = $('section.prompts')!;
    expect(text(section.querySelector('h2'))).toBe('What to say');
    expect($$('section.prompts .sk-group').map(text)).toEqual([
      'To start',
      'Quick fixes, no full re-render',
      'Other changes',
    ]);
    expect($$('section.prompts [data-copy-text]').map(text)).toEqual([
      'Edit this into a Reel',
      'Make this more engaging with animations, sound effects and music',
      'Make my voice louder',
      'Turn the sound effects down',
      'No music',
      'Move the graphics lower',
      'Make it look more like a creator edited it',
      'Cleaner, less busy',
    ]);
  });

  it('has the one live region the copy buttons report to', () => {
    expect($$('[aria-live]').map((el) => [el.id, el.getAttribute('role'), el.getAttribute('aria-live')])).toEqual([
      ['guide-live', 'status', 'polite'],
    ]);
  });

  it('answers its questions in <details>, which open with no script', () => {
    const items = $$('section.faq details.faq-item');
    expect(items.map((d) => text(d.querySelector('summary')))).toEqual([
      'Does it work on Claude’s free plan?',
      'Claude stopped partway through.',
      'How long does it take?',
      'My video won’t upload.',
      'My Mac unzipped the download.',
      'The skill is greyed out, or setup fails.',
      'Can it match a style I like?',
      'Is the music safe to post?',
      'Does it work for TikTok and Shorts?',
      'Do I need editing software?',
    ]);
    expect(items.every((d) => text(d.querySelector('p')).length > 0)).toBe(true);
  });

  it("asks for a paid plan, as the skill's README does", () => {
    const section = $$('section.sk-band-cards').find((s) => text(s.querySelector('h2')) === 'What you need')!;
    const need = Array.from(section.querySelectorAll('li')).map((li) => [
      text(li.querySelector('strong')),
      text(li.querySelector('.sk-body')),
    ]);
    expect(need[0]).toEqual(['A paid Claude plan', 'Pro, Max, Team or Enterprise.']);
  });

  it('lays its four-card and two-card rows out two by two, each card with its small label', () => {
    expect($$('ul.sk-cards-2').map((ul) => ul.children.length)).toEqual([4, 2]);
    expect($$('ul.sk-cards-2 .sk-label').map(text)).toEqual([
      'You compare two things',
      'You walk through a process',
      'You list the rules',
      'You say a number',
      'Editorial',
      'Creator',
    ]);
    // Who does what is only Run, Draft and Own: these labels are cards, never that band.
    expect($$('.sk-roles')).toHaveLength(0);
  });

  it('puts what to say beside the questions, after the tips for the best results (D-072)', () => {
    expect($$('main > .sk-band h2').map(text)).toEqual([
      'What you get back',
      'Graphics that explain, not decorate',
      'Two looks',
      'What you need',
      'For the best results',
      'What to say',
      'Good to know',
    ]);
    const pair = $('.sk-pair')!;
    expect([...pair.children].map((c) => text(c.querySelector('h2')))).toEqual(['What to say', 'Good to know']);
  });
});

/** An MP4's top-level boxes, in order: enough to see the codec and where the index sits. */
function mp4Boxes(buf: Buffer): string[] {
  const boxes: string[] = [];
  for (let at = 0; at + 8 <= buf.length;) {
    const size = buf.readUInt32BE(at);
    boxes.push(buf.subarray(at + 4, at + 8).toString('latin1'));
    if (size < 8) break;
    at += size;
  }
  return boxes;
}

describe("The Reel Editor's before and after (D-045)", () => {
  const doc = parse(guideFor('reel-editor'));
  const figures = Array.from(doc.querySelectorAll('section.compare figure.clip'));

  it('sits beside the opt-in, in the hero: the raw take beside the Reel the skill made of it (D-072)', () => {
    const hero = doc.querySelector('main .sk-hero');
    expect([...(hero?.children ?? [])].map((el) => el.className)).toEqual(['sk-intro', 'card optin', 'compare sk-show sk-compare']);
    const compare = hero?.querySelector('section.compare');
    expect(compare?.getAttribute('aria-labelledby')).toBe(compare?.querySelector('h2')?.id);
    expect(text(compare?.querySelector('h2'))).toBe('One take, before and after');
    expect(doc.querySelectorAll('section.compare')).toHaveLength(1);
    expect(figures.map((f) => text(f.querySelector('.clip-label')))).toEqual(['Before · 2:45', 'After · 1:05']);
  });

  it.each([
    ['/media/reel-editor-before.mp4', '/media/reel-editor-before.jpg'],
    ['/media/reel-editor-after.mp4', '/media/reel-editor-after.jpg'],
  ])('ships %s as H.264 with its index first, and its poster as a JPEG', (src, poster) => {
    const video = figures.find((f) => f.querySelector('source')?.getAttribute('src') === src)?.querySelector('video');
    expect(video?.getAttribute('poster')).toBe(poster);
    const mp4 = readFileSync(resolve(HERE, `../../public${src}`));
    // H.264 ('avc1'), never HEVC, which Firefox and many Android phones cannot play.
    expect(mp4.includes(Buffer.from('avc1'))).toBe(true);
    expect(mp4.includes(Buffer.from('hvc1')) || mp4.includes(Buffer.from('hev1'))).toBe(false);
    // `moov` before `mdat` ("faststart"): it plays before it has all downloaded.
    const boxes = mp4Boxes(mp4);
    expect(boxes.indexOf('moov')).toBeGreaterThanOrEqual(0);
    expect(boxes.indexOf('moov')).toBeLessThan(boxes.indexOf('mdat'));
    // Small enough to stream on a phone, and to keep in the repository.
    expect(mp4.length).toBeLessThan(15_000_000);
    const jpg = readFileSync(resolve(HERE, `../../public${poster}`));
    expect([jpg[0], jpg[1]]).toEqual([0xff, 0xd8]);
    expect(jpg.length).toBeLessThan(150_000);
  });
});

describe('the before-and-after section (D-045)', () => {
  // The markup contract, on a guide made up for it.
  const clip = (label: string, length: string) => ({
    label,
    length,
    caption: `${label} caption.`,
    src: `/media/${label.toLowerCase()}.mp4`,
    poster: `/media/${label.toLowerCase()}.jpg`,
    width: 720,
    height: 1280,
  });
  const doc = parse({
    ...guideFor('reel-editor'),
    sections: [
      {
        kind: 'compare',
        eyebrow: 'Real Example',
        heading: 'One clip, before and after',
        body: 'Straight off the camera, then edited.',
        clips: [clip('Before', '1:40'), clip('After', '1:05')],
      },
    ],
  });
  const figures = Array.from(doc.querySelectorAll('section.compare figure.clip'));

  it('shows each clip as a captioned figure, in order, under its own heading', () => {
    expect(text(doc.querySelector('section.compare h2'))).toBe('One clip, before and after');
    expect(figures.map((f) => text(f.querySelector('figcaption')))).toEqual([
      'Before · 1:40 Before caption.',
      'After · 1:05 After caption.',
    ]);
  });

  it('plays inline with controls, and fetches nothing but the poster until played', () => {
    for (const f of figures) {
      const video = f.querySelector('video')!;
      expect(video.hasAttribute('controls')).toBe(true);
      expect(video.hasAttribute('playsinline')).toBe(true);
      expect(video.getAttribute('preload')).toBe('none');
      expect(video.hasAttribute('autoplay')).toBe(false);
      expect([video.getAttribute('width'), video.getAttribute('height')]).toEqual(['720', '1280']);
      expect(video.getAttribute('poster')).toMatch(/^\/media\/.+\.jpg$/);
      const source = video.querySelector('source')!;
      expect(source.getAttribute('type')).toBe('video/mp4');
      expect(source.getAttribute('src')).toMatch(/^\/media\/.+\.mp4$/);
    }
  });
});

describe('a PDF guide, untouched by the skill parts (D-045)', () => {
  it.each(['ops-time-audit'])('/%s has no setup, handoff, copy buttons or live region', (slug) => {
    const doc = parse(guideFor(slug));
    expect(doc.querySelectorAll('.setup, .handoff, [data-copy], [aria-live], details').length).toBe(0);
  });
});

describe('the Task Sync Starter Kit, walked one step at a time (D-070)', () => {
  const doc = parse(guideFor('task-sync-starter'));
  const steps = () => [...doc.querySelectorAll('#download .setup-step')];

  it('follows the kit: download, training off, the prompt, a test run, tools, then the morning run', () => {
    expect(steps().map((li) => text(li.querySelector('h3')))).toEqual([
      'Download the Kit',
      'Turn Off Training First',
      'Copy the Task Sync Prompt',
      'Test It on Last Week’s Meeting',
      'Connect Your Tools',
      'Run It Every Weekday Morning',
    ]);
    expect(steps()[0]?.querySelector('a[data-download]')?.getAttribute('href')).toBe('/downloads/task-sync-starter-kit.pdf');
  });

  it('copies the kit’s prompt and morning add-on exactly as written, each with Copy & Open Claude', () => {
    const blocks = [...doc.querySelectorAll('#download .chip-block [data-copy-text]')].map((el) => el.textContent);
    expect(blocks).toEqual([TASK_SYNC_PROMPT, TASK_SYNC_MORNING_ADD_ON]);
    expect(TASK_SYNC_PROMPT.startsWith('You are the follow-up coordinator for my real estate team.')).toBe(true);
    expect(TASK_SYNC_PROMPT).toContain('BEFORE YOU CREATE ANYTHING');
    expect(TASK_SYNC_PROMPT.endsWith('or give me a checklist I can paste.')).toBe(true);
    const opens = [...doc.querySelectorAll('#download a[data-copy-open]')];
    expect(opens.map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Copy & Open Claude', 'https://claude.ai/new'],
      ['Copy & Open Claude', 'https://claude.ai/new'],
    ]);
  });

  it('has the toast for its copy buttons, and its place remembered under its own key', () => {
    expect(doc.getElementById('guide-live')?.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelector('[data-guided]')?.getAttribute('data-guided-key')).toBe('tss-unlocked-step-claude');
  });
});

describe('who a guide sign-up hears from (D-041)', () => {
  it('is Amplified Impact, LLC, the same on the guide pages and in the legal pages', () => {
    expect(GUIDE_SENDERS).toBe('Amplified Impact, LLC');
    expect(SENDERS).toBe(GUIDE_SENDERS);
  });
});

describe('the layouts (D-071)', () => {
  it('draws every free skill, the Reel Editor and the Task Sync kit in the library’s look, and The Ops Time Audit in its own', () => {
    const looks = Object.values(GUIDES).filter((g) => g.layout === 'skill');
    expect(looks.map((g) => g.slug).sort()).toEqual(Object.keys(GUIDES).filter((slug) => slug !== 'ops-time-audit').sort());
    for (const g of looks) {
      const doc = parse(g);
      expect(doc.querySelector('header.sk-top nav[aria-label="Breadcrumb"] a[href="/library"]'), g.slug).not.toBeNull();
      expect(doc.querySelectorAll('.eyebrow'), g.slug).toHaveLength(1);
      expect(doc.querySelectorAll('.sk-hero > .sk-intro, .sk-hero > .optin'), g.slug).toHaveLength(2);
      // The hero's picture: a skill's sample, the Reel Editor's before and after, the kit's example.
      expect(doc.querySelector('.sk-hero > section.sample, .sk-hero > section.sk-show'), g.slug).not.toBeNull();
      // A paid skill (D-082) has the Skill Library card where a free one has its sign-up and setup.
      if (inSkillLibrary(g)) expect(doc.querySelector('#skill-library'), g.slug).not.toBeNull();
      else expect(doc.querySelector('[data-guided] .guided-head'), g.slug).not.toBeNull();
    }
    for (const g of looks.filter((x) => x.sections.some((s) => s.kind === 'sample'))) {
      // Every skill's sample has a "Bottom line" (or "Bottom line for the agent"), drawn as its callout.
      expect(text(parse(g).querySelector('.sk-hero .sample-bottom h3')), g.slug).toMatch(/^Bottom line/i);
    }
    const ota = parse(guideFor('ops-time-audit'));
    expect(ota.querySelector('header.hero')).not.toBeNull();
    expect(ota.querySelector('main.page')).not.toBeNull();
    expect(ota.querySelector('[class^="sk"], [class*=" sk-"], [data-sk-bar], .guided-head')).toBeNull();
  });

  it('sets the Task Sync kit’s example beside the opt-in as a sheet, the task in green, and names its own bar (D-072)', () => {
    const doc = parse(guideFor('task-sync-starter'));
    const example = doc.querySelector('.sk-hero > section.example.sk-show');
    expect(example?.getAttribute('aria-labelledby')).toBe(example?.querySelector('h2')?.id);
    expect(text(example?.querySelector('h2'))).toBe('One sentence from a team meeting, turned into a task');
    expect(text(example?.querySelector('blockquote'))).toBe(
      'Maria, can you get the Hendersons’ inspection response drafted before their deadline Thursday?',
    );
    expect(text(example?.querySelector('.sk-task .task-title'))).toBe('Draft the Hendersons’ inspection response');
    expect([...(example?.querySelectorAll('.sk-task dt') ?? [])].map(text)).toEqual(['Owner', 'Due', 'Priority', 'Subtasks', 'Source']);
    expect([...doc.querySelectorAll('.sk-facts li')].map(text)).toEqual(['Free', 'About 20 minutes to set up', 'Works in Claude']);
    expect(text(doc.querySelector('[data-sk-bar] a'))).toBe('Get the Free Kit');
    expect(doc.querySelector('[data-sk-bar] a')?.getAttribute('href')).toBe('#get-the-kit');
  });

  it('keeps the skill layout’s styles under its own classes, so a guide that loads skills.css draws as before', () => {
    const css = read('./skills.css');
    const own = css.slice(css.lastIndexOf('/*', css.indexOf('A skill page in the library')));
    const rules = own.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{/g) ?? [];
    const selectors = rules
      .map((r) => r.replace('{', '').trim())
      .filter((r) => !r.startsWith('@'))
      .flatMap((r) => r.split(','))
      .map((sel) => sel.trim())
      .filter(Boolean);
    expect(selectors.length).toBeGreaterThan(50);
    for (const sel of selectors) expect(sel, sel).toMatch(/^\.sk(-[a-z0-9-]+)?(?![a-z0-9-])/);
  });

  it('shows a long copy block’s first lines in a setup step, so Back and Next stay near it (D-072)', () => {
    const rule = read('./skills.css').match(/\.sk \.setup-body \.chip-block-text \{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('max-height: 264px');
    expect(rule).toContain('overflow: hidden');
    // Clipped for the eye only: the button still holds, and copies, every word.
    const tss = parse(guideFor('task-sync-starter'));
    expect(tss.querySelector('.setup-body .chip-block-text')?.textContent).toBe(TASK_SYNC_PROMPT);
  });

  it('keeps the card beside the sample in view only until it holds the setup', () => {
    const css = read('./skills.css');
    expect(css).toMatch(/\.sk \.optin \{\s*position: sticky;/);
    expect(css).toMatch(/\.sk \.optin\[data-state='unlocked'\] \{\s*position: static;/);
    expect(css).toMatch(/\.sk \.optin:has\(\.unlocked:target\) \{\s*position: static;/);
  });
});

describe('the stylesheet', () => {
  const css = read('./guides.css');

  it('hides the download until the visitor opts in, by script or by the no-JS 303', () => {
    expect(css).toMatch(/\.unlocked \{\s*display: none;\s*\}/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.unlocked,\s*\.unlocked:target \{\s*display: flex;/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.locked \{\s*display: none;/);
    expect(css).toMatch(/\.optin:has\(\.unlocked:target\) \.locked \{\s*display: none;/);
  });

  it('shows the form error for the no-JS 303 to #guide-error', () => {
    expect(css).toMatch(/\.form-error:target,\s*\.form-error\[data-shown\] \{\s*display: block;/);
  });

  it('shows the handoff to a computer on a touch screen only (D-045)', () => {
    expect(css).toMatch(/\.handoff \{\s*display: none;/);
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.handoff \{\s*display: flex;/);
  });

  it('never hides the empty toast with display: none, which would silence the next "Copied" (D-045)', () => {
    const empty = css.match(/\.toast:empty \{([^}]*)\}/)?.[1] ?? '';
    expect(empty).toContain('opacity: 0');
    expect(empty).not.toContain('display');
  });
});

describe('esc', () => {
  it('escapes what it renders', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
