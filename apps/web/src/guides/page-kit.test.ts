// The shared page kit's template (skills/README.md, Page Kit): every section kind draws, in its own form,
// with no script error, and the controls a reader uses (Show The Details, Why Ask This, Pick This One, the
// Chart and Table switch) work. The build's own checks are skills/_page-kit/tests/run_tests.py (Python, in CI);
// this file runs the template's script in the test's jsdom window, so a kind that throws or draws nothing
// fails here before a page ships. It also draws every converted skill's committed sample page.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { listSkills, PAGE_KIT_DIR, readManifest, SKILLS_DIR } from '../../../../scripts/skills.mjs';

const TEMPLATE = readFileSync(join(PAGE_KIT_DIR, 'assets', 'base-template.html'), 'utf8');
/** The visuals sample with the kit sample's words merged in, as the build merges them. */
const WORDS = JSON.parse(readFileSync(join(PAGE_KIT_DIR, 'sample', 'words.json'), 'utf8')) as Record<string, unknown>;
const VISUALS = {
  ...(JSON.parse(readFileSync(join(PAGE_KIT_DIR, 'sample', 'page-visuals.json'), 'utf8')) as { sections: { kind: string }[] }),
  headline: WORDS.headline,
  findings: WORDS.findings,
};

/** The template filled as build_page.py fills it: the page's JSON in its one data slot, `</` escaped. */
function fill(page: unknown): string {
  const payload = JSON.stringify(page).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  return TEMPLATE.replace('/*FONTS*/', '').replace('/*PAGE_TITLE*/', 'Test').replace('/*PAGE_DATA*/', () => payload);
}

/** Draws a built page in this window: its data block and its script, as a browser would on load. */
function draw(html: string): Document {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.id = 'page';
  document.body.append(main, parsed.getElementById('page-data')!.cloneNode(true));
  const code = [...parsed.querySelectorAll('script:not([type])')].map((s) => s.textContent).join('\n');
  // The template's own code, read from the repository: it is what every page runs.
  new Function(code)();
  return document;
}

beforeEach(() => {
  localStorage.clear();
});

describe('the page kit template', () => {
  it('draws every section kind of the visuals sample, with no script error', () => {
    const doc = draw(fill(VISUALS));
    expect(doc.querySelectorAll('section.row')).toHaveLength(VISUALS.sections.length);
    for (const selector of ['.keys .tile .pbar', '.found .co', '.callouts .co', '.prog .pbar-goal', '.multiples .mini .bar', '.plot .bar.is-hold',
      '.meter .meter-mark', '.hbar-item .hbar-fill', '.dl-row .dl-move', '.nt .nt-src', '.pl .tag', '.qc .why-toggle', '.ch .pick', '.ros .ros-item',
      '.memo .memo-part', '.memo .ph', '.check-count', 'td.change']) {
      expect(doc.querySelector(selector), `${selector} is drawn`).not.toBeNull();
    }
  });

  it('gives each kind of real-world object its own form, never one shared card', () => {
    const doc = draw(fill(VISUALS));
    const forms = { question: '.qc', commitment: '.pl', choice: '.ch', agendaBlock: '.ros-item', memo: '.memo', callout: '.callouts .co', note: '.nt' };
    const classes = Object.fromEntries(Object.entries(forms).map(([k, sel]) => [k, new Set(doc.querySelector(sel)!.classList)]));
    const names = Object.keys(classes);
    for (const a of names) for (const b of names) {
      if (a >= b) continue;
      const shared = [...classes[a]!].filter((c) => classes[b]!.has(c) && !['on', 'off', 'hold', 'quiet'].includes(c));
      expect(shared, `${a} and ${b} share no class`).toEqual([]);
    }
  });

  it('keeps details closed until asked, and opens them on a click', () => {
    const doc = draw(fill(VISUALS));
    const toggles = [...doc.querySelectorAll<HTMLButtonElement>('.disc-toggle')];
    expect(toggles.length).toBeGreaterThan(1);
    for (const t of toggles) {
      const body = doc.getElementById(t.getAttribute('aria-controls')!)!;
      expect(t.getAttribute('aria-expanded')).toBe('false');
      expect(body.hasAttribute('hidden')).toBe(true);
      t.click();
      expect(t.getAttribute('aria-expanded')).toBe('true');
      expect(body.hasAttribute('hidden')).toBe(false);
    }
    const why = doc.querySelector<HTMLButtonElement>('.why-toggle')!;
    why.click();
    expect(doc.getElementById(why.getAttribute('aria-controls')!)!.hasAttribute('hidden')).toBe(false);
  });

  it('lets a reader pick one option, switch a chart to its table, and tick the checklist', () => {
    const doc = draw(fill(VISUALS));
    const picks = [...doc.querySelectorAll<HTMLButtonElement>('.ch .pick')];
    picks[1]!.click();
    expect(picks.map((p) => p.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    picks[0]!.click();
    expect(picks.map((p) => p.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    const [chartBtn, tableBtn] = [...doc.querySelectorAll<HTMLButtonElement>('.view-toggle')[0]!.querySelectorAll('button')];
    tableBtn!.click();
    expect(tableBtn!.getAttribute('aria-pressed')).toBe('true');
    expect(chartBtn!.getAttribute('aria-pressed')).toBe('false');
    const box = doc.querySelector<HTMLInputElement>('.check input')!;
    box.click();
    expect(doc.querySelector('.check-count')!.textContent).toContain('1 of 1 checked');
  });

  it('shows a [placeholder] in a draft as a blank, and a highlighted phrase as text, never markup', () => {
    const doc = draw(fill(VISUALS));
    expect([...doc.querySelectorAll('.ph')].map((n) => n.textContent)).toContain('[Focus]');
    expect(doc.querySelector('strong.hl')!.textContent).toBe('$41,550 short');
    const hostile = JSON.parse(JSON.stringify(VISUALS));
    hostile.sections[0].items[0].text = '<img src=x onerror=alert(1)> **<b>bold</b>**';
    const drawn = draw(fill(hostile));
    expect(drawn.querySelector('.callouts img')).toBeNull();
    expect(drawn.querySelector('.callouts strong.hl')!.textContent).toBe('<b>bold</b>');
  });
});

describe('a page with one section it cannot draw', () => {
  it('says so in that section and still draws every other section', () => {
    const broken = JSON.parse(JSON.stringify(VISUALS));
    broken.sections[1].items = 'not a list';
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      const doc = draw(fill(broken));
      expect(doc.querySelectorAll('section.row')).toHaveLength(VISUALS.sections.length);
      expect(doc.querySelectorAll('.draw-error')).toHaveLength(1);
      expect(doc.querySelector('.deck .qc')).not.toBeNull();
      expect(errors).toHaveLength(1);
    } finally {
      console.error = original;
    }
  });
});

describe.each(listSkills().filter((name) => readManifest(name).pageKit === true))('skills/%s sample page', (name) => {
  const dir = join(SKILLS_DIR, name, 'evals', 'page');
  const pages = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.html')) : [];

  it('is committed', () => {
    expect(pages.length, `${name} has no built sample page in evals/page/`).toBeGreaterThan(0);
  });

  it.each(pages)('%s draws every section with no script error', (file) => {
    const html = readFileSync(join(dir, file), 'utf8');
    const data = JSON.parse(new DOMParser().parseFromString(html, 'text/html').getElementById('page-data')!.textContent!) as { sections: unknown[] };
    const doc = draw(html);
    expect(doc.querySelectorAll('section.row')).toHaveLength(data.sections.length);
    expect(doc.querySelector('h1.headline')!.textContent!.trim().length).toBeGreaterThan(0);
  });
});
