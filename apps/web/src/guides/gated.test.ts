import { describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDED_PAGES, guidePageOf, isGuidedPage, previewOf, skillGuideUrl } from '@ai/core/skill-guides';
import type { GuideInline, SkillGuide } from '@ai/core/skill-guides';
import { isFreeGrokTemplate } from '@ai/core/grok-templates';
import { isFreeSkill, SKILL_CATALOG } from '@ai/core/skills';
import { GUIDES, isGuided, type Guide } from './content';
import { renderGuideBody, renderGuideHead } from './render';
import { exportGuide, exportSkillGuides } from './setup-export';
import { GUIDES_DIR, GUIDES_FILE, writeSkillGuides } from './vite-plugin';
import { SKILL_GUIDES_DIR, SKILL_GUIDES_FILE } from '@ai/core/skill-guides';

// D-151: the guided setups are behind sign-in. For every skill's and template's page, paid and free,
// nothing of the setup reaches the public HTML but the steps' titles, and all of it is in the
// server-only export the API answers from. The learn app never imports a guide's words.

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '../..');

const GUIDED = Object.values(GUIDES).filter(isGuided);
const html = (g: Guide) => `<head>${renderGuideHead(g)}</head><body>${renderGuideBody(g)}</body>`;
const parse = (g: Guide) => new DOMParser().parseFromString(`<!doctype html><html lang="en">${html(g)}</html>`, 'text/html');

/** A run of words as text. */
const plain = (segs: readonly GuideInline[] = []) => segs.map((s) => (typeof s === 'string' ? s : 'strong' in s ? s.strong : s.link)).join('');
/** HTML-escaped the way `render.ts` writes text, so a search finds what a page would hold. */
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Every piece of a guide's setup that must not be public: each step's words, its note, the words to
 * paste, and "What to say". Long enough to be the guide's own (a few short words, like "Open Claude.",
 * may also be in an FAQ), so a match is a leak and never a coincidence.
 */
function secretsOf(guide: SkillGuide): string[] {
  const out: string[] = [];
  for (const lane of guide.lanes) {
    for (const s of lane.steps) {
      out.push(plain(s.body), plain(s.note));
      if (s.copy) out.push(s.copy);
      if (s.copyBlock) out.push(s.copyBlock, ...s.copyBlock.split('\n'));
    }
  }
  for (const p of guide.prompts) for (const g of p.groups) out.push(...g.items);
  return [...new Set(out.map((t) => t.trim()).filter((t) => t.length >= 30))];
}

describe('the export, one guide per guided page (D-151)', () => {
  const file = exportSkillGuides();

  it('holds every skill’s and template’s page, and nothing else', () => {
    expect(Object.keys(file.guides).sort()).toEqual([...GUIDED_PAGES].sort());
    expect(GUIDED.map((g) => g.slug).sort()).toEqual([...GUIDED_PAGES].sort());
    for (const page of GUIDED_PAGES) expect(isGuidedPage(page)).toBe(true);
    // A page that is not a skill (a PDF guide, the Task Sync Starter Kit) has none.
    expect(file.guides['ops-time-audit']).toBeUndefined();
    expect(file.guides['task-sync-starter']).toBeUndefined();
  });

  it('carries each page’s whole setup, lane by lane, in www’s order, from the page’s own content', () => {
    for (const g of GUIDED) {
      const out = file.guides[g.slug]!;
      const d = g.download;
      const lanes = g.grok !== undefined ? [d.setup ?? []] : [...(d.grok ? [d.grok.setup] : []), d.setup ?? [], ...(d.chatgpt ? [d.chatgpt.setup] : [])];
      expect(out.lanes.map((l) => l.steps.map((s) => s.title)), g.slug).toEqual(lanes.map((l) => l.map((s) => s.title)));
      out.lanes.forEach((lane, i) => lane.steps.forEach((s, n) => {
        const src = lanes[i]![n]!;
        expect(s.copy, `${g.slug} ${s.title}`).toBe(src.copy);
        expect(s.copyBlock, `${g.slug} ${s.title}`).toBe(src.copyBlock);
      }));
      expect(out.skill, g.slug).toBe(g.skill ?? g.grok);
      expect(out.title).toBe(g.hero.title);
      // "What to say" moved with the setup.
      expect(out.prompts.length, g.slug).toBe(g.sections.filter((s) => s.kind === 'prompts').length);
    }
  });

  it('turns every file into one of the skill’s own file kinds, downloaded through the checked route', () => {
    for (const g of Object.values(file.guides)) {
      const catalog = SKILL_CATALOG.find((s) => s.id === g.skill)?.files;
      for (const lane of g.lanes) {
        for (const s of lane.steps) {
          if (s.action?.kind !== 'file') continue;
          if (catalog) expect(catalog[s.action.file], `${g.slug} ${s.title}`).toBeTruthy();
          else expect(s.action.file, g.slug).toBe('grok');
        }
      }
    }
  });

  it('points a link to another guided page at its guide in learn, and makes every other www link absolute', () => {
    const links = Object.values(file.guides).flatMap((g) =>
      g.lanes.flatMap((l) => l.steps.flatMap((s) => [...s.body, ...(s.note ?? [])].filter((x): x is Extract<GuideInline, { href: string }> => typeof x === 'object' && 'href' in x))),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      if (l.href.startsWith('/')) {
        expect(l.href).toMatch(/^\/skill-library\/[a-z0-9-]+$/);
        expect(l.sameTab).toBe(true);
      } else {
        expect(l.href).toMatch(/^(https:|mailto:)/);
      }
    }
  });

  it('carries each page’s sample output, which www shows anyone, only where the page has one, saying it is made up (D-179)', () => {
    for (const g of GUIDED) {
      const src = g.sections.find((x) => x.kind === 'sample');
      const out = file.guides[g.slug]!.sample;
      if (!src || src.kind !== 'sample') {
        expect(out, g.slug).toBeUndefined();
        continue;
      }
      expect(out, g.slug).toMatchObject({ title: src.title, body: src.body, note: src.note });
      expect(out!.blocks, g.slug).toHaveLength(src.blocks.length);
      // In its own words: learn labels it "Made-up data" as well, and draws it only where it is.
      expect(`${out!.body} ${out!.note}`, g.slug).toMatch(/made[- ]up|example data/i);
      // Public on www, so nothing of the setup rides along with it.
      const words = JSON.stringify(out);
      for (const secret of secretsOf(file.guides[g.slug]!)) expect(words.includes(secret), `${g.slug}: ${secret.slice(0, 40)}`).toBe(false);
    }
    expect(Object.values(file.guides).filter((x) => x.sample).length).toBeGreaterThan(40);
  });

  it('says the same as the preview www shows: the steps’ titles', () => {
    const g = file.guides['appointment-follow-up']!;
    expect(previewOf(g).lanes.map((l) => l.steps)).toEqual(g.lanes.map((l) => l.steps.map((s) => s.title)));
  });

  it('is written outside dist/, where no route serves it', () => {
    const root = mkdtempSync(join(tmpdir(), 'skill-guides-'));
    const path = writeSkillGuides(root, file);
    expect(relative(root, path)).toBe(join('dist-private', 'skill-guides.json'));
    // Where the API reads it from.
    expect([GUIDES_DIR, GUIDES_FILE]).toEqual([SKILL_GUIDES_DIR, SKILL_GUIDES_FILE]);
    expect(JSON.parse(readFileSync(path, 'utf8')).guides['perfect-week'].lanes.length).toBeGreaterThan(0);
  });
});

describe.each(GUIDED.map((g) => [g.slug, g] as const))('the public page /%s (D-151)', (slug, guide) => {
  const page = html(guide);
  const doc = parse(guide);
  const exported = exportGuide(guide);

  it('holds none of the setup’s words, the words to paste, or "What to say"', () => {
    const secrets = secretsOf(exported);
    // Something real to look for: every guide's setup has its own words.
    expect(secrets.length, slug).toBeGreaterThan(4);
    for (const secret of secrets) expect(page, `${slug}: ${secret.slice(0, 60)}`).not.toContain(esc(secret));
    expect(doc.querySelectorAll('[data-copy], [data-copy-text], .copy-open, [data-guided], .apps, .chip')).toHaveLength(0);
    expect(doc.getElementById('guide-live')).toBeNull();
  });

  it('links no file, free or paid', () => {
    expect(doc.querySelectorAll('a[download], a[href^="/downloads/"], [data-download]')).toHaveLength(0);
    expect(page).not.toContain('/downloads/');
  });

  it('shows the steps’ titles under "Set it up", and a line that the rest is in the guided setup', () => {
    const preview = doc.querySelector('[data-guide-preview]');
    const titles = Array.from(preview?.querySelectorAll('.setup-step h3') ?? []).map((h) => h.textContent);
    expect(titles).toEqual(previewOf(exported).lanes[0]?.steps);
    expect(preview?.querySelectorAll('.setup-step p, .setup-step a, .setup-step button')).toHaveLength(0);
  });

  it('leads to its guide in learn, which signs the visitor in first', () => {
    const card = doc.querySelector('[data-learn-guide]');
    expect(card?.getAttribute('data-learn-guide')).toBe(skillGuideUrl(slug));
    const free = guide.skill !== undefined ? isFreeSkill(guide.skill) : isFreeGrokTemplate(guide.grok ?? '');
    const unlock = Array.from(doc.querySelectorAll('a, button')).filter((el) => el.textContent === 'Unlock the Guided Setup');
    expect(unlock.length, slug).toBeGreaterThan(0);
    if (free) {
      // A free account: the sign-up's button unlocks it, then the link to the guide.
      expect(doc.querySelector('#guide-form button[type="submit"]')?.textContent).toBe('Unlock the Guided Setup');
      expect(doc.querySelector(`#check-email a[href="${skillGuideUrl(slug)}"]`)?.textContent).toBe('Open the Guided Setup');
    } else {
      // The plans, and "Already own it? Sign In" to the guide.
      expect(doc.querySelector('[data-skill-library] a.btn-primary')?.textContent).toBe('Unlock the Guided Setup');
      expect(doc.querySelector(`[data-skill-library] .legal a[href="${skillGuideUrl(slug)}"]`)?.textContent).toBe('Sign In');
    }
  });
});

describe('the learn app (D-151)', () => {
  /** Every source file the SPA bundles: everything under src/ but the www pages' own folders. */
  const WWW = ['guides', 'ai101', 'library', 'free', 'home', 'kit', 'site', 'about', 'agents', 'insiders', 'pricing', 'retool', 'team-build', 'teams', 'voice', 'legal', 'offer', 'assets'];
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return WWW.includes(name) && dir === join(WEB, 'src') ? [] : files(p);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
    });
  }

  it('never imports a guide’s words: no source it bundles reaches src/guides/', () => {
    const app = files(join(WEB, 'src'));
    expect(app.some((p) => p.endsWith('SkillGuide.tsx'))).toBe(true);
    for (const p of app) {
      const src = readFileSync(p, 'utf8');
      expect(src, relative(WEB, p)).not.toMatch(/from\s+['"][^'"]*\/guides\/[^'"]*['"]/);
    }
  });

  it('opens a guide by its page, the same address www’s card links to', () => {
    expect(guidePageOf('content-opportunity-research')).toBe('content-strategist');
    expect(skillGuideUrl('content-strategist')).toBe('https://learn.amplifiedimpact.io/skill-library/content-strategist');
  });
});
