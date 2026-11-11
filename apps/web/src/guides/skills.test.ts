// The free skills (DECISIONS.md D-052): every folder in `skills/` against the files the site serves.
//
// A skill's downloads are built from its source by `node scripts/skills.mjs build`, and committed under
// `public/downloads/`. This file fails when they drift apart: a ZIP that holds a file the source no
// longer has, or lacks one, or holds an older copy. It also holds each skill to its page, its shell and
// its library card, so a skill cannot ship half-listed. To fix a failure here, edit the source in
// `skills/` and rebuild, never the ZIP.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { expected as grokExpected, listTemplates } from '../../../../scripts/grok-templates.mjs';
import { check, DOWNLOADS_DIR, expected, listSkills, readManifest, shellFor, shellPath, SKILLS_DIR, unzip } from '../../../../scripts/skills.mjs';
import { ENTRIES } from '../library/content';
import { GUIDES } from './content';
import { renderGuideBody } from './render';
import { GUIDE_HTML } from './vite-plugin';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = listSkills();

it('has a source in skills/ for every skill page', () => {
  // The other direction from the checks below: a page that offers a skill's ZIP and has no source here
  // would ship a file nothing can rebuild. The Reel Editor's ZIP is Connor's own file (D-045).
  const pages = new Set(SKILLS.map((name) => readManifest(name).page));
  for (const guide of Object.values(GUIDES)) {
    // A Grok Bot template's page (D-100) offers its template's ZIP, from content/grok-bot-templates/.
    if (guide.slug === 'reel-editor' || guide.grok !== undefined || !guide.download.href.endsWith('.zip')) continue;
    expect(pages.has(guide.slug), `/${guide.slug} offers a ZIP but has no skills/ folder`).toBe(true);
  }
});

describe.each(SKILLS)('skills/%s', (name) => {
  const manifest = readManifest(name);

  it('passes the skill checks (Anthropic’s format and the house rules)', () => {
    expect(check(name).errors).toEqual([]);
  });

  it.each(expected(name).map((d) => [d.file, d] as const))('ships %s exactly as its source', (_file, download) => {
    const path = join(DOWNLOADS_DIR, download.file);
    expect(existsSync(path), `${download.file} is not built: run node scripts/skills.mjs build ${name}`).toBe(true);
    const zip = unzip(readFileSync(path));
    expect([...zip.keys()].sort()).toEqual(download.entries.map((e) => e.path).sort());
    for (const entry of download.entries) {
      expect(zip.get(entry.path)?.equals(entry.data), `${download.file}: ${entry.path} differs from its source`).toBe(true);
    }
  });

  it('has its page, which offers exactly these downloads', () => {
    const guide = GUIDES[manifest.page];
    expect(guide, `no page for /${manifest.page}: add it to GUIDES`).toBeDefined();
    if (!guide) return;
    expect(guide.download.href).toBe(`/downloads/${name}.zip`);
    expect(guide.download.filename).toBe(`${name}.zip`);
    const steps = [...(guide.download.setup ?? []), ...(guide.download.chatgpt?.setup ?? []), ...(guide.download.grok?.setup ?? [])];
    const files = steps.flatMap((s) => (s.action && s.action !== 'download' && s.action.download ? [s.action.href] : []));
    expect(files).toContain(`/downloads/${name}-practice.zip`);
    if (manifest.apps.includes('chatgpt')) {
      expect(guide.download.chatgpt, 'a skill with a ChatGPT version shows its ChatGPT steps').toBeDefined();
      expect(files).toContain(`/downloads/${name}-chatgpt.zip`);
      const paste = readFileSync(join(SKILLS_DIR, name, 'chatgpt', 'paste.txt'), 'utf8').trim();
      expect(steps.some((s) => s.copyBlock === paste), 'the page copies chatgpt/paste.txt, word for word').toBe(true);
    } else {
      expect(guide.download.chatgpt).toBeUndefined();
    }
    // A skill that ships a Grok Bot template (D-108) shows its steps in Grok Bot, with the template's ZIP.
    if (manifest.apps.includes('grok')) {
      expect(guide.download.grok, 'a skill with a Grok Bot template shows its Grok Bot steps').toBeDefined();
      expect(files).toContain(`/downloads/${name}-grok.zip`);
    } else {
      expect(guide.download.grok).toBeUndefined();
    }
  });

  it('has its shell and its build entry', () => {
    expect(readFileSync(shellPath(manifest.page), 'utf8')).toBe(shellFor(manifest.page));
    expect(GUIDE_HTML).toContain(`${manifest.page}.html`);
  });

  it('is in the free library, linked to its page', () => {
    expect(ENTRIES.some((e) => e.href === `/${manifest.page}`)).toBe(true);
  });
});

it('links only to pages that exist, so a skill page never ships pointing at one still to come', () => {
  // The other public pages a guide may link to (D-028, D-040, D-046, D-050, D-035), the offer and the
  // plans and prices a paid skill's page sends to (D-075, D-082, D-115), and every guide.
  const pages = new Set(['/library', '/ai101', '/voice-profile', '/retool', '/terms', '/privacy', '/offer', '/pricing', ...Object.keys(GUIDES).map((s) => `/${s}`)]);
  const html = Object.values(GUIDES).map((g) => renderGuideBody(g));
  for (const page of html) {
    for (const match of page.matchAll(/href="(\/[^"#?]*)/g)) {
      const href = match[1] ?? '';
      if (href.startsWith('/downloads/')) {
        expect(existsSync(join(DOWNLOADS_DIR, href.slice('/downloads/'.length))), `${href} is not in public/downloads`).toBe(true);
        continue;
      }
      expect(pages.has(href), `a guide page links to ${href}, which is not a page yet`).toBe(true);
    }
  }
});

it('keeps every download in public/downloads tied to a source', () => {
  // A skill's files (three, or four with a Grok Bot template, D-108), and the guides' own (their PDFs and the Reel Editor's ZIP, D-038, D-039, D-045).
  const fromSkills = new Set([
    ...SKILLS.flatMap((name) => expected(name).map((d) => d.file)),
    // And the Grok Bot templates' (D-100), each from its SKILL.md in content/grok-bot-templates/.
    ...listTemplates().flatMap((t) => grokExpected(t.id).map((d) => d.file)),
  ]);
  const zips = readdirSync(resolve(HERE, '../../public/downloads')).filter((f) => f.endsWith('.zip'));
  for (const file of zips) {
    if (file === 'reel-editor.zip') continue;
    expect(fromSkills.has(file), `${file} has no source in skills/ or content/grok-bot-templates/`).toBe(true);
  }
});
