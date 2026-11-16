/* global window, document, location, localStorage */
// Google Analytics 4 and the Meta Pixel on the public www site, and nowhere else (DECISIONS.md D-155).
//
// A first-party file, so the CSP's `script-src 'self'` admits it with no inline script and no hash.
// The API adds `<script src="/analytics.js" defer>` to every www marketing page as it reads them at
// boot (`apps/api/src/lib/analytics.ts`): the homepage, /offer and /forum, the sales pages, the skill
// landing pages, the library, /ai101 and /offer/welcome. Never the learn app, the admin console or the
// legal pages. It also runs only on www.amplifiedimpact.io, so a public page opened on the learn host
// (or a local or preview build) loads no tag at all.
//
// What it sends:
//   - every page: GA4's page_view (gtag's `config`) and Meta's PageView;
//   - a Buy button (a Stripe Payment Link, labelled by the API with `data-ai-cart` / `data-ai-item`):
//     GA4 `begin_checkout` and Meta `InitiateCheckout`, with the plan's name;
//   - the Clarity Call's button (`data-ai-event="clarity_call_click"`, D-161): GA4 `clarity_call_click`
//     and Meta's custom `ClarityCallClick`, each with the page's path as `page`;
//   - /offer/welcome once the order is confirmed: GA4 `purchase` and Meta `Purchase`, with the value,
//     currency and product the server read from the order, and the Checkout Session id as the
//     transaction id and the event id. Once per session id: a reload, a second tab or the back button
//     sends nothing more.
// No name, email or phone is ever sent.
(function () {
  'use strict';

  var GA4_ID = 'G-TSQ5YB5BCP';
  var META_PIXEL_ID = '1835170747490806';
  var HOSTS = ['www.amplifiedimpact.io'];
  var STRIPE_LINK = /^https:\/\/buy\.stripe\.com\//;
  var SENT = 'ai-purchase-sent:';

  if (HOSTS.indexOf(location.hostname) === -1) return;
  if (window.__aiAnalytics) return; // loaded twice: once is enough
  var self = {};
  window.__aiAnalytics = self;

  function load(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  // --- GA4 (gtag.js) ------------------------------------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    // gtag.js reads an `arguments` object, not an array: this is Google's own snippet, as code.
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID); // sends page_view
  load('https://www.googletagmanager.com/gtag/js?id=' + GA4_ID);

  // --- Meta Pixel (fbevents.js) -------------------------------------------------------------------
  if (!window.fbq) {
    var fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    load('https://connect.facebook.net/en_US/fbevents.js');
  }
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');

  // --- A call to action that is not a Buy button (D-161) -------------------------------------------
  // A link marked `data-ai-event="<name>"`, for a name listed here: GA4 gets that event with the page's
  // path, and Meta the custom event beside it, as every GA4 event here has its Meta twin. Today only
  // the Clarity Call card's button (`src/kit/clarity.ts`), which opens the booking page in a new tab,
  // so this page stays to send it. An unlisted name sends nothing.
  var CTA_EVENTS = { clarity_call_click: 'ClarityCallClick' };
  document.addEventListener(
    'click',
    function (e) {
      if (window.__aiAnalytics !== self) return; // a listener from an earlier load of this file
      var target = e.target;
      var a = target && target.closest ? target.closest('a[data-ai-event]') : null;
      if (!a) return;
      var name = a.getAttribute('data-ai-event');
      if (!Object.prototype.hasOwnProperty.call(CTA_EVENTS, name)) return;
      var page = location.pathname;
      window.gtag('event', name, { page: page });
      window.fbq('trackCustom', CTA_EVENTS[name], { page: page });
    },
    true,
  );

  // --- Buy: a Stripe Payment Link -----------------------------------------------------------------
  document.addEventListener(
    'click',
    function (e) {
      if (window.__aiAnalytics !== self) return; // a listener from an earlier load of this file
      var target = e.target;
      var a = target && target.closest ? target.closest('a[data-ai-cart]') : null;
      if (!a || !STRIPE_LINK.test(a.href)) return; // sold out, closed or "opens soon": no checkout
      var id = a.getAttribute('data-ai-cart');
      var name = a.getAttribute('data-ai-item') || id;
      window.gtag('event', 'begin_checkout', { items: [{ item_id: id, item_name: name, quantity: 1 }] });
      window.fbq('track', 'InitiateCheckout', { content_name: name, content_ids: [id], content_type: 'product', num_items: 1 });
    },
    true,
  );

  // --- Purchase: /offer/welcome, once the order is confirmed --------------------------------------
  function purchase() {
    var b = document.body;
    if (!b || b.getAttribute('data-state') !== 'confirmed') return;
    var id = b.getAttribute('data-purchase-id') || '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return;
    try {
      if (localStorage.getItem(SENT + id)) return;
      localStorage.setItem(SENT + id, '1');
    } catch {
      // Storage refused (a private window): GA4 still drops a repeated transaction_id, and Meta a
      // repeated eventID, so sending is safer than not.
    }
    var value = Number(b.getAttribute('data-purchase-value'));
    if (!isFinite(value) || value < 0) value = 0;
    var currency = b.getAttribute('data-purchase-currency') || 'USD';
    var item = b.getAttribute('data-purchase-item') || '';
    var name = b.getAttribute('data-purchase-name') || item;
    window.gtag('event', 'purchase', {
      transaction_id: id,
      value: value,
      currency: currency,
      items: [{ item_id: item, item_name: name, price: value, quantity: 1 }],
    });
    window.fbq('track', 'Purchase', { value: value, currency: currency, content_name: name, content_ids: [item], content_type: 'product', num_items: 1 }, { eventID: id });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', purchase);
  else purchase();
})();
