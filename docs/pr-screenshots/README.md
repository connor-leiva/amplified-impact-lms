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
- `v2-kit/`: the v2 kit's header and footer, before (`main`) and after, cropped from /pricing at 2x
  (the kit's first page, `design/v2-pricing`); the open menus and the light theme are in
  `v2-pricing/after-states/`.
- `v2-pricing/`: /pricing on the v2 kit. `before*/` is `main`, `after*/` the branch head, full pages at
  2x with reduced motion: founding open (`before/`, `after/`), founding closed (`*-closed/`) and
  checkout not open yet (`*-soon/`). `after-states/` has Programs open, the phone menu open, the light
  theme, and the page with no script.
- `v2-offers/`: /team-build, /agents and /teams on the v2 kit. `before*/` is `main`, `after*/` the branch
  head, full pages at 2x with reduced motion: founding open (`before/`, `after/`), founding closed
  (`*-closed/`), checkout not open yet (`*-soon/`), the light theme (`after-light/`), and the mockup's
  made-up illustrations switched on for this build only (`after-examples/`; off on the branch).
- `v2-library-free/`: /library and /free on the v2 kit. `before/` is `main`, `after/` the branch head,
  full pages at 2x with reduced motion, plus the light theme (`after-light/`) and /free's made-up
  illustrations switched on for this build only (`after-examples/`; off on the branch).
  `/library?show=free` renders the same page as /library, so it isn't shot twice.
- `v2-about/`: /about on the v2 kit. `before/` is `main`, `after/` the branch head, full pages at 2x
  with reduced motion, plus the light theme (`after-light/`).
- `v2-signin/`: the sign-in screens in the v2 look. `before/` is connor-leiva/amplified-impact-lms#69's
  head (the PR's base, with the G), `after/` the branch head. The fixture build at 2x with reduced
  motion and the auth API answered in the browser (Google on; a refused password; a link sent).
  Each state in the light and the dark theme: `<state>-<theme>-<width>.jpg`.
- `v2-insiders/`: /insiders, a new page (no `before/`: `main` has no /insiders). The branch head served by
  the real API at 2x with reduced motion: checkout open with the live Payment Links (`after/`), checkout
  not open yet (`after-soon/`), the light theme (`after-light/`), and the Programs menu, the phone
  menu, the light theme and the page with no script (`after-states/`).
- `v2-skill-pages/`: the skill, Grok Bot, guide, AI 101, voice profile and Retool pages on the kit's
  tokens. `before/` is `main`, `after/` the branch head, full pages at 2x with reduced motion, for seven
  of the 59 pages: a skill, a Grok Bot template, two guides, /ai101, /voice-profile and /retool.
- `v2-kit-logo/`: the kit header with the live signature (`before-*`, /pricing at the old head) and
  with Logo 1 (`after-*`, /pricing at the new head), at 1280 and 390 at 2x, and the footer's logo.
- `v2-pricing-r2/`: /pricing after Ampy's review (no reveal on the plan cards), founding open, full
  page at 2x with reduced motion.
