# PR screenshots

Before and after screenshots for the `design/*` PRs (the site revamp, Nov 11–12). They live on this
branch only, which is never merged, so no image lands in `main`. Each PR links them by commit SHA.

- `site-system/`: the shared header and footer, and the homepage unchanged. `before/` is `main`'s
  build, `after/` the PR's, both served by the real API on the marketing host with the live site's
  offer state; full pages at deviceScaleFactor 2 with reduced motion. `crops/` puts the header and
  footer side by side.
- `site-marketing/`: /about, /free, /agents, /teams and /team-build. `before/` is `main`'s build, `after/`
  the PR's, as above. `crops/` puts each page's first screen side by side.
- `site-pricing/`: /pricing in its three offer states: live (`pricing-*`), founding closed
  (`pricing-closed-*`, FOUNDING_CLOSES_AT in the past) and not open (`pricing-soon-*`, OFFER_OPEN off).
  `crops/` has the first screen side by side and the cards in each state.
- `site-pricing-lockups/`: /pricing after the card fix (stacked lockups as the heading, rows lined up).
  `after/` is the full page per state and width; `crops/` is the cards' section cut from it (full-page
  captures, so the sticky header covers nothing).
- `site-library/`: /library and the 55 skill, Grok Bot template and free guide pages. `pairs/` has one
  image per page and width, before (`main`) on the left and after on the right, full page at 1x (the
  1280 ones scaled to half); `crops/` has the first screen at 2x for five of the layouts.
- `site-ai101/`: /ai101, /voice-profile and /retool. `before/` and `after/` are full pages at 2x (the
  first screen, as the step-through shows one at a time) and `*-all-390.jpg`, every screen at once as
  the page reads without its script; `crops/` puts the first screen side by side.
