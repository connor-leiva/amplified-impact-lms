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
| `S3_URL_STYLE` | optional: `path` (the default) or `virtual`. The bucket's Credentials tab says which URL style it takes: Railway's buckets created since its move to virtual-hosted URLs want `virtual`. Production's `skills` bucket takes `path` (the pre-deploy uploads through it) |

`DATABASE_URL`, `SESSION_SECRET`, `APP_URL` and `VITE_DATA_SOURCE` are already set. Leave them.

**Check the Library after a deploy** (D-122), with no sign-in and nothing secret in the answer:

```bash
curl https://learn.amplifiedimpact.io/api/health/library
```

`"ok": true` means every skill row is published, every ZIP is in the bucket, and a real download
link for a paid skill (the same presign the Skill Library uses) answered. `error` names the step that
failed: `storage-missing` (an `S3_*` variable), `list-failed`, `presign-failed` or `fetch-failed`;
`link.status` 403 on a resolving bucket usually means the URL style is wrong for it.

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

That loads §9.5's launch seed only: the Amplified AI Accelerator's nine AI Employees (cohort `dec26`
and its sixteen sessions, D-110), the price list, the reminder toggles, the permission matrix and one
Owner. No learners, teams, requests or activity.

**Run it before the first sale reaches the webhook.** The seed refuses a database that already has a
`users` row, and every paid order writes its buyer into `users` (D-078). After the first purchase it
can no longer run as it is (D-106 lists this as open).

**The curriculum does not depend on it.** Every deploy's pre-deploy command runs, after the
migrations, `pnpm --filter @ai/api db:curriculum:ensure`: it applies the AI Accelerator's
curriculum (cohort `dec26`, its sixteen sessions and the nine course modules; the prototype's six
AI Employees become drafts) to a database that has **none** of it, and on every later deploy writes
**0 rows**. It never touches users, teams, progress or staff. The Owner, the price list and the
reminder toggles still come only from `db:seed:prod`.

**The Owner comes with the deploy too (D-129).** Next, the pre-deploy command runs
`pnpm --filter @ai/api db:owner:ensure`. It adds the console's Owner, `DEPLOY_OWNER` in
`apps/api/src/db/seed.ts` (Connor Leiva, `connor@springb.com`), and the staff role matrix if that
table is empty, to a database that has no Owner. On every later deploy it writes nothing. If the
database already has a different Owner, or the address already signs in as another account, it logs
one line saying so, writes nothing, and exits 0, so the deploy goes on. It never prints the name or
the address. It writes no learner, team, order, plan, seat, progress, course, price or reminder row.
The Owner is in the code, not in a variable, so a stray `OWNER_EMAIL` cannot change who owns
production; to change it before it exists, change `DEPLOY_OWNER` in a pull request, and after it
exists, from Staff & Roles in the console. Then sign in at `https://learn.amplifiedimpact.io/sign-in`
with that address: the link lands on `/admin`, and `/course` shows Week 0 to Week 8 as a staff
preview.

**The Owner by hand.** The same thing, for any address, for anyone with production's `DATABASE_URL`
in their own shell (nothing here sets or prints it):

```bash
pnpm --filter @ai/api db:owner -- --owner-name "Your Name" --owner-email you@amplifiedimpact.io
```

It adds only the Owner, the one account that can sign in to the console, and the staff role matrix
if that table is empty. It writes no learner, team, order, plan, progress, course, price or reminder
row. The two flags have no defaults and are never read from the environment. It names the address
before writing, refuses (writing nothing) if a different Owner exists or the address already signs
in as someone else, and run twice with the same address writes nothing the second time. Then sign in
at learn with that address.

**The pre-deploy command is set in Railway, by hand.** Railway does not read `.railway/railway.ts`
on deploy (only `railway config apply` does), so a push never changes it. It is the web service's
**Pre-deploy Command** (Railway → **web** → Settings → Deploy), and it must be exactly:

```bash
pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api db:curriculum:ensure && pnpm --filter @ai/api db:owner:ensure && pnpm --filter @ai/api skills --upload
```

`.railway/railway.ts` holds the same string, and a test pins it there; change the dashboard and the
file together. The third step is the Owner (above). The last step is the Library upload (section 8,
step 3), which needs the bucket.

The deploy never re-applies the curriculum over a live course, because the full overlay rewrites
every course row: a session staff moved goes back to its old time and loses its Zoom link,
attendance and replay, and a module edited in the Module Builder reverts. To change the course on a
live database on purpose (a new week, a fixed step), run it by hand and expect exactly that:

```bash
pnpm --filter @ai/api db:curriculum
```

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
   `accounts`, `plans` and `skills`; 0008 lets them hold the Agent Plan, D-106). The deploy's
   pre-deploy command (section 6, set in Railway by hand) already runs it, then the curriculum,
   then the Owner.
2. Railway → **web** → Variables. **The test-mode values go in by Wednesday morning, and the live ones
   on Thursday after Spring confirms the prices.** Paste each secret straight from Stripe into
   Railway, never into chat:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the restricted key `website-checkout` (`rk_test_…`, then `rk_live_…`) |
   | `STRIPE_WEBHOOK_SECRET` | the endpoint's `whsec_…`, same mode as the key |
   | `OFFER_OPEN` | `true` when the carts open; anything else shows "The carts open soon" |
   | `FOUNDING_CLOSES_AT` | optional; defaults to `2026-11-30T23:59:00-07:00` (Mon, Nov 30, 11:59 PM Mountain) for the AI Accelerator and the Team Plan (D-104) |
   | `PAYMENT_LINK_COHORT_FULL`, `PAYMENT_LINK_COHORT_TWO_PAY`, `PAYMENT_LINK_INSIDERS_YEAR`, `PAYMENT_LINK_INSIDERS_MONTHLY`, `PAYMENT_LINK_TEAM_UPTO15_PREPAY`, `PAYMENT_LINK_TEAM_16TO40_PREPAY` | Ampy's Payment Links, the only way to buy since D-104; an unset one shows "Opens soon." |
   | `PAYMENT_LINK_AGENT_MONTHLY`, `PAYMENT_LINK_AGENT_YEARLY` | the Amplified Agent Plan's two links, $79 a month and $790 a year, first charge Jan 4, 2027 (D-106). Paste the URLs from Stripe; the code holds only these names |
   | `INTAKE_URL_COHORT`, `INTAKE_URL_MEMBERSHIP`, `INTAKE_URL_AGENTS`, `INTAKE_URL_AGENT_PLAN` | Sarah O.'s intake forms for the AI Accelerator, Amplified Insiders, the Team Plan and the Agent Plan; without them the welcome page says the form comes by email |
   | `CALENDAR_URL_BUILDS`, `CALENDAR_URL_OFFICE_HOURS` | optional; the thank-you pages' "add to calendar" buttons (D-105). Unset, they download the site's own files, `https://www.amplifiedimpact.io/calendar/builds.ics` and `/calendar/office-hours.ics` (the course's dates, 1:00 PM Central, no join link) |
   | `TEAM_CALL_URL` | optional; where "Let's talk" goes for a team over 40 agents (D-105). Unset, an email to support@amplifiedimpact.io |
   | `INVITES_FROM` | optional; defaults to Mon, Nov 16, 8:00 am Central |
   | `STRIPE_PORTAL_LOGIN_URL` | the billing portal's login page, where members cancel themselves; Manage Billing falls back to it |
   | `STRIPE_PORTAL_CONFIG_LOCKED` | the `bpc_…` id of the portal configuration with cancelling off, from Grokbok (`docs/STRIPE-HANDOFF.md` § 4) |

   The boot log line `offer configuration` says what is on and the key's mode (`test` or `live`),
   never a value.
3. The skills load on every deploy: the pre-deploy command (section 6) ends with
   `pnpm --filter @ai/api skills --upload`. It puts every skill's ZIPs (the 36 skills in
   `SKILL_CATALOG`, Morning Brief's Grok Bot template among its files, D-108) and the 16 Grok Bot
   templates' (`GROK_TEMPLATES`, D-100) in the bucket, then writes the `skills` rows that differ from
   the two catalogs. Repeated, it uploads the same bytes under the same keys (122 files, 4.4 MB) and
   changes **0 rows**; it checks every ZIP before uploading any, and never touches users, teams or
   progress.

   **The bucket.** Production's is the Railway bucket `skills` (created 2026-11-11), and web's five
   `S3_*` variables are references to it (section 2), so nobody copies a value by hand. Without them
   the step stops the deploy with the missing name in the log, and the previous version keeps
   serving; every Skill Library download also needs them, because the download route hands out a
   five-minute link to the file in the bucket.

   Run it by hand the same way. Without `--upload` it writes only the rows and needs only
   `DATABASE_URL`. Change a skill's set or make it free in `packages/core/src/skills.ts` first, and a
   template's in `packages/core/src/grok-templates.ts`; the next deploy carries it. Free today
   (D-115): AI Brain Setup, AI Brain Tune-Up, Perfect Week and Inbox and Meeting Follow-Through, the
   free five with the voice profile, which is a guide. No Grok Bot template is free.
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
