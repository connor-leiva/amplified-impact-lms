import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAboutHead } from '../about/render';
import { renderAgentsHead } from '../agents/render';
import { renderAi101Head } from '../ai101/render';
import { renderFreeHead } from '../free/render';
import { GUIDES } from '../guides/content';
import { renderGuideHead } from '../guides/render';
import { renderHomeHead } from '../home/render';
import { renderInsidersHead } from '../insiders/render';
import { renderLibraryHead } from '../library/render';
import { renderPricingHead } from '../pricing/render';
import { renderRetoolHead } from '../retool/render';
import { renderTeamBuildHead } from '../team-build/render';
import { renderTeamsHead } from '../teams/render';
import { renderVoiceHead } from '../voice/render';
import { OG_IMAGE, OG_SAFE, renderOgImage } from './og-image';
import { SHARE_IMAGE, shareImageTags } from './share';

// The share image (`./share.ts`): every www page's link preview is the branded 1200 by 630 card, and
// never a person's headshot. The headshots stay where they belong, in the pages themselves.

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = 'https://www.amplifiedimpact.io/img/og/amplified-impact.png';

const headOf = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><head>${html}</head><body></body></html>`, 'text/html');
const content = (doc: Document, selector: string) => doc.head.querySelector(selector)?.getAttribute('content');

/** Every www page's head, by its path: the ones the brief names first, then every other. */
const HEADS: ReadonlyArray<[string, string]> = [
  ['/', renderHomeHead()],
  ['/pricing', renderPricingHead()],
  ['/library', renderLibraryHead()],
  ['/tc-file-audit', renderGuideHead(GUIDES['tc-file-audit']!)],
  ['/about', renderAboutHead()],
  ['/insiders', renderInsidersHead()],
  ['/teams', renderTeamsHead()],
  ['/agents', renderAgentsHead()],
  ['/team-build', renderTeamBuildHead()],
  ['/free', renderFreeHead()],
  ['/voice-profile', renderVoiceHead()],
  ['/retool', renderRetoolHead()],
  ['/ai101', renderAi101Head()],
  ...Object.values(GUIDES).map((g): [string, string] => [`/${g.slug}`, renderGuideHead(g)]),
];

describe('every www page’s share tags', () => {
  it.each(HEADS)('%s points og:image and twitter:image at the 1200 by 630 branded image', (_path, html) => {
    const doc = headOf(html);
    expect(content(doc, 'meta[property="og:image"]')).toBe(URL_);
    expect(content(doc, 'meta[property="og:image:width"]')).toBe('1200');
    expect(content(doc, 'meta[property="og:image:height"]')).toBe('630');
    expect(content(doc, 'meta[property="og:image:alt"]')).toBe('Amplified Impact');
    expect(content(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(content(doc, 'meta[name="twitter:image"]')).toBe(URL_);
    // One of each, so no stale second image can win in a crawler that takes the last.
    expect(doc.head.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:card"]')).toHaveLength(3);
  });

  it.each(HEADS)('%s never shares a headshot', (_path, html) => {
    expect(html).not.toContain('/img/team/');
  });

  it('covers the four pages the brief names, and every skill and guide page', () => {
    const paths = HEADS.map(([p]) => p);
    for (const p of ['/', '/pricing', '/library', '/tc-file-audit']) expect(paths).toContain(p);
    expect(paths.filter((p) => GUIDES[p.slice(1)] !== undefined).length).toBeGreaterThanOrEqual(Object.keys(GUIDES).length);
  });

  it('uses absolute https://www.amplifiedimpact.io addresses, and lets a page bring its own image', () => {
    expect(new URL(SHARE_IMAGE.src, 'https://www.amplifiedimpact.io').toString()).toBe(URL_);
    const own = shareImageTags({ src: '/img/og/x.png', width: 1200, height: 630, alt: 'X "and" Y' }).join('\n');
    expect(own).toContain('content="https://www.amplifiedimpact.io/img/og/x.png"');
    expect(own).toContain('content="X &quot;and&quot; Y"');
  });
});

describe('the image', () => {
  /** A PNG's width and height, from its IHDR chunk. */
  const pngSize = (bytes: Buffer) => {
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };

  it('is committed where the tags point, a PNG of exactly 1200 by 630', () => {
    const png = readFileSync(resolve(HERE, '../../public', SHARE_IMAGE.src.slice(1)));
    expect(pngSize(png)).toEqual([SHARE_IMAGE.width, SHARE_IMAGE.height]);
    expect([SHARE_IMAGE.width, SHARE_IMAGE.height]).toEqual([1200, 630]);
  });

  it('is drawn from the kit: Logo 1 and the tagline, no photo, no number, no colour of its own', () => {
    const doc = new DOMParser().parseFromString(renderOgImage(), 'text/html');
    expect(doc.querySelector('main svg.wm')?.getAttribute('aria-label')).toBe('Amplified Impact');
    expect(doc.querySelector('.og-tagline')?.textContent).toBe('AI Coaching and Training for Business Owners and Their Teams');
    expect(doc.querySelector('.og-site')?.textContent).toBe(OG_IMAGE.site);
    expect(doc.querySelector('img, picture, video')).toBeNull();
    expect(doc.body.textContent ?? '').not.toMatch(/\d/);
    // The kit's stylesheet, and only its tokens for colour.
    expect(doc.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('/src/kit/kit.css');
    const css = doc.querySelector('style')?.textContent ?? '';
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/i);
    for (const [, value] of css.matchAll(/(?:^|[\s;{])(?:color|background(?:-color|-image)?)\s*:\s*([^;]+)/g)) expect(value!.trim()).toMatch(/^var\(--[a-z-]+\)$/);
    expect(OG_SAFE).toEqual({ width: 1000, height: 500 });
  });
});
