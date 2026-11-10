# Launch runbook

Everything between a green Gate 8 and a cohort using the product. Gates 0–8 are automated and
green; what is here is the part that needs an account, a credential or a person's judgement, and
cannot be done from a build machine.

Work top to bottom. Each step says what breaks if it is skipped, because several of them fail
silently rather than loudly.

---

## 1. DNS for Resend — do this first, before any real invite

**What breaks:** your own DMARC policy quarantines every sign-in link you send.

Your zone has `_dmarc` set to `p=quarantine` and **no SPF record**. So mail that is not DKIM-signed
and SPF-aligned for `amplifiedimpact.io` goes to spam — including the magic-link email that is the
only way into the console. There is no fallback password, so a learner who cannot receive that email
cannot get in at all.

1. Resend dashboard → **Domains** → add `amplifiedimpact.io`.
2. It gives you three records: a DKIM `TXT` (`resend._domainkey`), an SPF `TXT` on the subdomain it
   nominates, and usually a `MX` for bounce handling.
3. Add them at GoDaddy. **Add only; change nothing that is already there** — in particular leave the
   existing `_dmarc` TXT, the apex `A`, the `www` CNAME and the `_domainconnect` records alone. The
   Name field takes just the label (`resend._domainkey`), because GoDaddy appends the domain.
4. Wait for Resend to report the domain verified.
5. Send yourself one test invite before inviting anyone else, and check it lands in the inbox rather
   than spam.

## 2. Secrets on the Web service

**What breaks:** `EMAIL_FROM` and `RESEND_API_KEY` missing means every invite silently goes to a log
file while the admin console still shows "Invite sent to …". The `S3_*` set missing means every
download 500s.

Railway → **web** → Variables:

| Name | Where it comes from |
|---|---|
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | an address at the domain you verified in step 1 |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | the bucket's **Credentials** tab |

`DATABASE_URL`, `SESSION_SECRET`, `APP_URL` and `VITE_DATA_SOURCE` are already set. Leave them.

**`VITE_DATA_SOURCE` is still `fixture`.** The live site is the prototype demo running from
localStorage — which is deliberate and useful, but it is not the product. Flip it to `http` when you
are ready for the database to be the source of truth, and redeploy: `VITE_*` variables are read at
**build** time, so a change does nothing until a new build runs.

## 3. The two other environments

**What breaks:** three of Gate 9's four automated checks measure against `demo`, and neither
`post-deploy.yml` nor the Lighthouse budgets can run without it.

```bash
railway environment new staging
railway environment new demo
```

Then, per environment: `railway config plan` → read the diff → `railway config apply`.
`.railway/railway.ts` already describes all three, carries no secrets (every one is `preserve()`, so
`apply` cannot overwrite a credential) and gives `demo` no database and no bucket — it runs the
fixture source, so there is nothing to persist and nothing to leak.

Set the `preserve()` secrets once per environment in the dashboard. **`APP_URL` matters more than it
looks:** with it unset the scheduler commits its ledger rows and delivers nothing, and the ledger
then suppresses the retry (D-025). `railway.ts` declares it for all three.

Turn **Wait for CI** on for every environment's `web` service.

## 4. Branch protection

**What breaks:** nothing enforces that the gates ran before a deploy.

GitHub → Settings → Branches → protect `main`:

- Require status checks: `quality`, `api`, `goldens`, `compliance`
- Require one approving review
- Disallow direct pushes and force pushes

Then Gate 9's fourth automated check: push a deliberately failing commit to a scratch branch, merge
it to a scratch environment with Wait for CI on, and **screenshot Railway skipping the deployment**.
That screenshot is the only evidence the setting does anything.

## 5. Backups, and one restore

**What breaks:** you find out whether backups work on the day you need them.

Railway → **Postgres** → enable volume backups, daily, 7-day retention. Then restore one into
`staging` and sign in. Gate 9 asks for this because an untested backup is a guess.

## 6. Launch data

**What breaks:** running the wrong seed puts fourteen invented learners with plausible addresses
into production, one `remindMembers` click from being mailed.

```bash
pnpm --filter @ai/api db:seed:prod -- --owner-name "Your Name" --owner-email you@amplifiedimpact.io
```

That loads §9.5's launch seed only: the six AI Employees, the price list, the reminder toggles, the
permission matrix, one Owner and one cohort. No learners, teams, requests or activity.

The owner flags have **no defaults and are never read from the environment** — they name the only
account that can sign in, and a value inherited from a shell is how production ends up owned by an
address nobody controls. Running the script bare fails with usage, which is the safety property
rather than a bug.

Optional: `--instructor "Name"` if the Owner is not the one teaching, and `--cohort <id>`.

Then, in the console: upload skill files and resources through the Vault and the Builder, invite
staff from Staff & Roles, then invite learners and teams.

## 7. Rotate the database password

The Postgres public URL was pasted into a chat transcript during development. Rotate it from the
Postgres service once you no longer need a developer connecting from outside Railway.

---

## Gate 9's manual sign-off

Product-owner judgement, comparing production side by side with `design-reference/`:

- [ ] Every screen in SCREENS §3 and §4 at 1440, 1024 and 390, in light and dark
- [ ] Times correct for an ET, CT and PT viewer
- [ ] Brand: the "ai academy" lockup (reversed in dark theme) and the collapsed-rail favicon, and
      no masked region in parity (D-031)
- [ ] Backup restore tested
- [ ] `DECISIONS.md` lists every approved deviation and there are no others

## Gate 8's four manual checks

These need real providers and a deployed site, so no test can stand in for them:

- [ ] A real invite email arrives and its link signs in
- [ ] A real file uploads to the bucket and downloads
- [ ] A real replay plays with captions and chapter seeking
- [ ] Join opens Zoom in a new tab only inside the window

---

## Known open items

Three things are deliberately unfinished, each recorded with its reasoning:

**D-022 — the per-employee resource key.** `EmployeeDetail.vm.ts` derives a file name from the
admin-typed title and that derivation is **not injective**: "Session 1 Slides" and "Session 1:
Slides" both give `session-1-slides.pdf`. The storage layer mints `uploads/YYYY/MM/<uuid>.<ext>`.
The two namespaces cannot be reconciled on the web side alone, because `ModuleResource` has no key
field. **This is why the upload route has no caller** — it mints a key and nothing can hand that key
to `uploadResource`, which takes no `storageKey`. Deciding it is a prerequisite for the Vault drop
zone writing to the bucket.

**The 25 MB upload cap does not bind the PUT.** SigV4 does not sign `Content-Length`, so the cap
guards the *request for a URL*, not the upload itself. Closing it needs a bucket-side policy rather
than application code.

**§8.3's Zoom webhook** (`recording.completed` → download → publish replay) is not built. The phase
file marks it optional, and `publishReplay` would need the argument change D-022 defers.

Two copy decisions are also still open, both flagged for you rather than guessed at: the four
authored email strings ("This invite expires in 7 days.", "Accept Invite", "Open Admin Console",
"Open Team Hub"), and whether the weekly digest's "…what to review before Thursday" should derive
from `Cohort.cadence` instead of being fixed to the December cohort's rhythm.

---

## 8. The offer launch (Forum, Nov 13 to 15)

The carts, the webhook and the accounts are built (DECISIONS.md D-073 to D-082, proposed). What is
left needs an account, a credential or a person. Grokbok's part is in `docs/STRIPE-HANDOFF.md`.

**Before Thursday, Nov 12**

1. Migrate: `pnpm --filter @ai/api db:migrate` (migration 0006 adds `orders`, `stripe_events`,
   `accounts`, `plans` and `skills`). The deploy's `preDeploy` already runs it.
2. Railway → **web** → Variables. **The test-mode values go in by Wednesday morning, and the live ones
   on Thursday after Spring confirms the prices.** Paste each secret straight from Stripe into
   Railway, never into chat:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the restricted key `website-checkout` (`rk_test_…`, then `rk_live_…`) |
   | `STRIPE_WEBHOOK_SECRET` | the endpoint's `whsec_…`, same mode as the key |
   | `OFFER_OPEN` | `true` when the carts open; anything else shows "The carts open soon" |
   | `FOUNDING_CLOSES_AT` | `2026-11-15T23:59:00-06:00` unless Spring picks another zone |
   | `PAYMENT_LINK_LIBRARY`, `PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY`, `PAYMENT_LINK_AGENTS_UPTO15`, `PAYMENT_LINK_AGENTS_16TO40` | Grokbok's fallback links |
   | `INTAKE_URL_LIBRARY`, `INTAKE_URL_COHORT`, `INTAKE_URL_AGENTS` | Sarah O.'s intake forms; without them the welcome page says the form comes by email |
   | `INVITES_FROM` | optional; defaults to Mon, Nov 16, 8:00 am Central |
   | `STRIPE_PORTAL_LOGIN_URL` | the billing portal's login page, where members cancel themselves; Manage Billing falls back to it |
   | `STRIPE_PORTAL_CONFIG_LOCKED` | the `bpc_…` id of the portal configuration with cancelling off, from Grokbok (`docs/STRIPE-HANDOFF.md` § 4) |

   The boot log line `offer configuration` says what is on and the key's mode (`test` or `live`),
   never a value.
3. Load the skills: `pnpm --filter @ai/api skills --upload` puts every skill's ZIPs (the 35 skills
   in `SKILL_CATALOG`) in the bucket and the catalog in the table. It needs the `S3_*` settings (section 2). Change a skill's set or make it
   free in `packages/core/src/skills.ts` first. Free today: Appointment Follow-Up, Database Health Check
   and Team P&L Review.
4. Print `/forum-qr.svg` (it encodes `https://www.amplifiedimpact.io/forum?src=qr`). It decodes at
   3 cm; scan the printed one on an iPhone and an Android, on cellular.

**Before Monday, Nov 16: the switch to http mode.** Buyers sign in to the platform, and the platform
has no sign-in while `VITE_DATA_SOURCE` is `fixture` (section 2). Until it is `http`, every owner
invite is **held**, not sent: the accounts exist and the invites go out by themselves on the first
deploy in http mode (after `INVITES_FROM`). Resend's DNS (section 1) has to be done first, or the
invites land in spam.

**By hand, when needed**

- Re-run one order's provisioning: `pnpm --filter @ai/api provision --order <order id>`. Add
  `--invite-now` to send the owner's invite before `INVITES_FROM`. Running it twice changes nothing.
- A Tap to Pay sale at the table never reaches the website: set up the buyer's account and tags by
  hand that night, as Grokbok's handoff section 9 says.
- The 11th cohort sale goes through and logs `cohort seat 11 sold … book a tech assistant`.
