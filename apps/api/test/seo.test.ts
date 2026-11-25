// robots.txt, sitemap.xml, and the marketing host's real 404.
import { afterEach, describe, expect, it } from 'vitest';
import { ENTRIES } from '../../web/src/library/content';
import { build } from '../src/app';
import type { App } from '../src/app';
import { GUIDE_SLUGS } from '../src/routes/guide-list';
import { SALES_PAGES } from '../src/routes/offer';
import { appRobots, marketingPaths, marketingRobots, sitemapXml } from '../src/routes/seo';

const WWW = 'www.amplifiedimpact.io';
const LEARN = 'learn.amplifiedimpact.io';
const ORIGIN = `https://${WWW}`;

let app: App | null = null;
let saved: string | undefined;

afterEach(async () => {
  await app?.close();
  app = null;
  if (saved === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = saved;
});

async function serve(host: string | undefined): Promise<App> {
  saved = process.env.MARKETING_HOST;
  if (host === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = host;
  app = await build({
    fixtureOnly: true,
    logger: false,
    marketingPage: '<!doctype html><title>Home</title>',
  });
  await app.ready();
  return app;
}

const get = (a: App, url: string, host: string) => a.inject({ method: 'GET', url, headers: { host } });

describe('marketing paths', () => {
  it('lists the public pages and every guide, and nothing that is not a page', () => {
    const paths = marketingPaths();
    for (const path of ['/', '/about', '/pricing', '/library', '/free', '/teams', '/agents', '/insiders', '/team-build', '/privacy', '/terms', '/agreement', '/ai101']) {
      expect(paths, path).toContain(path);
    }
    for (const path of Object.keys(SALES_PAGES)) expect(paths, path).toContain(path);
    for (const slug of GUIDE_SLUGS) expect(paths, slug).toContain(`/${slug}`);
    for (const slug of ['morning-brief', 'speed-to-lead-reply', 'commission-tie-out']) expect(paths).toContain(`/${slug}`);
    for (const entry of ENTRIES) if (entry.href) expect(paths, entry.href).toContain(entry.href);
    expect(paths).not.toContain('/offer');
    expect(paths).not.toContain('/sign-in');
    expect(paths.some((path) => path.startsWith('/api/'))).toBe(false);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('writes canonical https URLs and a lastmod only where the library has a date', () => {
    const xml = sitemapXml(ORIGIN);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/morning-brief</loc>`);
    expect(xml).not.toContain('learn.amplifiedimpact.io');
    expect(xml).not.toContain('<loc>http://');
    const added = new Map(ENTRIES.flatMap((entry) => (entry.href ? [[entry.href, entry.added] as const] : [])));
    expect(xml).toContain(`<loc>${ORIGIN}/morning-brief</loc>\n    <lastmod>${added.get('/morning-brief')}</lastmod>`);
    expect(added.get('/morning-brief')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(marketingPaths().map((path) => (path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`)));
  });
});

describe('GET /robots.txt and GET /sitemap.xml', () => {
  it('allows crawling on www and names the sitemap', async () => {
    const a = await serve(WWW);
    const res = await get(a, '/robots.txt', WWW);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.body).toBe(marketingRobots(ORIGIN));
    expect(res.body).toContain('Allow: /');
    expect(res.body).toContain('Disallow: /api/');
    expect(res.body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(res.body).not.toContain('<html');
  });

  it('disallows crawling on learn, and does not publish a sitemap there', async () => {
    const a = await serve(WWW);
    const robots = await get(a, '/robots.txt', LEARN);
    expect(robots.statusCode).toBe(200);
    expect(robots.headers['content-type']).toMatch(/text\/plain/);
    expect(robots.body).toBe(appRobots());
    expect(robots.body).toContain('Disallow: /');
    expect(robots.body).not.toContain('<html');
    expect(robots.body).not.toContain('Sitemap:');

    const sitemap = await get(a, '/sitemap.xml', LEARN);
    expect(sitemap.body).not.toContain('<urlset');
    expect(sitemap.headers['content-type'] ?? '').not.toMatch(/xml/);
  });

  it('serves the sitemap on www, with the skill pages', async () => {
    const a = await serve(WWW);
    const res = await get(a, '/sitemap.xml', WWW);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.body).toBe(sitemapXml(ORIGIN));
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('still gives learn a robots file when the marketing host is unset, and no sitemap', async () => {
    const a = await serve(undefined);
    const robots = await get(a, '/robots.txt', LEARN);
    expect(robots.statusCode).toBe(200);
    expect(robots.body).toBe(appRobots());
    const sitemap = await get(a, '/sitemap.xml', WWW);
    expect(sitemap.body).not.toContain('<urlset');
  });

  it('answers an unknown marketing URL with 404 and a way onward', async () => {
    const a = await serve(WWW);
    const res = await get(a, '/not-a-page', WWW);
    expect(res.statusCode).toBe(404);
    expect(res.headers.location).toBeUndefined();
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-robots-tag']).toBe('noindex');
    expect(res.body).toContain('<h1>Page not found</h1>');
    expect(res.body).toContain('href="/"');
    expect(res.body).toContain('href="/library"');
    expect(res.body).toContain('href="/pricing"');
    expect(res.body).toContain('The Library');
    const learn = await get(a, '/not-a-page', LEARN);
    expect(learn.body).not.toContain('Page not found');
  });
});
