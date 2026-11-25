// D-155: Google Analytics 4 and the Meta Pixel on the www marketing pages, and nowhere else.
//
// The pages get one first-party tag (`/analytics.js`) as `server.ts` reads them; a page that carries
// it gets exactly the CSP sources the two tags need, and every other response keeps the strict
// policy. The Buy buttons are labelled with their cart for `begin_checkout`, and /offer/welcome
// carries the confirmed order for `purchase`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build, cspDirectives } from '../src/app';
import type { App } from '../src/app';
import { CART_IDS } from '../src/billing/catalog';
import { readOfferConfig } from '../src/billing/config';
import type { OfferConfig } from '../src/billing/config';
import { createPriceCache } from '../src/billing/prices';
import { orders, plans } from '../src/db/schema';
import { ANALYTICS_CSP, ANALYTICS_TAG, GA4_MEASUREMENT_ID, META_PIXEL_ID, cartItemName, withAnalytics, withAnalyticsCsp } from '../src/lib/analytics';
import { resetDatabase, testDatabase } from './helpers';
import { renderOfferBody, renderOfferHead } from '../../web/src/offer/render';
import { renderPricingBody, renderPricingHead } from '../../web/src/pricing/render';
import { renderTeamBuildBody, renderTeamBuildHead } from '../../web/src/team-build/render';

const OFFER = [
  '<!doctype html><html lang="en"><head>\n    <title>Plans</title>\n  </head><body data-offer="%%offer-state%%">',
  '<li><a class="btn" href="%%link:cohort-full%%">Reserve</a><a href="%%link:cohort-two-pay%%">Two</a><a href="%%link:not-a-cart%%">?</a></li>',
  '</body></html>',
].join('');
const WELCOME =
  '<!doctype html><html><head><title>Welcome</title></head><body data-state="%%welcome-state%%" data-product="%%product%%" data-purchase-id="%%purchase-id%%" data-purchase-value="%%purchase-value%%" data-purchase-currency="%%purchase-currency%%" data-purchase-item="%%purchase-item%%" data-purchase-name="%%purchase-name%%"><h1>%%plan-name%%</h1></body></html>';
const LEGAL = '<!doctype html><html><head><title>Terms</title></head><body>Terms</body></html>';
const HOME = '<!doctype html><html><head><title>Home</title></head><body>Home</body></html>';

// Read like a deploy's (whatever fields the config grows), with the offer open and two links set.
const CONFIG: OfferConfig = readOfferConfig({
  OFFER_OPEN: 'true',
  INVITES_FROM: '2026-11-13T00:00:00-07:00',
  PAYMENT_LINK_COHORT_FULL: 'https://buy.stripe.com/test_full',
  PAYMENT_LINK_COHORT_TWO_PAY: 'https://buy.stripe.com/test_two',
});

let app: App;
const CSP = 'content-security-policy';
const directive = (header: string, name: string) => header.split(';').find((d) => d.trim().startsWith(`${name} `))?.trim() ?? '';

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = '2026-11-14T15:00:00-06:00';
  await resetDatabase();
});
afterEach(async () => {
  await app?.close();
  delete process.env.MARKETING_HOST;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

async function boot(): Promise<App> {
  app = await build({
    logger: false,
    legalPages: { terms: LEGAL, privacy: LEGAL, agreement: LEGAL },
    marketingPage: withAnalytics(HOME),
    offer: {
      pages: { offer: withAnalytics(OFFER), welcome: withAnalytics(WELCOME), sales: { '/pricing': withAnalytics(OFFER) } },
      config: CONFIG,
      stripe: null,
      verify: null,
      prices: createPriceCache(() => null),
    },
  });
  return app;
}

describe('the tag on a www page (D-155)', () => {
  it('adds the one first-party tag before </head>, once, and labels each Buy button with its cart and product', () => {
    const page = withAnalytics(OFFER)!;
    expect(page.split(ANALYTICS_TAG)).toHaveLength(2);
    expect(page.indexOf(ANALYTICS_TAG)).toBeLessThan(page.indexOf('</head>'));
    expect(ANALYTICS_TAG).toBe('<script src="/analytics.js" defer></script>');
    expect(page).toContain('<a class="btn" data-ai-cart="cohort-full" data-ai-item="Amplified AI Accelerator, Paid in Full" href="%%link:cohort-full%%">');
    expect(page).toContain('<a data-ai-cart="cohort-two-pay" data-ai-item="Amplified AI Accelerator, Two Payments" href="%%link:cohort-two-pay%%">');
    // Not a cart: left as it was.
    expect(page).toContain('<a href="%%link:not-a-cart%%">');
    // Again: nothing more.
    expect(withAnalytics(page)).toBe(page);
    expect(withAnalytics(null)).toBeNull();
    expect(withAnalytics('<p>no head</p>')).toBe('<p>no head</p>');
  });

  it('names every cart', () => {
    expect(Object.fromEntries(CART_IDS.map((id) => [id, cartItemName(id)]))).toEqual({
      'cohort-full': 'Amplified AI Accelerator, Paid in Full',
      'cohort-two-pay': 'Amplified AI Accelerator, Two Payments',
      'insiders-year': 'Amplified Insiders, One Year',
      'insiders-monthly': 'Amplified Insiders, Monthly',
      'insiders-agent-monthly': 'Amplified Insiders for Agents, Monthly',
      'agents-upto15': 'Amplified Team Plan, Up to 15 Agents',
      'agents-16to40': 'Amplified Team Plan, 16 to 40 Agents',
      'agent-monthly': 'Amplified Agent Plan, Monthly',
      'agent-yearly': 'Amplified Agent Plan, Yearly',
    });
  });

  it('keeps the ids as constants in the one file that loads the tags', () => {
    const js = readFileSync(fileURLToPath(new URL('../../web/public/analytics.js', import.meta.url)), 'utf8');
    expect(GA4_MEASUREMENT_ID).toBe('G-TSQ5YB5BCP');
    expect(META_PIXEL_ID).toBe('1835170747490806');
    expect(js).toContain(`var GA4_ID = '${GA4_MEASUREMENT_ID}';`);
    expect(js).toContain(`var META_PIXEL_ID = '${META_PIXEL_ID}';`);
    expect(js).toContain("var HOSTS = ['www.amplifiedimpact.io'];");
  });

  it('is added by server.ts to the www pages only: never the learn app, never a legal page', () => {
    const server = readFileSync(fileURLToPath(new URL('../src/server.ts', import.meta.url)), 'utf8');
    for (const www of ['readWww(ai101Html)', 'readWww(guideHtml(slug))', "dist/library.html', import.meta.url)", "dist/offer.html', import.meta.url)", "dist/offer-welcome.html', import.meta.url)", 'readWww(fileURLToPath(new URL(`../../web/dist/${name}.html`', 'marketingPage: readWww(homeHtml)']) {
      expect(server, www).toContain(www);
    }
    expect(server).toMatch(/const (libraryPage|offerPage|welcomePage) = readWww\(/);
    expect(server).toContain('readBuilt(indexHtml)');
    expect(server).toContain('legalPages: { terms: readBuilt(termsHtml), privacy: readBuilt(privacyHtml), agreement: readBuilt(agreementHtml) }');
    expect(server).not.toMatch(/readWww\((indexHtml|termsHtml|privacyHtml|agreementHtml)\)/);
  });
});

describe('the CSP (D-155)', () => {
  it('adds exactly what GA4 and the Meta Pixel need, and only when asked', () => {
    const strict = cspDirectives([], {});
    const tagged = cspDirectives([], {}, { analytics: true });
    expect(strict['script-src']).toEqual(["'self'"]);
    expect(strict['connect-src']).toEqual(["'self'"]);
    expect(strict['img-src']).toEqual(["'self'", 'data:']);
    expect(tagged['script-src']).toEqual(["'self'", 'https://www.googletagmanager.com', 'https://connect.facebook.net']);
    expect(tagged['connect-src']).toEqual([
      "'self'",
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://www.googletagmanager.com',
      'https://www.facebook.com',
      'https://connect.facebook.net',
    ]);
    expect(tagged['img-src']).toEqual(["'self'", 'data:', 'https://www.google-analytics.com', 'https://www.googletagmanager.com', 'https://www.facebook.com']);
    // Everything else as strict as before.
    for (const name of Object.keys(strict).filter((n) => !(n in ANALYTICS_CSP))) expect(tagged[name], name).toEqual(strict[name]);
    expect(tagged['script-src']).not.toContain("'unsafe-inline'");
    expect(tagged['script-src']).not.toContain("'unsafe-eval'");
  });

  it('extends a header in place, keeping every other directive', () => {
    const header = "default-src 'self';script-src 'self' 'sha256-abc';img-src 'self' data:;connect-src 'self';object-src 'none'";
    const out = withAnalyticsCsp(header);
    expect(directive(out, 'script-src')).toBe("script-src 'self' 'sha256-abc' https://www.googletagmanager.com https://connect.facebook.net");
    expect(directive(out, 'object-src')).toBe("object-src 'none'");
    expect(directive(out, 'default-src')).toBe("default-src 'self'");
    expect(withAnalyticsCsp(out)).toBe(out);
  });

  it('gives a www page that loads the tag the analytics sources, and every other answer the strict policy', async () => {
    await boot();
    for (const url of ['/offer', '/forum', '/pricing', '/offer/welcome?session_id=cs_test_nope0000000']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(200);
      expect(res.body, url).toContain(ANALYTICS_TAG);
      const csp = String(res.headers[CSP]);
      expect(directive(csp, 'script-src'), url).toBe("script-src 'self' https://www.googletagmanager.com https://connect.facebook.net");
      expect(directive(csp, 'connect-src'), url).toContain('https://*.analytics.google.com');
      expect(directive(csp, 'img-src'), url).toContain('https://www.facebook.com');
      // helmet's defaults survive.
      expect(directive(csp, 'object-src'), url).toBe("object-src 'none'");
      expect(directive(csp, 'frame-ancestors'), url).toBe("frame-ancestors 'self'");
    }
    // No tag, no sources: the legal pages, and every API answer.
    for (const url of ['/terms', '/agreement', '/api/health']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.body, url).not.toContain('/analytics.js');
      const csp = String(res.headers[CSP]);
      expect(csp, url).not.toMatch(/googletagmanager|facebook|google-analytics/);
      expect(directive(csp, 'script-src'), url).toBe("script-src 'self'");
    }
  });

  it('loads the tag on the www homepage, which still has no CSP (answered before helmet, unchanged)', async () => {
    process.env.MARKETING_HOST = 'www.amplifiedimpact.io';
    await boot();
    const res = await app.inject({ method: 'GET', url: '/', headers: { host: 'www.amplifiedimpact.io' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(ANALYTICS_TAG);
    expect(res.headers[CSP]).toBeUndefined();
  });
});

describe('/offer/welcome: the purchase, from the order (D-155)', () => {
  const attrs = (body: string) => Object.fromEntries([...body.matchAll(/data-purchase-([a-z]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const order = (id: string, over: Partial<typeof orders.$inferInsert> = {}) =>
    testDatabase().then((db) =>
      db.insert(orders).values({ id: `ord_${id}`, plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', email: 'pat@example.com', stripeSessionId: id, amountTotal: 750000, currency: 'usd', createdAt: Date.now(), ...over }),
    );

  it('carries the session id, the amount Stripe charged, the currency and the product once the order is confirmed', async () => {
    await boot();
    await order('cs_test_paid000000001');
    const res = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_paid000000001' });
    expect(attrs(res.body)).toEqual({ id: 'cs_test_paid000000001', value: '7500.00', currency: 'USD', item: 'cohort-full', name: 'Amplified AI Accelerator, Paid in Full' });
  });

  it('reports 0 for a trial, and for an order with no amount, rather than a guess', async () => {
    await boot();
    await order('cs_test_trial00000001', { plan: 'agent_plan', option: 'monthly', status: 'trialing', amountTotal: 0 });
    await order('cs_test_noamount00001', { plan: 'membership', option: 'year_upfront', amountTotal: null, currency: null });
    expect(attrs((await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_trial00000001' })).body)).toMatchObject({ value: '0.00', item: 'agent-monthly', name: 'Amplified Agent Plan, Monthly' });
    expect(attrs((await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_noamount00001' })).body)).toMatchObject({ value: '0.00', currency: 'USD', item: 'insiders-year' });
  });

  it('carries nothing while the payment is confirming, or for a session it does not know', async () => {
    await boot();
    await order('cs_test_pending000001', { status: 'pending' });
    const empty = { id: '', value: '', currency: '', item: '', name: '' };
    expect(attrs((await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_pending000001' })).body)).toEqual(empty);
    expect(attrs((await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_unknown000001' })).body)).toEqual(empty);
  });
});

// D-159: the AI Accelerator's two equal buttons, on the real pages (rendered from apps/web as the build
// renders them, then read through `withAnalytics` as `server.ts` reads them), served and filled per
// request in every state the old single button and text link had.
describe('the Accelerator’s two buttons on the real pages, filled per request (D-159)', () => {
  const web = (path: string) => fileURLToPath(new URL(`../../web/${path}`, import.meta.url));
  const shell = (file: string, markers: readonly [string, string], head: string, body: string) =>
    withAnalytics(
      readFileSync(web(file), 'utf8')
        .replace(markers[0], () => head)
        .replace(markers[1], () => body),
    );
  const pages = {
    offer: shell('offer.html', ['<!--offer:head-->', '<!--offer:body-->'], renderOfferHead(), renderOfferBody()),
    '/pricing': shell('pricing.html', ['<!--x:head-->', '<!--x:body-->'], renderPricingHead(), renderPricingBody()),
    '/team-build': shell('team-build.html', ['<!--x:head-->', '<!--x:body-->'], renderTeamBuildHead(), renderTeamBuildBody()),
  };
  // Each page's Accelerator block(s), by the attribute the API writes its state into.
  const BLOCKS: Record<string, { state: RegExp; blocks: number }> = {
    '/offer': { state: /id="plan-cohort" data-state="([^"]*)"/g, blocks: 1 },
    '/forum': { state: /id="plan-cohort" data-state="([^"]*)"/g, blocks: 1 },
    '/pricing': { state: /id="accelerator" data-state="([^"]*)"/g, blocks: 1 },
    '/team-build': { state: /class="[^"]*\bplan buy" data-state="([^"]*)"/g, blocks: 2 },
  };
  const LINKS = { full: 'https://buy.stripe.com/test_full', two: 'https://buy.stripe.com/test_two' };
  /** Every pay-pair button: its analytics labels, its href and its words. */
  const buttons = (html: string) =>
    [...html.matchAll(/<a class="[^"]*\bpay-btn\b[^"]*"([^>]*)>([^<]*)<\/a>/g)].map(([, attrs, label]) => ({
      cart: /data-ai-cart="([^"]*)"/.exec(attrs!)?.[1],
      item: /data-ai-item="([^"]*)"/.exec(attrs!)?.[1],
      href: /href="([^"]*)"/.exec(attrs!)?.[1],
      label,
    }));
  const pair = (full: string, two: string) => [
    { cart: 'cohort-full', item: 'Amplified AI Accelerator, Paid in Full', href: full, label: 'Pay in full · $7,500' },
    { cart: 'cohort-two-pay', item: 'Amplified AI Accelerator, Two Payments', href: two, label: '2 payments · $3,750/mo' },
  ];

  async function serve(config: OfferConfig = CONFIG): Promise<App> {
    app = await build({
      logger: false,
      offer: { pages: { offer: pages.offer, sales: { '/pricing': pages['/pricing'], '/team-build': pages['/team-build'] } }, config, stripe: null, verify: null, prices: createPriceCache(() => null) },
    });
    return app;
  }

  /** Each page in one state: its block(s) say it, and every pair button carries its labels and the href it should. */
  async function expectState(state: string, hrefs: [string, string]) {
    for (const [url, { state: re, blocks }] of Object.entries(BLOCKS)) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(200);
      expect([...res.body.matchAll(re)].map((m) => m[1]), url).toEqual(Array(blocks).fill(state));
      const want = pair(...hrefs);
      expect(buttons(res.body), url).toEqual(Array.from({ length: blocks }, () => want).flat());
      expect(res.body, url).toContain('One payment today');
      expect(res.body, url).toContain('Today and again in one month');
      expect(res.body, url).toContain('plus applicable tax');
      expect(res.body, url).not.toMatch(/Get Amplified AI Accelerator|Or pay in 2 payments/);
      expect(res.body, url).not.toContain('%%');
      // Never a live Stripe link for the Accelerator outside its live state.
      if (state !== 'link') expect(res.body, url).not.toMatch(/buy\.stripe\.com\/test_(full|two)/);
    }
  }

  it('labels both buttons for GA4 and Meta at read time, and keeps their Payment Link tokens', () => {
    for (const [name, page] of Object.entries(pages)) {
      expect(buttons(page!).slice(0, 2), name).toEqual(pair('%%link:cohort-full%%', '%%link:cohort-two-pay%%'));
      expect(page, name).toContain(ANALYTICS_TAG);
    }
  });

  it('open: both are live, each its own Payment Link, on /offer, /forum, /pricing and /team-build', async () => {
    await serve();
    await expectState('link', [LINKS.full, LINKS.two]);
  });

  it('before launch (OFFER_OPEN off): neither is a link, and the card says it opens soon', async () => {
    await serve({ ...CONFIG, open: false });
    await expectState('soon', ['', '']);
  });

  it('after the founding deadline: neither is a link, and the card shows the waitlist', async () => {
    process.env.FIXED_NOW = '2026-12-01T07:00:00Z';
    await serve();
    await expectState('closed', ['', '']);
  });

  it('at 15 seats sold (D-154, both links counted together): neither is a link, and the card shows the waitlist', async () => {
    const db = await testDatabase();
    const t = Date.parse('2026-11-14T12:00:00-06:00');
    await db.insert(plans).values(
      Array.from({ length: 15 }, (_, i) => ({
        id: `pln_seat${i}`,
        accountId: `acc_seat${i}`,
        kind: 'cohort',
        option: i % 2 ? 'two_pay' : 'full',
        seats: 1,
        status: 'active',
        startsAt: t,
        orderId: `ord_seat${i}`,
        createdAt: t,
      })),
    );
    await serve();
    await expectState('soldout', ['', '']);
  });

  it('with only the paid-in-full link set: the card sells, and the 2 payments button has no link to follow', async () => {
    await serve({ ...CONFIG, paymentLinks: { 'cohort-full': LINKS.full } });
    await expectState('link', [LINKS.full, '']);
  });
});
