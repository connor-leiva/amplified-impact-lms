# Build brief: Homepage v3 (Claude Code)

Owner: Design (project manager for Connor Leiva). Written Nov 12, 2026, 11:30 AM CT.
Source of truth: the Claude Design mockup Connor approved. If you can't open the file below, pull it from the Claude Design thread it came from.
- Mockup (interactive React prototype): `mockup.html`. Use it only as the motion reference. Ignore its bottom-left "Hide / Page / Sales state" preview bar and every page except "Home (new)".
- Static handoff (markup and CSS, settled state): `handoff/home-v3.html`, `handoff/home-v3.css`, `handoff/home-v3.js`, `handoff/fonts/`.
- Exact copy, in order: `copy.md`. Screenshots: `shots/` (`sec-1280-NN-*.png`, `sec-390-NN-*.png`, frames `1280-NN-*-k.png` for pinned sections).

## 1. Goal
Replace the live homepage with v3: Spring's positioning ("Your next employee doesn't need a desk", the AI-employee framing) built on our v2 kit. It must match the mockup at 1280 and 390, but keep everything the site already guarantees: the kit header and nav, live prices and seats, the proof line, real photos, and buy elements that are never hidden.

## 2. Branch and PR rules
- Integration branch: `design/home-v3`, off `main`. Each small PR is `design/home-v3-<part>` → `design/home-v3`. The last PR takes `design/home-v3` → `main`.
- Use merge commits only. No force-push and no rebase. To catch up, merge `main` in (GitHub update-branch).
- Railway deploys every merge to main, so nothing from v3 may reach main until the last PR. That PR flips `site/render.ts` to v3 in one step and removes v2 only after the live check passes.
- Every PR needs a test comment that names its head SHA, plus 1280 and 390 shots against the matching mockup shots.

## 3. Where to build
- Build in the existing homepage code: `apps/web/src/home/*` (put new modules in `apps/web/src/home/v3/`) and `site/render.ts`.
- Use the kit header and Programs panel from #94 as they are: `kitHeader("/")` from `SITE.nav`, Logo 1, `data-brand-slot="logo-1"`. Use the kit footer too.
- **Do not build the mockup's header.** It differs from the kit in three ways: prices in the Programs menu, the order Accelerator/Agent/Team/Insiders where the kit has Accelerator/Team/Agent/Insiders, and a theme button. Nav config belongs to Ampy.
- Product names and lockups follow the kit. Logo 1 is the brand mark. Don't ship the mockup's inline wordmark SVG or its outline "58" art if a kit equivalent exists.
- Vanilla TypeScript, like the current `home-*.js`. No React runtime on the homepage.
- Fonts: the kit's self-hosted Geist and Geist Mono. Remove the mockup's Google Fonts `@import`.
- Map the mockup's tokens onto the kit tokens; they line up 1:1 in name and value (`--surface`, `--ink`, `--forest`, `--energy`, `--energy-bright`, `--space-*`, `--radius-*`). Add no new hex colors. The grain overlay is an inline SVG data URL; keep it only if the CSP allows it.
- Section themes come from the mockup: dark hh, vid, how, hrs, pg, fav, fd and foot; light (bone) wsk, mon, prf, qt, fh, wed and faq; forest band and close. Today the homepage is dark-only and its theme switch is hidden (#94). Keep that unless Connor decides otherwise (see Open decisions).
- Reuse kit pieces: `.wrap`, `.btn` variants, `.mono`/eyebrow (`ringdot` + label), `.h-section`, `.intro`, `.rv` with the NEVER_HIDDEN reveal (`initInView`/`reveal.ts` from #92), `.seatm` seat meter fed by `/api/offer`, `.proof-line`, `.plan-actions`, `.act-link`, `closeCta`, the kit segmented toggle, chips, and the check glyph (`gl`).

## 4. Section spec
Copy is exact and in `copy.md`. The notes below cover layout, reuse and data. "New" means a new component in `home/v3`.

| # | Section (class/id) | Purpose | Reuse | New |
|---|---|---|---|---|
| S1 | Hero `hh` | Positioning: "Your next employee doesn't need a desk." with free and Programs CTAs, an AI-employee badge, and stat strip 100 / 700+ / 58 | `.btn`, eyebrow, the stat strip pattern from the live hero | Employee badge with Owners/Agents/Ops tabs that auto-rotate (fill bar), a lanyard line, ripple rings. "Made-up example" tag always visible |
| S2 | Video `vid` | "Watch it run in a real business." Spring's morning | — | Video frame with a poster and an "SB on camera" bubble. **No recording exists. See the placeholder rule** |
| S3 | What a skill is `wsk` #skills | A chat restarts every time; a skill is set up once | eyebrow, `.h-section` | Two compare cards: chat thread with counter 12; skill card with voice/numbers/rules checks, a M–F "Ran this week" row and counter 1. **Connor decision: the "12 Times you’ve explained your business this month" counter gets a visible "Made-up example" tag** (kit `ex-tag`, same as the hero badge) |
| S4 | Picture your Monday `mon` | Without/With skills for team owners and agents, 8 AM to noon | kit segmented toggle | Two timelines with 3 task cards each that fly up into "Done before 8 AM" chips, revealing "8 AM to noon · All yours". Pinned scroll on desktop |
| S5 | How it works `how` | Give it the work, it does the job, you say yes | step list, chips | Pinned 3-step scene: inputs (CRM/calendar/inbox) → Morning Brief page → "You own the yes" email that types itself, Not sent → Approved by you. "Stays with you. Always." list. "Made-up example" tag |
| S6 | Off your plate `band` | One skill per job; add a few and get your week back | `.btn` (Try 5 Skills Free) | A list of 5 jobs struck through one by one, each with its Library skill name |
| S7 | Proof `prf` #proof | "We didn't read about this. We run on it." The real EOS chart | toggle, chips linking to skill pages | 3 stat tiles (38%, 95%, Daily) and an org chart with a People / People and AI toggle and counts "12 people · 29 skills". Legend: Person / Skill in the Library / Built for our team |
| S8 | Spring's words `qt` #qt | First-person quote with a 4-step milestone rail | — | Words highlight as you scroll; 95% and 38% get marked. Rail: Reports / Finance / Sales, recruiting, marketing / Production. "26 of 29 are in the Library" + Browse the Library |
| S9 | Hours calculator `hrs` | "How many hours could AI give you back?" | form controls, `.btn` | 7 range sliders (defaults 4,3,6,3,2,2,3 hrs; max 20) and a $/hour input (default 250, max 100000). Results: hours/week = sum × 0.5; hours/year = ×50; work weeks = year ÷ 40; dollars = year × rate. A 50-cell week grid lights up. Disclaimer kept verbatim |
| S10 | Five free skills `fh` #free | The 5 free skills | the free-five list on `/library` and `/pricing` | Row list with tool chips; links to each skill page |
| S11 | Programs `pg` #programs | 4 programs with every price | plan card pattern, `.seatm`, `.proof-line`, `.plan-actions`, toggles | Jump bar (4 tabs) and 4 cards with Yearly/Monthly, Up to 15/16 to 40 and Monthly/Yearly toggles that swap price and buy link; flash when a card is the jump target |
| S12 | Accelerator timeline `wed` | "Eight Wednesdays. Eight AI employees." | `.seatm`, `.proof-line`, `.btn` | Week 0–8 + Break + After list; a "N of 8 built" ring fills as you scroll; checks tick in |
| S13 | Library favorites `fav` #library | "58 skills and guides, sorted by who you are." | Library card data | 4 columns × 4 skills, outline "58", See All 58 |
| S14 | Founders `fd` #founders | Connor and Spring | **real photos** `/img/team/connor-leiva.jpg`, `/img/team/spring-bengtzen.jpg` | Two bio cards with fact chips; Venn "Spring + Connor = Every skill"; Read Our Story |
| S15 | FAQ `faq` #questions | 8 questions | — | Numbered accordion (one open at a time) |
| S16 | Close `close` | "Make your first hire today." | `closeCta` | — |
| — | Footer | — | **kit footer** | none. The mockup footer is for reference only |

Data rules:
- 58, prices, dates, seats and days left come from the same sources the kit pages use: the Library catalog, SITE offers and `/api/offer`. Retype none of them.
- Render final values in the HTML. A count-up may only animate on a copy that is already correct; never start from 0 in markup.
- Seats: the mockup hard-codes "15 of 15 founding seats left" and the open state. Use the live seat and offer state, including the soon/soldout/ended variants that `/pricing` already has.
- Every skill name in S6, S7, S8 and S13 links to its live skill page. Each one exists in `/library`, except Daily Sisu reports, Morning Debrief and Team activity reports. Those are "Built for our team" and get no link.

## 5. Interactions and reduced motion
The mockup decides between pinned and static layouts with `(min-width: 981px)` and not `(prefers-reduced-motion: reduce)`. Match that.

| Interaction | Desktop | `prefers-reduced-motion` and <981px |
|---|---|---|
| Hero badge tabs auto-rotate (about 5s, fill bar), ripple rings, lanyard swing | on | no auto-rotate; tabs still clickable; rings static |
| Stat count-ups (hero, S3 12/1, S7 38%/95%, org chart 29, hours results) | from the true value, about 420ms | final values only |
| S4 Monday: section 280vh, sticky stage, progress `--p`/`--m` sets the Without/With state at 50%; toggle buttons jump-scroll | pinned | `is-static`: normal height, "With skills" shown (`--m:1`), toggle switches state in place, "Keep scrolling" hint removed |
| S5 How: 340vh, 3 steps by thirds of progress `--q`; the email types itself in step 3 | pinned | `is-static`: all 3 steps stacked, email fully typed |
| S6 strike-through list | runs in sequence on view | all struck |
| S7 org chart People ↔ People and AI | animated plug-in of chips, skill counter | instant swap |
| S8 word-by-word highlight (scroll-through) | on | all words full ink (`is-static`) |
| S9 sliders and rate input | live | live (no motion) |
| S11 toggles swap price and link; jump-bar flash | on | no flash |
| S12 "N of 8 built" ring and checks follow scroll | on | ring full at 8 and all checked, **or** show "8 builds" with no progress claim. Never a stuck partial number |
| Video play ring pulse | on | static |
| FAQ accordion | height transition | instant |

All controls must work from the keyboard, with visible focus, `aria-pressed` on toggles and `aria-expanded` on the accordion. A sticky section must never trap focus or scrolling.

## 6. Hard rules (unchanged, PR-blocking)
1. Never edit `/agreement`, and keep it byte-identical.
2. Don't change prices, Payment Links, the 15-seat cap, the Nov 30 close or the unlock dates. The 8 `buy.stripe.com` links stay exactly as on `/pricing`, with the same link for the same plan.
3. Real photos only. No fake testimonials or stats. A "Made-up example" tag stays visible on every illustration: the hero badge, the How panel, the S3 "12 times you’ve explained your business" counter (Connor’s decision), and any other demo UI.
4. The proof line "100 agents, 700+ homes a year" goes next to **every** buy button: each S11 card CTA group and the S12 CTA. The mockup has none, so add the kit `.proof-line`.
5. No buy, seat or proof element starts hidden (no `.rv-wait`, `opacity:0` or fade). The mockup hides all 5 S11 buy links, the S11 seat meter and the band/hours/free/close CTAs until reveal. Use the NEVER_HIDDEN reveal and the `:has()` backstop.
6. Use the kit header and nav exactly as they are (#94). Don't touch `SITE.nav`, routing, checkout, `apps/api` or `/api/offer`; those belong to Ampy.
7. Keep Spring Bengtzen's copy, and send every new word to her (`spring-new-words.md`).
8. No secrets. No inline scripts unless they are CSP-hashed. Ampy checks the homepage CSP.

## 7. Placeholders (never shipped)
Wrap anything unresolved in `data-v3-pending="<key>"`. It renders only when `V3_PREVIEW=1` in dev and screenshot builds, and the production render strips it. A test fails if `data-v3-pending` appears in prod HTML.
Pending keys, until Connor decides:
- `video`: S2. No recording exists (`src: null`). The prod fallback hides the whole section.
- `quote`: S8. The Spring quote isn't on the live site.
- `stat-38`, `stat-95`: the S7 tiles and those figures in S8 and S14.
- `people-12`: the org chart "12 people" count.
- `fd-claims`: "Founder of The Forum", "MBA, data analytics" and Spring's "Co-founder, Amplified Impact" title.
- `direct-buy`: the S11 and S12 Stripe CTAs, until Connor and Ampy confirm the homepage carries direct buy links. The fallback is "See Full Details" links to the program pages, as live does today.

## 8. Acceptance tests (every PR, plus the flip PR)
- Shots at 1280×900 and 390×844, full page and per section, closed and open states, compared side by side with `shots/sec-*`. Layout drift ≤ 8px per section.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, CLS < 0.05, LCP < 2.5s, TBT < 200ms.
- Budgets: homepage HTML ≤ 45 KB gz, CSS ≤ 20 KB gz, JS ≤ 25 KB gz. The handoff is 32 + 15 + 0.5 KB gz before dedupe. Make the repeated icons (ringdot ×66, check ×37, arrow ×25) shared, which saves about 45 KB raw.
- axe: 0 serious or critical issues. Contrast AA in every section theme. Body text ≥ 16px.
- Never-hidden test: on load, with no scroll and JS on, every `a[href*="buy.stripe.com"]`, `.proof-line`, `.seatm` and `[data-left]` has computed opacity 1 and is visible. Every buy link has a `.proof-line` in the same CTA group. Repeat with JS off.
- Price/link parity: every price string and buy href on `/` equals `/pricing`'s for the same plan and toggle.
- Counts: the hero "58" and S13 "58" equal the Library count, and "26 of 29" is computed from the chart data against the Library.
- `prefers-reduced-motion`: no pinned sections, no auto-rotation, final values shown.
- `/agreement` byte-identical before and after. Every other www page byte-identical outside the homepage.
- No `data-v3-pending` in prod HTML. No Google Fonts request.

## 9. PR split (confirmed by Connor; each one into `design/home-v3`)
1. `v3-scaffold`: v3 module, tokens map, kit header and footer, reveal with NEVER_HIDDEN, count-up util, pending-flag plumbing; S1 Hero (with stat strip) and S2 Video (pending).
2. `v3-story`: S3 skill compare, S4 Monday (pinned and static), S5 How it works (pinned and static).
3. `v3-proof`: S6 band, S7 org chart, S8 quote (pending keys on).
4. `v3-free`: S9 calculator, S10 free five, S13 Library favorites.
5. `v3-programs`: S11 Programs and S12 Accelerator timeline, with live offers, seats, proof lines and buy links. **Ampy reviews this one.**
6. `v3-close`: S14 founders (real photos), S15 FAQ, S16 close, then a perf and a11y pass.
7. Flip: `design/home-v3` → `main`. `render.ts` switches to v3, then the live check runs.

## 10. Open decisions (Connor). Until answered, keep the pending keys in §7.
See `conflicts.md` for the exact mockup vs live text.
- C4 direct buy links on `/` → `direct-buy`
- C5 Spring quote → `quote`
- C6/C13 38% and 95% → `stat-38`, `stat-95`
- C7 "12 people" → `people-12`
- C9 video → `video`
- C11/C12 founder titles and claims → `fd-claims`
- C14 Team Plan Dec 14 wording: no change until Connor confirms
- C15: decided. Tag S3 "12" as "Made-up example" (see S3 and §6.3)
- C16 theme switch: keep `/` dark-only with the mockup's per-section light, forest and dark bands, switch hidden
