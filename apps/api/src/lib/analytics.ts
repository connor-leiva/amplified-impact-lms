// Google Analytics 4 and the Meta Pixel on the www marketing pages (DECISIONS.md D-155).
//
// The tags live in one first-party file, `apps/web/public/analytics.js` (served at `/analytics.js`,
// so `script-src 'self'` admits it). This module puts that file on the www pages and says what the
// pages' CSP must add for it:
//
//   - `withAnalytics(page)` runs once per page as `server.ts` reads the built HTML: it adds the one
//     `<script src="/analytics.js" defer>` before `</head>`, and labels every Buy button (a
//     `%%link:<cart>%%` Payment Link, filled per request) with its cart and product name for the
//     `begin_checkout` / `InitiateCheckout` events. Only www pages pass through it: the homepage, the
//     offer page (/offer and /forum), /offer/welcome, the sales pages, the skill landing pages, the
//     library and /ai101. Never the learn app's `index.html`, and never the legal pages (/agreement,
//     /terms, /privacy).
//   - `ANALYTICS_CSP` is exactly what the two tags need, and only a response that carries the tag
//     gets it (`app.ts`): the learn app, the admin console and every API answer keep the strict policy,
//     so an injected script there still cannot load anything from Google's or Meta's hosts.
//
// The ids are public (they are in every page's source), so they are constants, not variables.

import type { CartId, PlanKind } from '@ai/core/offer';
import { CART_IDS, CARTS, PLAN_NAMES } from '@ai/core/offer';

export const GA4_MEASUREMENT_ID = 'G-TSQ5YB5BCP';
export const META_PIXEL_ID = '1835170747490806';

/** The one tag a www page carries. */
export const ANALYTICS_TAG = '<script src="/analytics.js" defer></script>';

/** What the two tags need on top of the strict policy, and nothing else. */
export const ANALYTICS_CSP: Readonly<Record<'script-src' | 'connect-src' | 'img-src', readonly string[]>> = {
  'script-src': ['https://www.googletagmanager.com', 'https://connect.facebook.net'],
  'connect-src': [
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://www.googletagmanager.com',
    'https://www.facebook.com',
    'https://connect.facebook.net',
  ],
  'img-src': ['https://www.google-analytics.com', 'https://www.googletagmanager.com', 'https://www.facebook.com'],
};

const OPTION_NAMES: Readonly<Record<CartId, string>> = {
  'cohort-full': 'Paid in Full',
  'cohort-two-pay': 'Two Payments',
  'insiders-year': 'One Year',
  'insiders-monthly': 'Monthly',
  'insiders-agent-monthly': 'Monthly',
  'agents-upto15': 'Up to 15 Agents',
  'agents-16to40': '16 to 40 Agents',
  'agent-monthly': 'Monthly',
  'agent-yearly': 'Yearly',
};

/** The product name a cart is reported under: "Amplified AI Accelerator, Paid in Full". */
export const cartItemName = (id: CartId): string => `${PLAN_NAMES[CARTS[id].plan as PlanKind]}, ${OPTION_NAMES[id]}`;

const isCart = (id: string): id is CartId => (CART_IDS as readonly string[]).includes(id);
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * A www page with the analytics tag, and its Buy buttons labelled. Idempotent; a page with no
 * `</head>` (or none at all) comes back unchanged.
 */
export function withAnalytics(page: string | null): string | null {
  if (page === null || !page.includes('</head>')) return page;
  let out = page.includes(ANALYTICS_TAG) ? page : page.replace('</head>', `    ${ANALYTICS_TAG}\n  </head>`);
  out = out.replace(/(<a\b[^>]*?)\shref="%%link:([a-z0-9-]+)%%"/g, (whole, open: string, id: string) => {
    if (!isCart(id) || /\sdata-ai-cart=/.test(open)) return whole;
    return `${open} data-ai-cart="${id}" data-ai-item="${attr(cartItemName(id))}" href="%%link:${id}%%"`;
  });
  return out;
}

/**
 * A CSP header with the analytics sources added to its three directives (each added if missing).
 * Everything else in the header is kept as it was.
 */
export function withAnalyticsCsp(header: string): string {
  const parts = header
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const [name, sources] of Object.entries(ANALYTICS_CSP)) {
    const i = parts.findIndex((p) => p.split(/\s+/)[0] === name);
    if (i === -1) {
      parts.push(`${name} ${sources.join(' ')}`);
      continue;
    }
    const have = new Set(parts[i]!.split(/\s+/).slice(1));
    const add = sources.filter((s) => !have.has(s));
    if (add.length) parts[i] = `${parts[i]} ${add.join(' ')}`;
  }
  return parts.join(';');
}

/** Whether a response body is a page that loads the tags. */
export const loadsAnalytics = (payload: unknown): boolean => typeof payload === 'string' && payload.includes(ANALYTICS_TAG);
