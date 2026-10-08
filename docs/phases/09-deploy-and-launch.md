# Phase 09: Deploy and Launch on Railway via GitHub

**Goal.** Run production and a public demo environment on Railway. Every change reaches production only through a GitHub PR whose compliance suite passed. Then launch.

**Ships when:** the Gate 9 checklist is complete and the full suite (`pnpm gate 9`) passes against the deployed **demo** environment.

---

## 9.1 Environments

| Railway environment | Data source | Demo controls | Purpose |
|---|---|---|---|
| `production` | `http` + Postgres + Bucket | never | Real learners and staff |
| `staging` | `http`, separate Postgres and Bucket | never | Pre-release QA and integration smoke tests |
| `demo` | `fixture` (no database) | **yes** (`VITE_DEMO_MODE=true`) | Investor and sales demos. It behaves exactly like the prototype, including View As, Timeline (Week 0 / Week 2 / After Cohort) and Reset Demo. |

Create them with `railway environment new staging` and `railway environment new demo`.

## 9.2 `.railway/railway.ts` (complete)

```ts
import { defineRailway, project, service, postgres, bucket, github, preserve } from 'railway/iac';

export default defineRailway((ctx) => {
  const env = ctx.environment;                        // 'production' | 'staging' | 'demo'
  const demo = env === 'demo';
  const resources = [];

  const db = demo ? null : postgres('postgres');
  const files = demo ? null : bucket('files', { region: 'iad' });
  if (db) resources.push(db);
  if (files) resources.push(files);

  const web = service('web', {
    source: github('YOUR_ORG/amplified-impact-lms', { branch: 'main' }),
    build: demo ? 'pnpm --filter @ai/core build && pnpm --filter @ai/web build && pnpm --filter @ai/api build' : 'pnpm build',
    start: 'pnpm start',
    ...(demo ? {} : { preDeploy: 'pnpm --filter @ai/api db:migrate' }),
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    domains: env === 'production' ? ['learn.YOUR_DOMAIN'] : env === 'demo' ? ['demo.YOUR_DOMAIN'] : ['staging.YOUR_DOMAIN'],
    env: {
      NODE_ENV: 'production',
      APP_URL: env === 'production' ? 'https://learn.YOUR_DOMAIN' : preserve(),
      VITE_DATA_SOURCE: demo ? 'fixture' : 'http',
      VITE_DEMO_MODE: demo ? 'true' : 'false',
      VITE_ENABLE_STATES: env === 'production' ? 'false' : 'true',
      // VITE_BRAND_LOGO_URL / VITE_BRAND_WORDMARK_URL are retired (D-031): the logo is committed.
      ...(db ? { DATABASE_URL: db.env.DATABASE_URL } : {}),
      ...(demo ? {} : {
        SESSION_SECRET: preserve(), RESEND_API_KEY: preserve(), EMAIL_FROM: preserve(),
        S3_ENDPOINT: preserve(), S3_BUCKET: preserve(), S3_REGION: preserve(),
        S3_ACCESS_KEY_ID: preserve(), S3_SECRET_ACCESS_KEY: preserve(),
        ZOOM_WEBHOOK_SECRET: preserve(), VIDEO_API_KEY: preserve(),
      }),
    },
  });
  resources.push(web);
  return project('amplified-impact-lms', { resources });
});
```
- Set each `preserve()` secret once in the Railway dashboard. Take the bucket credentials from the bucket's Credentials tab.
- Apply per environment: `railway config plan` → review → `railway config apply`.
- `VITE_*` variables are read at **build** time, so changing one requires a redeploy.
- In the demo environment the API serves only the SPA and `/api/health`. Guard this with `if (process.env.VITE_DATA_SOURCE === 'fixture')` in `server.ts`: skip database and route registration.

## 9.3 The GitHub → Railway release flow

1. Work on a branch and open a PR. CI runs `quality`, `api`, `goldens` and `compliance`, which is every gate, 0–8.
2. Branch protection on `main` requires all four checks plus one approving review. Direct pushes and force pushes are disabled.
3. Merge to `main`. CI runs again on `push`.
4. Railway (**Wait for CI** on, for every environment's `web` service) waits for the workflows on that commit. It deploys if they pass and skips the deployment if any fail.
5. The pre-deploy step `db:migrate` runs. A failing migration stops the deployment and the previous version keeps serving.
6. The healthcheck (`/api/health`) must pass before traffic switches.
7. A post-deploy smoke workflow runs against `demo` and `staging`:

`.github/workflows/post-deploy.yml`
```yaml
name: post-deploy
on: { workflow_dispatch: {}, schedule: [{ cron: '0 14 * * *' }] }   # daily 8am CT + manual
jobs:
  smoke:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:vPIN-SAME-VERSION-noble
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable && pnpm i --frozen-lockfile
      - name: Full compliance suite against the live demo environment
        run: pnpm compliance && pnpm e2e
        env: { APP_URL: 'https://demo.YOUR_DOMAIN', CI: '1' }
      - name: Staging smoke (sign-in page, health, axe)
        run: pnpm e2e --grep @smoke
        env: { APP_URL: 'https://staging.YOUR_DOMAIN' }
```
The compliance `webServer` entry for the app is skipped automatically when `APP_URL` points to a remote host (`reuseExistingServer`). Make the config conditional with `process.env.APP_URL ? [refServer] : [refServer, appServer]`.

**Rollback.** In Railway, use *Deployments* → previous deployment → **Redeploy**. Migrations must be backward-compatible for one release: add columns before you read them, and drop them a release later.

## 9.4 Production hardening

- `@fastify/helmet` with a strict CSP:
  - `default-src 'self'`
  - `img-src 'self' data: https://*.YOUR_VIDEO_HOST`
  - `media-src 'self' blob: https://*.YOUR_VIDEO_HOST`
  - `connect-src 'self'`
  - `font-src 'self'`

  Self-hosted fonts mean no Google domains.
- `@fastify/rate-limit`: 100 requests per minute per session, and 5 per hour on `/api/auth/request`.
- Cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, signed with `SESSION_SECRET`.
- CSRF: every mutation requires `content-type: application/json` and a matching `Origin` header.
- Handle `SIGTERM` gracefully (close Fastify, drain SSE) so redeploys don't drop requests.
- Logging: JSON logs with a request id. Never log tokens, emails in URLs or presigned URLs.
- Postgres backups: enable volume backups in Railway (daily, 7-day retention) and test a restore into `staging` once before launch.
- Monitoring: Railway metrics and alerts on healthcheck failures. Optionally add Sentry (frontend + API, `SENTRY_DSN` via `preserve()`).
- Performance budgets on the dashboard (Lighthouse CI, desktop): LCP < 2.0 s, CLS < 0.02, JS < 250 KB gzip on first load (routes are lazy).

## 9.5 Launch data

1. In `production`, run `pnpm --filter @ai/api db:seed:prod`. It seeds **only**:
   - the tier definitions
   - the six AI Employees (content, prompts, steps, files metadata)
   - reminders
   - the permission matrix
   - the Owner staff account
   - the current cohort with its sessions

   It seeds no demo learners, requests or activity. Write it as `seedProduction()` in `@ai/core`, and test that it contains no `u_*` demo users.
2. Upload skill files and resources through the admin Vault and Builder.
3. Invite staff from Staff & Roles, then learners and teams.

---

## Gate 9: Release Checklist

Automated:
- [ ] `post-deploy` is green against `demo`. The full parity and e2e suite passes on the live URL.
- [ ] The staging `@smoke` tests are green.
- [ ] Lighthouse CI budgets pass.
- [ ] A deliberately failing commit on a test branch, merged to a scratch environment with Wait for CI on, is **skipped** by Railway (capture a screenshot of the skipped deployment).

Manual sign-off (product owner), comparing production side by side with `design-reference/` and the demo:
- [ ] Each screen in SCREENS §3 and §4 is reviewed at 1440, 1024 and 390, in light and dark.
- [ ] Time zones are correct for an ET, CT and PT viewer.
- [ ] The committed `ai academy` lockup shows in the sidebar, drawer, sign-in and invite-accept (reversed in dark theme), the favicon drawing shows in the collapsed rail, and no region is masked in parity (`MASKS` is empty since D-031).
- [ ] Backup restore has been tested.
- [ ] DECISIONS.md lists every approved deviation from the mockup, and there are no others.
