// Railway Infrastructure as Code, completed per phase 09 § 9.2. The deprecated single-service
// railway.json/.toml is not used.
//
// Three environments, one `web` service each. Apply per environment:
//   railway config plan     # review the diff FIRST, always
//   railway config apply
//
// WHAT THIS FILE IS AND IS NOT. It describes the shape of each environment — the service, its build
// and start commands, its domains, its resources, and which variables exist. It carries no secret:
// every one is `preserve()`, meaning "this is set in the dashboard and you must not touch it". So
// `apply` cannot overwrite a credential, which is the property that makes it safe to run against
// production.
//
// WHY `pnpm build` AND NO WATCH PATHS, specifically. The live service was configured by hand before
// this file existed and two settings were wrong in ways worth recording, because this file is the
// fix: its build command was `pnpm --filter @ai/api build`, so the front end was never built and
// `server.ts`'s static branch found no `apps/web/dist` to serve; and its watch paths were
// `/apps/api/**`, so a push whose last commit touched only docs deployed nothing at all. Root
// `pnpm build` builds core, then the front end, then the API bundle. No watch paths means every
// push to `main` is a deploy candidate, which is correct for a monorepo that ships one artifact.
//
// `VITE_*` VARIABLES ARE READ AT BUILD TIME. Changing one does nothing until a redeploy, because
// Vite inlines them into the bundle. That is also why the demo environment's data source is a
// build-time choice rather than a runtime flag — and why it cannot be flipped by anyone at runtime,
// which is what CLAUDE.md's "demo controls must be impossible in http mode" requires.

import { defineRailway, project, service, postgres, bucket, github, preserve } from 'railway/iac';

/** The repository Railway builds from. One branch, `main`, gated by CI (§ 9.3). */
const REPO = 'connor-leiva/amplified-impact-lms';

const DOMAIN = 'amplifiedimpact.io';

export default defineRailway((ctx) => {
  const env = ctx.environment; // 'production' | 'staging' | 'demo'
  const demo = env === 'demo';
  const resources = [];

  // The demo environment has NO database and NO bucket, deliberately. It runs the fixture data
  // source — the prototype reproduced in the browser from localStorage — so there is nothing to
  // persist, nothing to leak and nothing to pay for. `server.ts` skips database and route
  // registration entirely when VITE_DATA_SOURCE is 'fixture', which is what makes that safe rather
  // than merely cheap.
  const db = demo ? null : postgres('postgres');
  const files = demo ? null : bucket('files', { region: 'iad' });
  if (db) resources.push(db);
  if (files) resources.push(files);

  const web = service('web', {
    source: github(REPO, { branch: 'main' }),
    build: 'pnpm build',
    start: 'pnpm start',
    // Runs before the healthcheck, so a failing step stops the deploy and the previous version keeps
    // serving (§ 9.3). The demo environment has no database to migrate. Three steps, each safe to
    // repeat on every deploy (docs/LAUNCH.md § 8):
    //   1. the migrations;
    //   2. the AI Accelerator's curriculum, applied only to a database that has none of it
    //      (`--if-missing`: once there, staff edits to the course stay; db:seed:prod cannot load it
    //      once a buyer exists, D-110);
    //   3. the Library: the `skills` rows that differ from the catalogs, and every skill's ZIP into
    //      the bucket (the same bytes under the same keys). It needs DATABASE_URL and the S3_*
    //      variables below, and nothing else.
    ...(demo
      ? {}
      : {
          preDeploy:
            'pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api db:curriculum:ensure && pnpm --filter @ai/api skills --upload',
        }),
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    // Production answers to TWO names on this one service, told apart by `Host` inside the process
    // (`apps/api/src/routes/marketing.ts`) rather than by running a second service. `www` is the
    // public marketing site, `learn` is the LMS behind sign-in. Both must stay listed here: a
    // `config apply` against a list missing one would REMOVE that domain from the service.
    domains:
      env === 'production'
        ? [`learn.${DOMAIN}`, `www.${DOMAIN}`]
        : demo
          ? [`demo.${DOMAIN}`]
          : [`staging.${DOMAIN}`],
    env: {
      // Exactly 'production'. The email transport selects Resend on this string and nothing else,
      // so a missing or misspelled value means every invite goes silently to a log file while the
      // admin still sees "Invite sent to …".
      NODE_ENV: 'production',
      // Absolute in every environment that sends mail: this is the origin baked into every
      // magic-link, and a relative value makes every sign-in button in every email a dead link.
      APP_URL:
        env === 'production'
          ? `https://learn.${DOMAIN}`
          : demo
            ? `https://demo.${DOMAIN}`
            : `https://staging.${DOMAIN}`,
      // The www/learn split (`apps/api/src/routes/marketing.ts`). One service answers both names:
      // on this host it serves the placeholder and keeps the app off it, everywhere else it serves
      // the product. Production only — staging and demo have no marketing host, and the setting is
      // inert when unset, so they serve the app at every name they are pointed at.
      ...(env === 'production' ? { MARKETING_HOST: `www.${DOMAIN}` } : {}),
      // The /ai101 waitlist's copy into GoHighLevel (D-033). PRODUCTION ONLY: staging has its own
      // waitlist rows (test sign-ups) and must never write them into the real CRM. The location id
      // is not a secret (it is in every GHL URL); the token is, and is set in the dashboard.
      ...(env === 'production' ? { GHL_LOCATION_ID: '4l4e5c7LuLR87EdUv2QK', GHL_TOKEN: preserve() } : {}),
      VITE_DATA_SOURCE: demo ? 'fixture' : 'http',
      VITE_DEMO_MODE: demo ? 'true' : 'false',
      // The /__states and /__tokens specimen routes: a debugging aid, not a feature. Off in
      // production.
      VITE_ENABLE_STATES: env === 'production' ? 'false' : 'true',
      ...(db ? { DATABASE_URL: db.env.DATABASE_URL } : {}),
      ...(demo
        ? {}
        : {
            SESSION_SECRET: preserve(),
            RESEND_API_KEY: preserve(),
            EMAIL_FROM: preserve(),
            S3_ENDPOINT: preserve(),
            S3_BUCKET: preserve(),
            S3_REGION: preserve(),
            S3_ACCESS_KEY_ID: preserve(),
            S3_SECRET_ACCESS_KEY: preserve(),
            ZOOM_WEBHOOK_SECRET: preserve(),
            VIDEO_API_KEY: preserve(),
          }),
    },
  });
  resources.push(web);

  return project('amplified-impact-lms', { resources });
});

// Set each `preserve()` secret once, per environment, in the Railway dashboard. The bucket
// credentials come from the bucket's own Credentials tab.
//
// "Wait for CI" must be ON for every environment's `web` service, so Railway holds each deployment
// until the GitHub Actions workflows on that commit pass and SKIPS it if one fails. Gate 9 asks for
// a screenshot of a deliberately-failing commit being skipped, which is the only way to know the
// setting is actually doing something.
