import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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
import { PENDING, pendingKeysIn, resolvePending } from './pending';
import { renderV3Body, renderV3Head } from './render';
import { HOME_HTML, v3Mode } from './vite-plugin';

// Homepage v3, as the build renders it, held to the brief (docs/design/home-v3/brief.md) and to the
// exact copy (copy.md): read here from the handoff itself, so the page can't drift from it unseen.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const COPY = read('../../../../../docs/design/home-v3/copy.md');

const parse = (html: string) =>
  new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
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
    const shell = read('../../../home.html');
    expect(shell).toContain('<link rel="stylesheet" href="/src/home/v3/v3.css" />');
    expect(shell.match(/<script\b[^>]*>/g)).toEqual(['<script type="module" src="/src/home/v3/client/main.ts">']);
    expect(shell).toMatch(/<body class="aiw" data-theme="dark" data-app-ready="true">/);
    // With no placeholder left, a preview carries no <style> of its own either (it labelled them).
    for (const preview of [false, true]) expect(renderV3Body({ preview })).not.toMatch(/<script|<style/i);
  });

  it('wears the kit’s header and Programs menu exactly as #94 left them, and the kit’s footer', () => {
    const header = prod.querySelector('header.hdr');
    expect(header?.outerHTML).toBe(parse(kitHeader('/')).querySelector('header.hdr')?.outerHTML);
    expect(prod.querySelectorAll('header')).toHaveLength(1);
    expect(prod.querySelector('[data-brand-slot]')?.getAttribute('data-brand-slot')).toBe('logo-1');
    // The same header /pricing renders, but for where you are.
    const unmarked = (h: Element | null) =>
      (h?.outerHTML ?? '')
        .replace(/ aria-current="page"/g, '')
        .replace(/ data-current(="")?/g, '')
        .replace(/ is-current/g, '');
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
      expect(
        [...card!.querySelectorAll('.bdg-fact')].map(
          (f) => `${text(f.querySelector('dt'))}: ${text(f.querySelector('dd'))}`,
        ),
      ).toEqual(rest);
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
    expect([...hero!.querySelectorAll('.hh-num')].map(text)).toEqual([
      `${agents!.value}`,
      `${homes!.value}+`,
      `${ENTRIES.length}`,
    ]);
    expect(ENTRIES.length).toBe(58);
    for (const n of hero!.querySelectorAll<HTMLElement>('[data-v3-count]')) {
      expect(text(n)).toBe(Number(n.dataset.v3Count).toLocaleString('en-US'));
      expect(text(n)).not.toBe('0');
    }
  });

  it('links the buttons where the mockup does', () => {
    expect(
      [...hero!.querySelectorAll('.hh-cta a.btn')].map((a) => [text(a), a.getAttribute('href'), a.className]),
    ).toEqual([
      ['Get 5 Free Skills', '#free', 'btn btn-primary btn-lg'],
      ['See the Programs', '#programs', 'btn btn-link'],
    ]);
  });
});

describe('the site’s rules (brief § 6)', () => {
  /** Every free or buy button on the page: a Payment Link, or one that leads to the five free skills. */
  const ctas = (doc: Document) =>
    [...doc.querySelectorAll<HTMLAnchorElement>('main a')].filter(
      (a) =>
        /buy\.stripe\.com/.test(a.href) ||
        a.getAttribute('href') === '#free' ||
        a.getAttribute('href') === FREE_SKILLS_HREF,
    );

  it('puts the proof line in the same group as every free or buy button', () => {
    for (const doc of [prod, preview]) {
      const all = ctas(doc);
      expect(all.length).toBeGreaterThan(0);
      for (const a of all) {
        const group = a.closest('.hh-cta, .band-cta, .cta-group, .plan-actions');
        expect(group, text(a)).not.toBeNull();
        expect(text(group?.querySelector('.proof-line')), text(a)).toBe(
          'Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year',
        );
      }
    }
  });

  it('never puts a buy or free button, a seat counter or a proof line inside a reveal or a fade', () => {
    const held = '.rv, .fade-1, .fade-2, .fade-3';
    for (const doc of [prod, preview]) {
      const never = [
        ...doc.querySelectorAll('main .proof-line, main .seatm, main [data-left], main .hh-stats'),
        ...ctas(doc),
      ];
      expect(never.length).toBeGreaterThan(2);
      for (const el of never) expect(el.closest(held), el.outerHTML.slice(0, 80)).toBeNull();
    }
  });
});

describe('pending placeholders (conflicts.md, Decisions): none left', () => {
  it('leaves none in the production render: no marker, no placeholder words, not even in a stylesheet', () => {
    const html = renderV3Body({ preview: false });
    expect(html).not.toMatch(/data-pending|<!--pending:|v3-pending/);
    for (const css of [read('./v3.css'), read('../../kit/kit.css')]) expect(css).not.toMatch(/data-pending/);
    expect(pendingKeysIn(html)).toEqual([]);
    expect(html).not.toMatch(/Placeholder|Photo to come/);
  });

  it('has no key left (Connor cleared the last three, 4:41 PM MT Nov 12), so a preview is the production page, byte for byte', () => {
    expect(Object.keys(PENDING)).toEqual([]);
    expect(renderV3Body({ preview: true })).toBe(renderV3Body({ preview: false }));
  });

  it('refuses a region using any key, the answered ones included, or a region left open', () => {
    for (const key of ['stat-source', 'spring-approval', 'video-still', 'team-plan-dec14', 'nope']) {
      const old = `<!--pending:${key}--><span>x</span><!--pending:${key}:else--><!--pending:${key}:end-->`;
      for (const preview of [true, false])
        expect(() => resolvePending(old, { preview }), key).toThrow(`Unknown pending key "${key}"`);
    }
    expect(() => resolvePending('<!--pending:spring-approval--><p>', { preview: false })).toThrow(/unresolved/);
  });

  it('is www’s homepage: an ordinary build renders it at home.html, the production render unless V3_PREVIEW=1', () => {
    expect([v3Mode({}), v3Mode({ V3_PREVIEW: '' }), v3Mode({ V3_PREVIEW: '0' }), v3Mode({ V3_PREVIEW: '1' })]).toEqual([
      'production',
      'production',
      'production',
      'preview',
    ]);
    // `apps/api/src/server.ts` reads `dist/home.html` and serves it at `/` on www.
    expect(HOME_HTML).toBe('home.html');
    const config = read('../../../vite.ai101.config.ts');
    expect(config).toContain('homeV3Render(),');
    expect(config).not.toMatch(/homeRender\(\)|V3_PREVIEW|home-v3\.html/);
    expect(existsSync(resolve(HERE, '../../../home-v3.html'))).toBe(false);
    // v2 stays in the tree, unbuilt, until the live check passes (brief § 2): its shell is home-v2.html.
    expect(read('../../../home-v2.html')).toContain('<link rel="stylesheet" href="/src/home/page.css" />');
    expect(read('../../../package.json')).not.toContain('V3_PREVIEW');
  });
});

describe('S2, the morning task sync recording', () => {
  const vid = prod.querySelector('section.vid');

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

  it('renders the video with its poster, a scriptless player, and no autoplay', () => {
    const video = vid?.querySelector('figure.vid-frame video');
    const source = video?.querySelector('source');
    expect(source?.getAttribute('src')).toBe('/media/morning-task-sync.mp4?v=2');
    expect(source?.getAttribute('type')).toBe('video/mp4');
    expect(video?.getAttribute('poster')).toBe('/media/morning-task-sync.webp?v=2');
    // Native controls stay in the markup so the film still plays with no script. The script takes them off.
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.getAttribute('preload')).toBe('none');
    expect(video?.hasAttribute('autoplay')).toBe(false);
    expect(video?.querySelector('track')).toBeNull();
    expect([video?.getAttribute('width'), video?.getAttribute('height')]).toEqual(['1920', '1080']);
    expect(video?.getAttribute('aria-label')).toBe(text(vid?.querySelector('.vid-caption')));
    expect(vid?.querySelector('img, picture, iframe')).toBeNull();
    expect(vid?.querySelector('.vid-chrome')?.hasAttribute('hidden')).toBe(true);
    expect(vid?.querySelector('.vid-play')?.getAttribute('aria-label')).toBe('Play');
    expect(vid?.querySelector('.vid-sound')?.getAttribute('aria-label')).toBe('Tap for sound');
    expect(vid?.querySelector('.vid-sound-label')?.textContent).toBe('Tap for sound');
    expect(vid?.querySelector('.vid-full')?.getAttribute('aria-label')).toBe('Full screen');
    expect(vid?.querySelector('.vid-seek')?.getAttribute('role')).toBe('slider');
    expect(text(vid)).not.toMatch(/100 agents|700\+ homes/);
    const css = read('./v3.css');
    expect(css).toMatch(/\.aiw \.vid-frame video \{[^}]*object-fit: contain;/);
    expect(css).toMatch(/width:\s*min\(92vw,\s*1440px\)/);
    expect(css).toMatch(/scale\(calc\(0\.94 \+ 0\.06 \* var\(--s\)\)\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.aiw \.vid-frame \{\s*transform: none;/);

    const mp4 = readFileSync(resolve(HERE, '../../../public/media/morning-task-sync.mp4'));
    // H.264 ('avc1'), never HEVC, which Firefox and many Android phones cannot play.
    expect(mp4.includes(Buffer.from('avc1'))).toBe(true);
    expect(mp4.includes(Buffer.from('hvc1')) || mp4.includes(Buffer.from('hev1'))).toBe(false);
    // `moov` before `mdat` ("faststart"): it plays before it has all downloaded.
    const boxes = mp4Boxes(mp4);
    expect(boxes.indexOf('moov')).toBeGreaterThanOrEqual(0);
    expect(boxes.indexOf('moov')).toBeLessThan(boxes.indexOf('mdat'));
    // The same size class as the Reel Editor clips already in this folder.
    expect(mp4.length).toBeLessThan(15_000_000);

    const poster = readFileSync(resolve(HERE, '../../../public/media/morning-task-sync.webp'));
    expect(poster.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(poster.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(poster.length).toBeGreaterThan(10_000);
    expect(poster.length).toBeLessThan(150_000);
  });

  it('keeps copy.md’s heading and caption, and drops the “Coming soon” note', () => {
    const lines = copyLines('S2 Video');
    expect(text(vid?.querySelector('h2'))).toBe(lines[0]);
    expect(text(vid?.querySelector('.vid-caption'))).toBe(lines.at(-1));
    expect(text(vid)).not.toMatch(/Coming soon|Placeholder|goes here|Spring on camera|6:04/i);
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
