import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// D-155: `public/analytics.js`, the one file that loads Google Analytics 4 and the Meta Pixel on the
// www marketing pages. Run here as the browser runs it, against jsdom: no third-party script is ever
// fetched (jsdom loads no external resource), so what it would send is read off the two queues the
// tags drain, `dataLayer` and `fbq.queue`.

const SOURCE = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../public/analytics.js'), 'utf8');

type Win = Window & {
  dataLayer?: IArguments[];
  fbq?: { queue: IArguments[] };
  __aiAnalytics?: boolean;
  gtag?: unknown;
  _fbq?: unknown;
};
const win = window as Win;
const dom = (globalThis as unknown as { jsdom: { reconfigure(o: { url: string }): void } }).jsdom;

/** Load the file as a page would, at this address. */
function run(url = 'https://www.amplifiedimpact.io/offer'): void {
  dom.reconfigure({ url });
  new Function(SOURCE)();
}
/** What was pushed to gtag, as plain arrays. */
const gtagCalls = () => (win.dataLayer ?? []).map((a) => Array.from(a));
const fbqCalls = () => (win.fbq?.queue ?? []).map((a) => Array.from(a));
const scripts = () => Array.from(document.head.querySelectorAll('script')).map((s) => s.getAttribute('src'));

/** A fresh page: no tags, no queues, nothing remembered but what the test keeps. */
function reset(): void {
  for (const k of ['__aiAnalytics', 'dataLayer', 'gtag', 'fbq', '_fbq'] as const) delete win[k];
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  for (const a of Array.from(document.body.attributes)) document.body.removeAttribute(a.name);
}

beforeEach(() => {
  reset();
  localStorage.clear();
});
afterEach(() => {
  reset();
  dom.reconfigure({ url: 'http://localhost:3000/' });
});

describe('analytics.js (D-155)', () => {
  it('loads both tags on www and sends the page view: GA4 page_view (config) and Meta PageView', () => {
    run();
    expect(scripts()).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TSQ5YB5BCP', 'https://connect.facebook.net/en_US/fbevents.js']);
    expect(gtagCalls()).toEqual([['js', expect.any(Date)], ['config', 'G-TSQ5YB5BCP']]);
    expect(fbqCalls()).toEqual([['init', '1835170747490806'], ['track', 'PageView']]);
    // Loaded twice (a second tag): nothing doubles.
    new Function(SOURCE)();
    expect(scripts()).toHaveLength(2);
    expect(fbqCalls()).toHaveLength(2);
  });

  it('loads nothing on the learn host, or anywhere but www', () => {
    for (const url of ['https://learn.amplifiedimpact.io/offer', 'https://learn.amplifiedimpact.io/admin', 'https://amplifiedimpact.io/', 'http://localhost:4173/']) {
      reset();
      run(url);
      expect(scripts(), url).toEqual([]);
      expect(win.dataLayer, url).toBeUndefined();
      expect(win.fbq, url).toBeUndefined();
    }
  });

  it('sends begin_checkout and InitiateCheckout with the plan when a Buy button (a Stripe Payment Link) is clicked', () => {
    run();
    document.body.innerHTML =
      '<a id="buy" data-ai-cart="cohort-full" data-ai-item="Amplified AI Accelerator, Paid in Full" href="https://buy.stripe.com/test_full"><span>Reserve My Seat</span></a>' +
      '<a id="soldout" data-ai-cart="cohort-two-pay" data-ai-item="Amplified AI Accelerator, Two Payments" href="">Sold out</a>' +
      '<a id="other" href="https://buy.stripe.com/test_other">Not labelled</a>';
    // jsdom does not navigate; a page would leave for Stripe here.
    document.addEventListener('click', (e) => e.preventDefault());
    document.querySelector<HTMLElement>('#buy span')!.click();
    document.querySelector<HTMLElement>('#soldout')!.click();
    document.querySelector<HTMLElement>('#other')!.click();
    expect(gtagCalls().slice(2)).toEqual([['event', 'begin_checkout', { items: [{ item_id: 'cohort-full', item_name: 'Amplified AI Accelerator, Paid in Full', quantity: 1 }] }]]);
    expect(fbqCalls().slice(2)).toEqual([
      ['track', 'InitiateCheckout', { content_name: 'Amplified AI Accelerator, Paid in Full', content_ids: ['cohort-full'], content_type: 'product', num_items: 1 }],
    ]);
  });

  describe('/offer/welcome', () => {
    const confirmed = (id = 'cs_test_paid000000001', over: Record<string, string> = {}) => {
      const attrs: Record<string, string> = {
        'data-state': 'confirmed',
        'data-purchase-id': id,
        'data-purchase-value': '7500.00',
        'data-purchase-currency': 'USD',
        'data-purchase-item': 'cohort-full',
        'data-purchase-name': 'Amplified AI Accelerator, Paid in Full',
        ...over,
      };
      for (const [k, v] of Object.entries(attrs)) document.body.setAttribute(k, v);
    };
    const purchases = () => gtagCalls().filter((c) => c[1] === 'purchase');
    const metaPurchases = () => fbqCalls().filter((c) => c[1] === 'Purchase');
    /** A reload: a new page, the same browser storage. */
    const reload = (id?: string, over?: Record<string, string>) => {
      reset();
      confirmed(id, over);
      run('https://www.amplifiedimpact.io/offer/welcome?session_id=' + (id ?? 'cs_test_paid000000001'));
    };

    it('sends purchase and Purchase with the order’s value, currency and product, keyed by the Checkout Session', () => {
      reload();
      expect(purchases()).toEqual([
        [
          'event',
          'purchase',
          {
            transaction_id: 'cs_test_paid000000001',
            value: 7500,
            currency: 'USD',
            items: [{ item_id: 'cohort-full', item_name: 'Amplified AI Accelerator, Paid in Full', price: 7500, quantity: 1 }],
          },
        ],
      ]);
      expect(metaPurchases()).toEqual([
        [
          'track',
          'Purchase',
          { value: 7500, currency: 'USD', content_name: 'Amplified AI Accelerator, Paid in Full', content_ids: ['cohort-full'], content_type: 'product', num_items: 1 },
          { eventID: 'cs_test_paid000000001' },
        ],
      ]);
    });

    it('fires once per session id: a reload sends nothing more, another session sends its own', () => {
      reload();
      expect(purchases()).toHaveLength(1);
      reload();
      expect(purchases()).toHaveLength(0);
      expect(metaPurchases()).toHaveLength(0);
      // The page view still counts on the reload.
      expect(fbqCalls()).toEqual([['init', '1835170747490806'], ['track', 'PageView']]);
      reload('cs_test_other00000001');
      expect(purchases()).toHaveLength(1);
    });

    it('sends 0, never a guess, when the order has no amount', () => {
      reload('cs_test_trial00000001', { 'data-purchase-value': '', 'data-purchase-item': 'agent-monthly', 'data-purchase-name': 'Amplified Agent Plan, Monthly' });
      expect(purchases()[0]![2]).toMatchObject({ value: 0, items: [{ item_id: 'agent-monthly', item_name: 'Amplified Agent Plan, Monthly', price: 0, quantity: 1 }] });
    });

    it('sends nothing while the payment is confirming, or for a session it cannot read', () => {
      reload('cs_test_pend000000001', { 'data-state': 'pending' });
      expect(purchases()).toEqual([]);
      reload('', {});
      expect(purchases()).toEqual([]);
      reload('cs_test_paid000000009', { 'data-state': 'unknown' });
      expect(metaPurchases()).toEqual([]);
    });
  });
});
