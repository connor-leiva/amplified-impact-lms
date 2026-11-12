import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT } from '../../kit/content';
import { kitFooter, kitHeader } from '../../kit/render';
import { ENTRIES } from '../../library/content';
import { renderPricingBody } from '../../pricing/render';
import { FREE_SKILLS_HREF } from '../../site/content';
import { renderHomeHead } from '../render';
import { splitProof } from '../sections/proof';
import { HERO } from './content';
import { PENDING, pending, pendingKeysIn, resolvePending } from './pending';
import { renderV3Body, renderV3Head } from './render';
import { v3Mode } from './vite-plugin';

// Homepage v3, as the build renders it, held to the brief (docs/design/home-v3/brief.md) and to the
// exact copy (copy.md): read here from the handoff itself, so the page can't drift from it unseen.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const COPY = read('../../../../../docs/design/home-v3/copy.md');

const parse = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
const prod = parse(renderV3Body({ preview: false }));
const preview = parse(renderV3Body({ preview: true }));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** A section's lines from copy.md: its first fenced block, one line per text node, in reading order. */
function copyLines(heading: string): string[] {
  const at = COPY.indexOf(`## ${heading}`);
  expect(at, heading).toBeGreaterThan(-1);
  const block = /```\n([\s\S]*?)\n```/.exec(COPY.slice(at))!;
  return block[1]!.split('\n').filter(Boolean);
}

/**
 * Every line, in order, somewhere in `el`'s text. Whitespace is ignored (a headline's words are spans)
 * and so is case for copy.md's ALL-CAPS lines, which the stylesheet capitalises (copy.md says so).
 */
function expectInOrder(el: Element | null, lines: string[]) {
  const squash = (s: string) => s.replace(/\s+/g, '');
  const page = squash(el?.textContent ?? '').toLowerCase();
  let at = 0;
  for (const line of lines) {
    const i = page.indexOf(squash(line).toLowerCase(), at);
    expect(i, `"${line}" is missing, or out of order`).toBeGreaterThan(-1);
    at = i + squash(line).length;
  }
}

describe('the page', () => {
  it('has the live homepage’s head, and the shell loads one stylesheet and one script, as a kit page, dark', () => {
    expect(renderV3Head()).toBe(renderHomeHead());
    const shell = read('../../../home-v3.html');
    expect(shell).toContain('<link rel="stylesheet" href="/src/home/v3/v3.css" />');
    expect(shell.match(/<script\b[^>]*>/g)).toEqual(['<script type="module" src="/src/home/v3/client/main.ts">']);
    expect(shell).toMatch(/<body class="aiw" data-theme="dark" data-app-ready="true">/);
    expect(renderV3Body({ preview: false })).not.toMatch(/<script|<style/i);
    // A preview carries one <style> of its own: the label on each placeholder.
    expect(renderV3Body({ preview: true })).not.toMatch(/<script/i);
    expect(renderV3Body({ preview: true }).match(/<style/g)).toHaveLength(1);
  });

  it('wears the kit’s header and Programs menu exactly as #94 left them, and the kit’s footer', () => {
    const header = prod.querySelector('header.hdr');
    expect(header?.outerHTML).toBe(parse(kitHeader('/')).querySelector('header.hdr')?.outerHTML);
    expect(prod.querySelectorAll('header')).toHaveLength(1);
    expect(prod.querySelector('[data-brand-slot]')?.getAttribute('data-brand-slot')).toBe('logo-1');
    // The same header /pricing renders, but for where you are.
    const unmarked = (h: Element | null) =>
      (h?.outerHTML ?? '').replace(/ aria-current="page"/g, '').replace(/ data-current(="")?/g, '').replace(/ is-current/g, '');
    expect(unmarked(header)).toBe(unmarked(parse(renderPricingBody()).querySelector('header.hdr')));
    expect(prod.querySelector('footer')?.outerHTML).toBe(parse(kitFooter()).querySelector('footer')?.outerHTML);
    // The theme switch is in the header's markup, hidden until the script shows it, as on every kit page (D8).
    expect(prod.querySelector<HTMLButtonElement>('.theme-btn')?.hidden).toBe(true);
  });

  it('draws each repeated drawing once, and every use of one points at it', () => {
    expect(prod.querySelectorAll('svg.v3-sprite')).toHaveLength(1);
    const ids = new Set([...prod.querySelectorAll('svg.v3-sprite symbol')].map((s) => s.id));
    const uses = [...prod.querySelectorAll('use')].map((u) => u.getAttribute('href'));
    expect(uses.length).toBeGreaterThan(10);
    for (const href of uses) expect(ids.has(href!.slice(1)), href!).toBe(true);
  });
});

describe('S1, the hero', () => {
  const hero = prod.querySelector('section.hh');

  it('says copy.md’s words, in order, with the Owners badge showing', () => {
    expectInOrder(hero, copyLines('S1 Hero'));
    expect(text(hero?.querySelector('h1'))).toBe('Your next employee doesn’t need a desk.');
  });

  it('has the Agents and Ops badges, word for word as copy.md lists them, waiting behind their tabs', () => {
    for (const key of ['Agents', 'Ops'] as const) {
      const note = new RegExp(`^- ${key}: (.+)$`, 'm').exec(COPY)![1]!.split(' · ');
      const [name, role, ...rest] = note;
      const last = rest.pop()!;
      const card = hero?.querySelector(`[data-badge="${key.toLowerCase()}"]`);
      expect(card?.hasAttribute('hidden')).toBe(true);
      expect(text(card?.querySelector('.bdg-name'))).toBe(name);
      expect(text(card?.querySelector('.bdg-role'))).toBe(role);
      expect([...card!.querySelectorAll('.bdg-fact')].map((f) => `${text(f.querySelector('dt'))}: ${text(f.querySelector('dd'))}`)).toEqual(rest);
      const [readyAt, items] = [last.slice(0, last.indexOf(': ')), last.slice(last.indexOf(': ') + 2)];
      expect(text(card?.querySelector('.bdg-feed-h'))).toBe(readyAt);
      expect([...card!.querySelectorAll('.bdg-feed li')].map(text)).toEqual(items.split(' / '));
    }
    expect([...hero!.querySelectorAll('.bdg-tab')].map((t) => [text(t), t.getAttribute('aria-pressed')])).toEqual([
      ['Owners', 'true'],
      ['Agents', 'false'],
      ['Ops', 'false'],
    ]);
    expect(hero?.querySelector('.bdg-tabs')?.getAttribute('aria-label')).toBe(HERO.tabsLabel);
  });

  it('tags every badge “Made-up example”: they are illustrations', () => {
    const badges = [...hero!.querySelectorAll('.bdg')];
    expect(badges).toHaveLength(3);
    for (const b of badges) {
      expect(text(b.querySelector('.ex-tag'))).toBe(KIT.example);
      expect(b.getAttribute('aria-label')).toMatch(/A made-up example\.$/);
    }
  });

  it('prints its figures final, from their sources: 100 and 700+ from the proof line, 58 from the Library', () => {
    const [agents, homes] = splitProof().stats;
    expect([...hero!.querySelectorAll('.hh-num')].map(text)).toEqual([`${agents!.value}`, `${homes!.value}+`, `${ENTRIES.length}`]);
    expect(ENTRIES.length).toBe(58);
    for (const n of hero!.querySelectorAll<HTMLElement>('[data-v3-count]')) {
      expect(text(n)).toBe(Number(n.dataset.v3Count).toLocaleString('en-US'));
      expect(text(n)).not.toBe('0');
    }
  });

  it('links the buttons where the mockup does', () => {
    expect([...hero!.querySelectorAll('.hh-cta a.btn')].map((a) => [text(a), a.getAttribute('href'), a.className])).toEqual([
      ['Get 5 Free Skills', '#free', 'btn btn-primary btn-lg'],
      ['See the Programs', '#programs', 'btn btn-link'],
    ]);
  });
});

describe('the site’s rules (brief § 6)', () => {
  /** Every free or buy button on the page: a Payment Link, or one that leads to the five free skills. */
  const ctas = (doc: Document) =>
    [...doc.querySelectorAll<HTMLAnchorElement>('main a')].filter(
      (a) => /buy\.stripe\.com/.test(a.href) || a.getAttribute('href') === '#free' || a.getAttribute('href') === FREE_SKILLS_HREF,
    );

  it('puts the proof line in the same group as every free or buy button', () => {
    for (const doc of [prod, preview]) {
      const all = ctas(doc);
      expect(all.length).toBeGreaterThan(0);
      for (const a of all) {
        const group = a.closest('.hh-cta, .cta-group, .plan-actions');
        expect(group, text(a)).not.toBeNull();
        expect(text(group?.querySelector('.proof-line')), text(a)).toBe('Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year');
      }
    }
  });

  it('never puts a buy or free button, a seat counter or a proof line inside a reveal or a fade', () => {
    const held = '.rv, .fade-1, .fade-2, .fade-3';
    for (const doc of [prod, preview]) {
      const never = [...doc.querySelectorAll('main .proof-line, main .seatm, main [data-left], main .hh-stats'), ...ctas(doc)];
      expect(never.length).toBeGreaterThan(2);
      for (const el of never) expect(el.closest(held), el.outerHTML.slice(0, 80)).toBeNull();
    }
  });
});

describe('pending placeholders (conflicts.md, Decisions)', () => {
  it('leaves none in the production render: no marker, no placeholder words, not even in a stylesheet', () => {
    const html = renderV3Body({ preview: false });
    expect(html).not.toMatch(/data-pending|<!--pending:|v3-pending/);
    for (const css of [read('./v3.css'), read('../../kit/kit.css')]) expect(css).not.toMatch(/data-pending/);
    expect(pendingKeysIn(html)).toEqual([]);
    expect(html).not.toMatch(/Placeholder|Photo to come/);
    // S2 waits for its photo (D5): until Connor chooses it, the whole section is left out.
    expect(prod.querySelector('section.vid')).toBeNull();
  });

  it('shows each one, marked, in a preview: S2’s photo slot, empty, with copy.md’s heading and caption', () => {
    const html = renderV3Body({ preview: true });
    expect(pendingKeysIn(html)).toEqual(['video-still']);
    const vid = preview.querySelector('section.vid');
    expect(vid?.getAttribute('data-pending')).toBe('video-still');
    // The slot itself is marked too, and holds no image at all until the real one is chosen: never a
    // stock or AI picture, and none of the mockup's video (D5).
    const slot = vid?.querySelector('figure.vid-still');
    expect(slot?.getAttribute('data-pending')).toBe('video-still');
    expect(vid?.querySelectorAll('img, video, picture, svg')).toHaveLength(0);
    const lines = copyLines('S2 Video');
    expectInOrder(vid, [lines[0]!, lines.at(-1)!]);
    expect(text(vid)).not.toMatch(/90 seconds|Screen recording|Spring on camera|6:04/i);
  });

  it('knows exactly Connor’s open questions, and refuses any other key or a region left open', () => {
    expect(Object.keys(PENDING).sort()).toEqual(['spring-approval', 'team-plan-dec14', 'video-still']);
    expect(resolvePending(pending('spring-approval', '<p>Q</p>', '<p>F</p>'), { preview: false })).toBe('<p>F</p>');
    expect(resolvePending(pending('team-plan-dec14', 'December 14'), { preview: true })).toMatch(
      /^<style>[\s\S]*<\/style>\n<span data-pending="team-plan-dec14">December 14<\/span>$/,
    );
    expect(() => resolvePending('<!--pending:nope--><p></p><!--pending:nope:else--><!--pending:nope:end-->', { preview: true })).toThrow(
      /Unknown pending key/,
    );
    expect(() => resolvePending('<!--pending:team-plan-dec14--><p>', { preview: false })).toThrow(/unresolved/);
  });

  it('holds back the 38% and 95% no longer: `stat-source` is answered (D3), so a region still using it is refused', () => {
    const old = '<!--pending:stat-source--><span>38%</span><!--pending:stat-source:else--><!--pending:stat-source:end-->';
    for (const preview of [true, false]) expect(() => resolvePending(old, { preview })).toThrow(/Unknown pending key "stat-source"/);
  });

  it('builds v3 only on purpose: an ordinary build has no v3 page; V3_PREVIEW=1 a preview, =0 the production render', () => {
    expect(v3Mode({})).toBe('off');
    expect(v3Mode({ V3_PREVIEW: '' })).toBe('off');
    expect(v3Mode({ V3_PREVIEW: '1' })).toBe('preview');
    expect(v3Mode({ V3_PREVIEW: '0' })).toBe('production');
    // The live homepage is still v2's until the switch-over PR.
    expect(read('../../../home.html')).toContain('<link rel="stylesheet" href="/src/home/page.css" />');
  });
});

describe('the stylesheet', () => {
  const css = read('./v3.css');

  it('is the kit’s, then v3’s, with no font from anywhere else', () => {
    expect(css.match(/@import '([^']+)'/g)).toEqual(["@import '../../kit/kit.css'"]);
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|url\(['"]?https?:/);
  });

  it('keeps every word at 16px or more (D-107), the mockup’s smaller labels included', () => {
    const sizes = [...css.matchAll(/font-size: (\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
  });

  it('gives the forest band the kit’s own colours, and gives a tab a thumb’s height', () => {
    const forest = /\.aiw \[data-theme='forest'\] \{([^}]+)\}/.exec(css)![1]!;
    expect(forest).toContain('--surface: var(--aiw-forest);');
    expect(forest).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
    expect(/\.aiw \.bdg-tab \{[^}]*min-height: 44px;/.test(css)).toBe(true);
  });
});
