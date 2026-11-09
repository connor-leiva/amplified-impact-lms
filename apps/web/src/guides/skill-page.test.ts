import { describe, expect, it } from 'vitest';
import type { Guide } from './content';
import { renderGuideBody } from './render';
import { skillPage, type SkillPage } from './skill-page';

// What every free skill's page shares (D-052), on a made-up skill: the steps `skillPage()` writes, in
// Claude and in ChatGPT, the switch between them, and the new section and step parts the renderer
// draws for a skill. Each real skill page is held to its own source in `skills.test.ts`.

const parse = (guide: Guide) => new DOMParser().parseFromString(`<!doctype html><body>${renderGuideBody(guide)}</body>`, 'text/html');
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
  const lists = () => [...doc.querySelectorAll('.app-setup')];
  const titles = (setup: Element) => [...setup.querySelectorAll('.setup-step h3')].map(text);

  it('offers the skill, the ChatGPT version and the practice files, each saved under its own name', () => {
    expect(guide.download.href).toBe('/downloads/made-up-skill.zip');
    const saved = [...doc.querySelectorAll('a[download]')].map((a) => [a.getAttribute('href'), a.getAttribute('download')]);
    expect(saved).toContainEqual(['/downloads/made-up-skill.zip', 'made-up-skill.zip']);
    expect(saved).toContainEqual(['/downloads/made-up-skill-chatgpt.zip', 'made-up-skill-chatgpt.zip']);
    expect(saved).toContainEqual(['/downloads/made-up-skill-practice.zip', 'made-up-skill-practice.zip']);
    // A saved file opens nothing: no new tab.
    for (const a of doc.querySelectorAll('a[download]')) expect(a.getAttribute('target')).toBeNull();
  });

  it('asks which app with two radio buttons, Claude checked, each named by its label, no script needed', () => {
    const radios = [...doc.querySelectorAll<HTMLInputElement>('input[type="radio"][name="app"]')];
    expect(radios.map((r) => r.id)).toEqual(['app-claude', 'app-chatgpt']);
    expect(radios[0]?.hasAttribute('checked')).toBe(true);
    expect(radios[1]?.hasAttribute('checked')).toBe(false);
    for (const r of radios) {
      expect(text(doc.querySelector(`label[for="${r.id}"]`))).toBe(r.id === 'app-claude' ? 'Claude' : 'ChatGPT');
      expect(r.getAttribute('aria-describedby')).toBe('apps-q');
    }
    expect(text(doc.getElementById('apps-q'))).toBe('Which AI app do you use?');
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
      // The practice step: Copy & Open Claude, then its pointer to the voice profile guide.
      'https://claude.ai/new',
      '/voice-profile',
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
    for (const a of doc.querySelectorAll('a[data-copy-open]')) {
      expect(a.closest('.setup-step')?.querySelector('[data-copy-text]')).not.toBeNull();
    }
  });

  it('remembers the place in each app apart: one guided setup per app, keyed by the page (D-070)', () => {
    expect([...doc.querySelectorAll('[data-guided]')].map((g) => g.getAttribute('data-guided-key'))).toEqual([
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

  it('copies the practice and real-file words with a tap, and has the live region that reports it', () => {
    const chips = [...doc.querySelectorAll('button.chip:not(.chip-block) [data-copy-text]')].map(text);
    expect(chips.filter((c) => c === 'Review the practice file')).toHaveLength(2);
    expect(chips.filter((c) => c === 'Review this file')).toHaveLength(2);
    expect(doc.getElementById('guide-live')?.getAttribute('aria-live')).toBe('polite');
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
  const doc = parse(guide);

  it('has no switch and one list of steps, and names the ZIP by the skill, not the page', () => {
    expect(doc.querySelector('input[name="app"]')).toBeNull();
    expect(doc.querySelectorAll('ol.setup')).toHaveLength(1);
    expect(guide.download.href).toBe('/downloads/made-up-folder.zip');
    expect(doc.querySelector('a[href="/downloads/made-up-folder-practice.zip"]')).not.toBeNull();
    expect(guide.hero.steps[0]?.title).toBe('Add It to Claude');
  });
});
