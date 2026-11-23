import type * as Skills from '@ai/core/skills';
import { describe, expect, it, vi } from 'vitest';
import type { Guide } from './content';
import { skillGuideUrl } from '@ai/core/skill-guides';
import { renderGuideBody, renderSetup } from './render';
import { skillPage, type SkillPage } from './skill-page';

// What every free skill's page shares (D-052), on a made-up skill: the steps `skillPage()` writes, in
// Claude and in ChatGPT, the switch between them, and the new section and step parts the renderer
// draws for a skill. Each real skill page is held to its own source in `skills.test.ts`.
//
// A skill is free only when `FREE_SKILLS` names it (D-080), so the made-up skills here are named free,
// as a real one would be; one named nowhere is paid, and its page is the last group (D-082).
//
// D-151: no skill's page draws its setup any more (it is in learn, behind sign-in). The words each
// setup carries are still `skillPage()`'s, so the setup checks read them from `renderSetup()`, the
// renderer that draws them, and the page checks hold the public page to its preview.
vi.mock('@ai/core/skills', async (importOriginal) => {
  const real = await importOriginal<typeof Skills>();
  return { ...real, isFreeSkill: (id: string) => ['made-up-skill', 'made-up-folder'].includes(id) || real.isFreeSkill(id) };
});

const parse = (guide: Guide) => new DOMParser().parseFromString(`<!doctype html><body>${renderGuideBody(guide)}</body>`, 'text/html');
/** A guide's whole setup, as `renderSetup()` draws it: what the guide's content carries (D-151). */
const parseSetup = (guide: Guide) => new DOMParser().parseFromString(`<!doctype html><body>${renderSetup(guide)}</body>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const PASTE = 'For every request, follow made-up-skill-instructions.md.\nPaste your QUICK CARD below this line.';

const SPEC: SkillPage = {
  slug: 'made-up-skill',
  title: 'Made-Up Skill',
  meta: { title: 'Made-Up Skill · Amplified Impact', description: 'A skill for this test only.' },
  eyebrow: 'Free Claude Skill · For Testing',
  lede: 'It does one thing.',
  outcome: { n: 'ignored', title: 'Send It', body: 'After you check it.' },
  optInBody: 'Tell us where to send updates.',
  setupMinutes: 5,
  practice: { prompt: 'Review the practice file' },
  real: { body: ['Attach your own file and say this.'], prompt: 'Review this file' },
  chatgpt: { paste: `${PASTE}\n` },
  sections: [
    {
      kind: 'sample',
      eyebrow: 'Example Output',
      heading: 'What comes back',
      body: 'From the made-up practice file.',
      title: 'Review For 12 Example Lane',
      note: 'Made-up example. Shortened.',
      blocks: [
        { h: 'Bottom line' },
        { p: ['Two items need attention.'] },
        { items: ['First item', 'Second item'] },
        { table: { caption: 'Issue list', head: ['Item', 'Tier'], rows: [['Furnace', '1'], ['Gutter', '3']] } },
        { email: { subject: 'Inspection Results And Next Steps', body: ['Hi Sam,', 'Here is the read.'] } },
      ],
    },
  ],
  unlockKey: 'mus-unlocked',
};

describe('a skill page with a ChatGPT version', () => {
  const guide = skillPage(SPEC);
  const doc = parse(guide);
  const setup = parseSetup(guide);
  const lists = () => [...setup.querySelectorAll('.app-setup')];
  const titles = (setup: Element) => [...setup.querySelectorAll('.setup-step h3')].map(text);

  it('offers the skill, the ChatGPT version and the practice files, each saved under its own name', () => {
    expect(guide.download.href).toBe('/downloads/made-up-skill.zip');
    const saved = [...setup.querySelectorAll('a[download]')].map((a) => [a.getAttribute('href'), a.getAttribute('download')]);
    expect(saved).toContainEqual(['/downloads/made-up-skill.zip', 'made-up-skill.zip']);
    expect(saved).toContainEqual(['/downloads/made-up-skill-chatgpt.zip', 'made-up-skill-chatgpt.zip']);
    expect(saved).toContainEqual(['/downloads/made-up-skill-practice.zip', 'made-up-skill-practice.zip']);
    // A saved file opens nothing: no new tab.
    for (const a of setup.querySelectorAll('a[download]')) expect(a.getAttribute('target')).toBeNull();
    // D-151: the public page links none of them.
    expect(doc.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('asks which app with two radio buttons, Claude checked, each named by its label, no script needed', () => {
    const radios = [...setup.querySelectorAll<HTMLInputElement>('input[type="radio"][name="app"]')];
    expect(radios.map((r) => r.id)).toEqual(['app-claude', 'app-chatgpt']);
    expect(radios[0]?.hasAttribute('checked')).toBe(true);
    expect(radios[1]?.hasAttribute('checked')).toBe(false);
    for (const r of radios) {
      expect(text(setup.querySelector(`label[for="${r.id}"]`))).toBe(r.id === 'app-claude' ? 'Claude' : 'ChatGPT');
      expect(r.getAttribute('aria-describedby')).toBe('apps-q');
    }
    expect(text(setup.getElementById('apps-q'))).toBe('Which AI app do you use?');
    // The inputs come before both lists, as their siblings: what `:checked ~` needs (skills.css).
    const parent = radios[0]?.parentElement;
    const kids = [...(parent?.children ?? [])];
    expect(lists().every((l) => l.parentElement === parent)).toBe(true);
    expect(kids.indexOf(radios[1] as Element)).toBeLessThan(kids.indexOf(lists()[0] as Element));
  });

  it('turns off training before the practice, and practises before any real file, in both apps', () => {
    for (const setup of lists()) {
      const t = titles(setup);
      expect(t.indexOf('Turn Off Training First')).toBeGreaterThanOrEqual(0);
      expect(t.indexOf('Turn Off Training First')).toBeLessThan(t.indexOf('Practise on the Made-Up Example'));
      expect(t.indexOf('Practise on the Made-Up Example')).toBeLessThan(t.indexOf('Use It on Your Own Files'));
      expect(t.at(-1)).toBe('Use It on Your Own Files');
    }
  });

  it('walks Claude through code execution, the ZIP, the upload and privacy, by Claude’s own pages', () => {
    const claude = lists()[0] as Element;
    expect(titles(claude)).toEqual([
      'Check Code Execution Is On',
      'Download the Skill',
      'Add It to Claude',
      'Turn Off Training First',
      'Practise on the Made-Up Example',
      'Use It on Your Own Files',
    ]);
    const opened = [...claude.querySelectorAll('a[target="_blank"]')].map((a) => a.getAttribute('href'));
    expect(opened).toEqual([
      'https://claude.ai/settings/capabilities',
      'https://claude.ai/customize/skills',
      'https://claude.ai/settings/data-privacy-controls',
      // The practice step: Copy & Open Claude, then its pointers to the voice profile guide and to
      // AI Brain Setup (D-097).
      'https://claude.ai/new',
      '/voice-profile',
      '/ai-brain-setup',
      // The real-file step's Copy & Open Claude.
      'https://claude.ai/new',
    ]);
  });

  it('gives every step with words to say a Copy & Open for its own app, beside the copy chip (D-070)', () => {
    const [claude, chatgpt] = lists() as [Element, Element];
    const opens = (setup: Element) =>
      [...setup.querySelectorAll('a[data-copy-open]')].map((a) => [
        text(a.closest('.setup-step')?.querySelector('h3')),
        text(a),
        a.getAttribute('href'),
        a.getAttribute('data-toast'),
      ]);
    expect(opens(claude)).toEqual([
      ['Practise on the Made-Up Example', 'Copy & Open Claude', 'https://claude.ai/new', 'Copied. Paste it into Claude.'],
      ['Use It on Your Own Files', 'Copy & Open Claude', 'https://claude.ai/new', 'Copied. Paste it into Claude.'],
    ]);
    expect(opens(chatgpt).map((o) => [o[0], o[1], o[2]])).toEqual([
      ['Paste the Instructions', 'Copy & Open ChatGPT', 'https://chatgpt.com/'],
      ['Practise on the Made-Up Example', 'Copy & Open ChatGPT', 'https://chatgpt.com/'],
      ['Use It on Your Own Files', 'Copy & Open ChatGPT', 'https://chatgpt.com/'],
    ]);
    // Every one sits in a step with the words it copies.
    for (const a of setup.querySelectorAll('a[data-copy-open]')) {
      expect(a.closest('.setup-step')?.querySelector('[data-copy-text]')).not.toBeNull();
    }
  });

  it('remembers the place in each app apart: one guided setup per app, keyed by the page (D-070)', () => {
    expect([...setup.querySelectorAll('[data-guided]')].map((g) => g.getAttribute('data-guided-key'))).toEqual([
      'mus-unlocked-step-claude',
      'mus-unlocked-step-chatgpt',
    ]);
  });

  it('walks ChatGPT through a Project, never a custom GPT, and copies its instructions as written', () => {
    const chatgpt = lists()[1] as Element;
    expect(titles(chatgpt)).toEqual([
      'Turn Off Training First',
      'Download the ChatGPT Version',
      'Make a Project',
      'Add the Files',
      'Paste the Instructions',
      'Practise on the Made-Up Example',
      'Use It on Your Own Files',
    ]);
    expect(text(chatgpt)).not.toMatch(/custom GPT|GPT Store/i);
    const block = chatgpt.querySelector('button.chip-block[data-copy]');
    expect(block?.querySelector('[data-copy-text]')?.textContent).toBe(PASTE);
    expect(text(block)).toContain('Copy:');
  });

  it('sends Claude users to their My Voice project, and ChatGPT users to the QUICK CARD in this Project', () => {
    const [claude, chatgpt] = lists() as [Element, Element];
    const practise = (setup: Element) =>
      [...setup.querySelectorAll('.setup-step')].find((li) => text(li.querySelector('h3')) === 'Practise on the Made-Up Example');
    expect(text(practise(claude))).toContain('My Voice');
    expect(text(practise(chatgpt))).not.toContain('My Voice');
    expect(text(chatgpt)).toContain('QUICK CARD');
  });

  it('points both setups to AI Brain Setup, in a new tab like the voice guide, except on that page itself (D-097)', () => {
    const brainLinks = (d: Document) =>
      [...d.querySelectorAll('.app-setup a[href="/ai-brain-setup"]')].map((a) => [text(a), a.getAttribute('target')]);
    expect(brainLinks(setup)).toEqual([
      ['AI Brain', '_blank'],
      ['AI Brain', '_blank'],
    ]);
    const [claude] = lists() as [Element];
    expect(text(claude)).toContain('New to Claude? Set up your AI Brain first, so every skill starts out knowing your market, your team and your rules.');
    expect(brainLinks(parseSetup(skillPage({ ...SPEC, slug: 'ai-brain-setup' })))).toEqual([]);
  });

  it('copies the practice and real-file words with a tap, in both apps, and the public page copies nothing (D-151)', () => {
    const chips = [...setup.querySelectorAll('button.chip:not(.chip-block) [data-copy-text]')].map(text);
    expect(chips.filter((c) => c === 'Review the practice file')).toHaveLength(2);
    expect(chips.filter((c) => c === 'Review this file')).toHaveLength(2);
    expect(doc.querySelectorAll('[data-copy]')).toHaveLength(0);
    expect(doc.getElementById('guide-live')).toBeNull();
  });

  it('says "Set It Up Once" in the hero, for either app', () => {
    expect(guide.hero.steps.map((s) => [s.n, s.title])).toEqual([
      ['01', 'Set It Up Once'],
      ['02', 'Practise First'],
      ['03', 'Send It'],
    ]);
  });

  it('draws the sample as a document: its table in a named region a keyboard can scroll, its email with a subject', () => {
    const sample = doc.querySelector('section.sample');
    expect(text(sample?.querySelector('.sample-title'))).toBe('Review For 12 Example Lane');
    const region = sample?.querySelector('.sample-table');
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');
    const caption = region?.querySelector('caption');
    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect([...(region?.querySelectorAll('th') ?? [])].map((th) => th.getAttribute('scope'))).toEqual(['col', 'col']);
    expect(text(sample?.querySelector('.sample-subject'))).toBe('Subject: Inspection Results And Next Steps');
  });

  it('follows the house rule: no em dashes anywhere on the page', () => {
    expect(renderGuideBody(guide)).not.toMatch(/[–—]/);
  });
});

describe('what a skill can add to the steps', () => {
  const extra = { title: 'Make an Example Account', body: ['Sign up.'] };
  const { chatgpt: _none, ...claudeOnly } = SPEC;
  const guide = skillPage({ ...claudeOnly, practice: { prompt: 'Practise', zip: true }, extraClaudeSteps: [extra] });
  const titles = (guide.download.setup ?? []).map((s) => s.title);

  it('puts its own steps after the practice, which needs none of them, and before real files', () => {
    expect(titles.slice(-3)).toEqual(['Practise on the Made-Up Example', 'Make an Example Account', 'Use It on Your Own Files']);
  });

  it('says to attach the practice ZIP as it is when the set is too big to attach file by file', () => {
    const practise = (guide.download.setup ?? []).find((s) => s.title === 'Practise on the Made-Up Example');
    const words = (practise?.body ?? []).map((b) => (typeof b === 'string' ? b : 'strong' in b ? b.strong : '')).join('');
    expect(words).toBe('Download the practice files. Don’t unzip them. Start a new chat in Claude, attach the ZIP, and say this.');
  });
});

describe('a long prompt', () => {
  const long = 'Read the practice files and tell me what matters, then draft the email, '.repeat(3).trim();
  const guide = skillPage({ ...SPEC, practice: { prompt: long } });
  const practise = (guide.download.setup ?? []).find((s) => s.title === 'Practise on the Made-Up Example');

  it('is a copy block, not a chip a screen tall on a phone', () => {
    expect(practise?.copyBlock).toBe(long);
    expect(practise?.copy).toBeUndefined();
  });
});

describe('a skill page for Claude only', () => {
  const { chatgpt: _none, ...claudeOnly } = SPEC;
  const guide = skillPage({ ...claudeOnly, skill: 'made-up-folder' });
  const setup = parseSetup(guide);

  it('has no switch and one list of steps, and names the ZIP by the skill, not the page', () => {
    expect(setup.querySelector('input[name="app"]')).toBeNull();
    expect(setup.querySelectorAll('ol.setup')).toHaveLength(1);
    expect(guide.download.href).toBe('/downloads/made-up-folder.zip');
    expect(setup.querySelector('a[href="/downloads/made-up-folder-practice.zip"]')).not.toBeNull();
    expect(guide.hero.steps[0]?.title).toBe('Add It to Claude');
  });
});

describe('the skill layout (D-071)', () => {
  // The made-up skill with the sections a real skill page has, in their usual order.
  const guide = skillPage({
    ...SPEC,
    sections: [
      ...SPEC.sections,
      { kind: 'list', heading: 'What you get back', items: [{ title: 'A bottom line', body: 'Three sentences at most.' }] },
      {
        kind: 'tiles',
        heading: 'Who does what',
        note: 'The AI drafts. You decide.',
        items: [
          { label: 'Run', title: 'The AI reads', body: 'Every page.' },
          { label: 'Draft', title: 'You read it first', body: 'Nothing goes out.' },
          { label: 'Own', title: 'Always yours', body: 'Every call.' },
        ],
      },
      {
        kind: 'tiles',
        heading: 'What you need',
        cta: true,
        columns: 2,
        items: [
          { title: 'A Claude plan', body: 'With skills on.' },
          { title: 'A computer', body: 'To set it up.' },
        ],
      },
      { kind: 'prompts', heading: 'What to say', body: 'Tap to copy.', groups: [{ label: 'To start', items: ['Review this one'] }] },
      { kind: 'faq', heading: 'Good to know', items: [{ q: 'Which plan do I need?', a: ['Any plan with skills.'] }] },
      { kind: 'note', body: ['Selling instead? ', { link: 'Another skill', href: '/other', sameTab: true }, ' does that.'] },
    ],
  });
  const doc = parse(guide);

  it('is the layout every skill page gets, with the facts it shows as pills', () => {
    expect(guide.layout).toBe('skill');
    expect(guide.facts).toEqual(['Free', 'About 5 minutes to set up', 'Claude or ChatGPT']);
    const { chatgpt: _none, ...claudeOnly } = SPEC;
    expect(skillPage(claudeOnly).facts).toEqual(['Free', 'About 5 minutes to set up', 'Works in Claude']);
    expect([...doc.querySelectorAll('.sk-facts li')].map(text)).toEqual(['Free', 'About 5 minutes to set up', 'Claude or ChatGPT']);
  });

  it('opens with a top bar: the logo, then the breadcrumb back to the library', () => {
    const top = doc.querySelector('header.sk-top');
    expect(top?.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe('Amplified Impact');
    const crumbs = top?.querySelector('nav[aria-label="Breadcrumb"]');
    expect(crumbs?.querySelector('a')?.getAttribute('href')).toBe('/library');
    expect(text(crumbs?.querySelector('a'))).toBe('The Library');
    const here = crumbs?.querySelector('[aria-current="page"]');
    // The slash is drawn, never read.
    expect(here?.querySelector('[aria-hidden="true"]')?.textContent).toBe('/');
    expect(text(here)).toBe('/Made-Up Skill');
    // The guides' green cover and its steps are not on a skill page.
    expect(doc.querySelector('header.hero')).toBeNull();
    expect(doc.querySelector('.steps')).toBeNull();
  });

  it('has one h1, one main and one eyebrow on the page: the hero’s', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(text(doc.querySelector('h1'))).toBe('Made-Up Skill');
    expect(doc.querySelectorAll('main')).toHaveLength(1);
    expect([...doc.querySelectorAll('.eyebrow')].map(text)).toEqual(['Free Claude Skill · For Testing']);
  });

  it('sets the sample beside the opt-in, in the hero, once, as a sheet whose Bottom line reads first', () => {
    const hero = doc.querySelector('main .sk-hero');
    expect([...(hero?.children ?? [])].map((el) => el.className)).toEqual(['sk-intro', 'card optin', 'sample sk-sample']);
    expect(doc.querySelectorAll('section.sample')).toHaveLength(1);
    const sample = hero?.querySelector('section.sample');
    // Its heading and line of context are for a screen reader; the sheet says what it is.
    expect(sample?.querySelector('h2')?.className).toBe('visually-hidden');
    expect(sample?.getAttribute('aria-labelledby')).toBe(sample?.querySelector('h2')?.id);
    const bottom = sample?.querySelector('.sample-bottom');
    expect(text(bottom?.querySelector('h3'))).toBe('Bottom line');
    expect(text(bottom?.querySelector('p'))).toBe('Two items need attention.');
    // The toggle: hidden until the script peeks the sheet, and it controls the sheet.
    const more = sample?.querySelector<HTMLButtonElement>('button[data-sample-more]');
    expect(more?.hidden).toBe(true);
    expect(text(more)).toBe('See the Full Example');
    expect(more?.getAttribute('data-less')).toBe('Show Less');
    expect(more?.getAttribute('aria-controls')).toBe(sample?.querySelector('article.sample-doc')?.id);
  });

  it('keeps every id and attribute the script and the gate read, and the setup is in learn (D-151)', () => {
    const optin = doc.querySelector('section.optin');
    expect(optin?.id).toBe('get-the-skill');
    expect(optin?.getAttribute('data-unlock-key')).toBe('mus-unlocked');
    expect(optin?.getAttribute('data-learn-guide')).toBe(skillGuideUrl('made-up-skill'));
    expect(optin?.querySelector('.locked #guide-form')?.getAttribute('action')).toBe('/api/made-up-skill');
    expect(optin?.querySelector('#check-email.unlocked')).not.toBeNull();
    expect(doc.querySelectorAll('#download, [data-guided], a[data-copy-open], #app-claude')).toHaveLength(0);
    expect(doc.getElementById('guide-live')).toBeNull();
  });

  it('names the preview "Set it up", with its steps\u2019 titles only (D-151)', () => {
    const preview = doc.querySelector('[data-guide-preview]');
    expect(text(preview?.querySelector('.guided-title'))).toBe('Set it up');
    expect([...(preview?.querySelectorAll('.setup-step h3') ?? [])].map(text)).toEqual(guide.download.setup?.map((s) => s.title));
    expect(preview?.querySelector('[data-guided-progress], .setup-step p')).toBeNull();
  });

  it('draws each section below the hero as a band named by its heading', () => {
    const bands = [...doc.querySelectorAll('main > .sk-band')];
    expect(bands.map((b) => b.className)).toEqual([
      'sk-band sk-band-list',
      'sk-band sk-band-roles',
      'sk-band sk-band-cards',
      'sk-band sk-band-pair',
      'sk-band sk-band-note',
    ]);
    for (const b of bands.filter((el) => el.tagName === 'SECTION')) {
      expect(text(doc.getElementById(b.getAttribute('aria-labelledby') ?? ''))).not.toBe('');
    }
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks who does what as Run, Draft and Own, and sends "What you need" back up to the card', () => {
    expect([...doc.querySelectorAll('.sk-roles .sk-role')].map(text)).toEqual(['Run', 'Draft', 'Own']);
    expect(text(doc.querySelector('.sk-band-roles .sk-sub'))).toBe('The AI drafts. You decide.');
    expect(doc.querySelector('.sk-cards')?.classList.contains('sk-cards-2')).toBe(true);
    const cta = doc.querySelector('.sk-band-cards a.btn');
    expect(cta?.getAttribute('href')).toBe('#get-the-skill');
    expect(text(cta)).toBe('Get the Skill');
  });

  it('keeps the questions, and takes "What to say" into the guided setup (D-151)', () => {
    expect(doc.querySelector('.prompts, .sk-pair')).toBeNull();
    expect(doc.body.textContent).not.toContain('Review this one');
    expect(doc.querySelector('.sk-band-pair .faq details summary')).not.toBeNull();
    // Still the page's own words, for the guided setup in learn (`setup-export.ts`; a made-up skill has
    // no catalog files, so it is not exported here).
    expect(guide.sections.filter((x) => x.kind === 'prompts')).toHaveLength(1);
  });

  it("has the phone's sign-up bar, hidden until the script shows it, leading to the card", () => {
    const bar = doc.querySelector<HTMLElement>('[data-sk-bar]');
    expect(bar?.hidden).toBe(true);
    expect(bar?.querySelector('a')?.getAttribute('href')).toBe('#get-the-skill');
    expect(text(bar)).toBe('Unlock the Guided Setup');
  });

  it('follows the house rule: no em dashes anywhere on the page', () => {
    expect(renderGuideBody(guide)).not.toMatch(/[–—]/);
  });
});

describe('a paid skill’s page (D-082, D-101)', () => {
  // The made-up skill with the sections a real skill page has, under a name `FREE_SKILLS` lacks.
  const guide = skillPage({
    ...SPEC,
    slug: 'made-up-paid-skill',
    unlockKey: 'mups-unlocked',
    sections: [
      ...SPEC.sections,
      {
        kind: 'tiles',
        heading: 'What you need',
        cta: true,
        items: [{ title: 'A Claude plan', body: 'With skills on.' }],
      },
      { kind: 'faq', heading: 'Good to know', items: [{ q: 'Which plan do I need?', a: ['Any plan with skills.'] }] },
    ],
  });
  const html = renderGuideBody(guide);
  const doc = parse(guide);

  it('names its skill, which is paid, while its words and setup stay in the guide for the day it is free', () => {
    expect(guide.skill).toBe('made-up-paid-skill');
    expect(guide.download.setup?.length).toBeGreaterThan(0);
  });

  it('keeps the hero and the sample, with the Skill Library card where the opt-in was', () => {
    const hero = doc.querySelector('main .sk-hero');
    expect([...(hero?.children ?? [])].map((el) => el.className)).toEqual(['sk-intro', 'card optin', 'sample sk-sample']);
    expect(text(doc.querySelector('h1'))).toBe('Made-Up Skill');
    expect(text(doc.querySelector('.sk-lede'))).toBe('It does one thing.');
    expect(text(hero?.querySelector('.sample-title'))).toBe('Review For 12 Example Lane');
    const card = hero?.querySelector('.optin');
    expect(card?.id).toBe('skill-library');
    expect(card?.hasAttribute('data-skill-library')).toBe(true);
    // A made-up skill has no catalog row, so it opens with Amplified Insiders (D-115, `unlockFor`).
    expect(text(doc.getElementById(card?.getAttribute('aria-labelledby') ?? ''))).toBe('Get this skill');
    expect(text(card?.querySelector('h2 + p'))).toBe('It’s part of Amplified Insiders: every skill, 2 new skills a month, and weekly office hours.');
    const top = card?.querySelector(':scope > .locked');
    const links = [...(top?.querySelectorAll('a') ?? [])].map((a) => [text(a), a.getAttribute('href'), a.getAttribute('class'), a.getAttribute('target')]);
    expect(links).toEqual([
      ['Get This Skill, $37', 'https://buy.stripe.com/8x200k71d8kCbWJ5oN73G0f', 'btn btn-primary', null],
      ['Unlock Every Skill With Amplified Insiders, $197/Month', 'https://buy.stripe.com/aFadRa0CPgR80e1aJ773G07', 'btn btn-primary', null],
      ['Sign In', skillGuideUrl('made-up-paid-skill'), null, null],
    ]);
    expect(text(top?.querySelector('.legal'))).toBe('Already own it? Sign In');
  });

  it('has no opt-in and no download: nothing to post, and no ZIP in the markup', () => {
    expect(doc.querySelector('form, input, [data-unlock-key], #download, .unlocked, .handoff, a[download]')).toBeNull();
    expect(html).not.toContain('/downloads/');
    expect(html).not.toContain('/api/made-up-paid-skill');
  });

  it('shows only the setup\u2019s step titles under the card: the setup itself is in learn (D-151)', () => {
    const preview = doc.querySelector('[data-skill-library] > [data-guide-preview]');
    expect([...(preview?.querySelectorAll('.setup-step h3') ?? [])].map(text)).toEqual(guide.download.setup?.map((s) => s.title));
    expect(doc.querySelectorAll('[data-guided], [data-copy-text], a.btn[href*="skill-library"]:not(.btn-primary)')).toHaveLength(0);
    // The whole setup is still the page's content, both apps, for learn's export.
    expect(guide.download.setup?.length).toBeGreaterThan(3);
    expect(guide.download.chatgpt?.setup.length).toBeGreaterThan(3);
  });

  it('sends "What you need" to the plans, has no sign-up bar, and copies nothing (D-151)', () => {
    const cta = doc.querySelector('.sk-band-cards a.btn');
    expect([text(cta), cta?.getAttribute('href'), cta?.className]).toEqual(['Get Amplified Insiders', '/pricing#insiders', 'btn btn-primary sk-cta']);
    expect(doc.querySelector('a[href^="#get-"]')).toBeNull();
    expect(doc.querySelector('[data-sk-bar]')).toBeNull();
    expect(doc.getElementById('guide-live')).toBeNull();
  });

  it('uses no id twice, and follows the house rule: no em dashes', () => {
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).not.toMatch(/[–—]/);
  });
});
