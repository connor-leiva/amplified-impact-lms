# PR screenshots: the Clarity Call card (D-161)

The card as the API serves each page: `pnpm --filter @ai/web build`, then `apps/api/src/server.ts` over
it, with `MARKETING_HOST=www.amplifiedimpact.io` (the homepage was requested with that `Host`), the
offer open (`OFFER_OPEN=true`), placeholder test-mode Payment Link URLs (`https://buy.stripe.com/test_...`)
and the clock at Monday, Nov 16, 2026, 10:00 AM Central. Chromium, reduced motion, the kit's default
dark theme; each shot is scrolled so the card sits mid-screen, with the end of the page's last section
above it and the footer below.

| File | Page | Width |
|---|---|---|
| `home-1280.jpg` | `/` (homepage v3) | 1280 |
| `home-390.jpg` | `/` (homepage v3) | 390 (2x) |
| `offer-1280.jpg` | `/offer` (the same page as `/forum`) | 1280 |
| `offer-390.jpg` | `/offer` | 390 (2x) |
| `pricing-390.jpg` | `/pricing` | 390 (2x) |
| `team-build-390.jpg` | `/team-build` | 390 (2x) |
| `appointment-follow-up-390.jpg` | `/appointment-follow-up` (a skill page) | 390 (2x) |

The next commit removes this folder; the pull request links these files by this commit's SHA.
