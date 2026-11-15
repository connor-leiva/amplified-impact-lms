# Accelerator: two equal pay buttons (D-159), screenshots

Taken from the real API (`apps/api/src/server.ts`, `NODE_ENV=test`, port 4373) serving the built www pages,
filled per request, with made-up test-mode Payment Link URLs (`https://buy.stripe.com/test_example_*`).
No secrets, no Stripe calls, no emails. Chromium (Playwright 1.63.0), reduced motion; 390 at 2x, 1280 at 1x.

| File | Page | Width | State |
| --- | --- | --- | --- |
| `forum-390-open.jpg` | /forum | 390 | open: both buttons live |
| `forum-1280-open.jpg` | /forum | 1280 | open (3 cards a row: the pair stacks in the card) |
| `offer-390-open.jpg` | /offer | 390 | open (the same page as /forum) |
| `forum-390-prelaunch.jpg` | /forum | 390 | prelaunch, `OFFER_OPEN` off: "Opens soon.", no button |
| `forum-390-closed.jpg` | /forum | 390 | founding closed (Dec 1): $9,997 and the waitlist, no button |
| `forum-390-soldout.jpg` | /forum | 390 | 15 seats sold (D-154): the waitlist, no button |
| `pricing-390-open.jpg` | /pricing | 390 | open |
| `pricing-1280-open.jpg` | /pricing | 1280 | open (4 cards a row: the pair stacks in the card) |
| `team-build-390-hero-open.jpg` | /team-build, hero | 390 | open |
| `team-build-1280-hero-open.jpg` | /team-build, hero | 1280 | open: side by side |
| `team-build-390-price-open.jpg` | /team-build, price section | 390 | open |
| `team-build-1280-price-open.jpg` | /team-build, price section | 1280 | open (a 425px panel: stacked) |

In every shot the page has no sideways scroll. In the open state each button's href is its own cart's link
(`cohort-full`, `cohort-two-pay`) and carries `data-ai-cart`; in prelaunch, closed and sold out both hrefs
are empty and both buttons are hidden.

Also checked at 320, 375, 390, 430, 768, 1024 and 1280 on /offer, /forum, /pricing and /team-build: no
sideways scroll; both buttons the same size (48px tall on /offer, 52px on the kit's pages); every label,
caption and the tax line on one line, at 16px. Side by side at 768 everywhere it has room, and on
/team-build's hero at 1024 and 1280; stacked, full width, on phones and in the narrow desktop cards.

These files live in one commit and the next commit removes them; the PR links them by that commit's SHA.
