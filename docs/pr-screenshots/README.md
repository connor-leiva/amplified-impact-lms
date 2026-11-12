# PR screenshots

Before and after screenshots for the `design/*` PRs (the site revamp, Nov 11–12). They live on this
branch only, which is never merged, so no image lands in `main`. Each PR links them by commit SHA.

- `site-system/`: the shared header and footer, and the homepage unchanged. `before/` is `main`'s
  build, `after/` the PR's, both served by the real API on the marketing host with the live site's
  offer state; full pages at deviceScaleFactor 2 with reduced motion. `crops/` puts the header and
  footer side by side.
- `site-marketing/`: /about, /free, /agents, /teams and /team-build. `before/` is `main`'s build, `after/`
  the PR's, as above. `crops/` puts each page's first screen side by side.
