import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Every email template's call to action, rendered for real.
 *
 * The templates (`apps/api/src/email/templates/*.tsx`) need React Email, which `compliance/` cannot resolve
 * (it is not a dependency of the root package; `lib/global-setup.ts` explains). So, as global-setup seeds
 * the http database, they are rendered in a child process inside `apps/api`, through the same
 * `renderTemplate` the transport sends with, and each rendered email's one `<a href>` comes back.
 *
 * Payloads are the deployed course's, shaped as the jobs send them (`apps/api/src/jobs/due.ts`): a
 * replay-ready email names the week's module (`accelerator-week-1`), a reminder names Session 2.
 */

const API_DIR = fileURLToPath(new URL('../../../apps/api', import.meta.url));
const TEMPLATES_DIR = fileURLToPath(new URL('../../../apps/api/src/email/templates', import.meta.url));

/** The templates on disk, by file name (the renderer's own modules excluded). */
export const TEMPLATE_FILES = readdirSync(TEMPLATES_DIR)
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !['index.tsx', 'layout.tsx'].includes(f))
  .map((f) => f.replace(/\.tsx$/, ''))
  .sort();

export const ORIGIN = 'https://learn.amplifiedimpact.test';
const S2_START = Date.parse('2026-12-09T12:00:00-07:00');

/** One render: a case name, the template, its payload. */
export interface EmailCase {
  name: string;
  template: string;
  data: Record<string, unknown>;
}

export const CASES: EmailCase[] = [
  {
    name: 'replay-ready',
    template: 'replay-ready',
    data: {
      n: 1,
      title: 'Map Your Spend Live Build',
      employee: 'Where the Money Goes',
      moduleId: 'accelerator-week-1',
    },
  },
  {
    name: 'session-1h',
    template: 'session-1h',
    data: { n: 2, title: 'Lead Source Review Live Build', start: S2_START, zone: 'America/Denver' },
  },
  {
    name: 'session-24h',
    template: 'session-24h',
    data: { n: 2, title: 'Lead Source Review Live Build', start: S2_START, zone: 'America/Denver' },
  },
  {
    name: 'announcement (Open Sessions)',
    template: 'announcement',
    data: {
      title: 'Session 2 starts 30 minutes later',
      body: 'Same Zoom link as always.',
      action: 'sessions',
      actionLabel: 'Open Sessions',
    },
  },
  {
    name: 'announcement (Update Calendar)',
    template: 'announcement',
    data: {
      title: 'Session 2 moved',
      body: 'Update your calendar.',
      action: 'calendar',
      actionLabel: 'Update Calendar',
    },
  },
  {
    name: 'announcement (no action)',
    template: 'announcement',
    data: { title: 'Welcome to the cohort', body: 'See you Wednesday.', action: null },
  },
  {
    name: 'build-reminder',
    template: 'build-reminder',
    data: { employee: 'Where the Money Goes', moduleId: 'accelerator-week-1', steps: 2, total: 6 },
  },
  { name: 'weekly-digest', template: 'weekly-digest', data: {} },
  { name: 'sign-in', template: 'sign-in', data: { token: 'tok_signin' } },
  {
    name: 'sign-in with next',
    template: 'sign-in',
    data: { token: 'tok_signin', next: '/skill-library/ai-brain-setup' },
  },
  { name: 'set-password', template: 'set-password', data: { token: 'tok_set' } },
  { name: 'reset-password', template: 'reset-password', data: { token: 'tok_reset' } },
  {
    name: 'team-invite',
    template: 'team-invite',
    data: { inviter: 'Alex Morgan', team: 'Northline Realty Team', token: 'tok_invite' },
  },
  { name: 'staff-invite', template: 'staff-invite', data: { token: 'tok_staff' } },
];

// No backticks or template literals: this source travels through argv as one string (global-setup's rule).
const SOURCE = [
  "const { renderTemplate } = await import('./src/email/templates/index.tsx');",
  'const cases = JSON.parse(process.env.PARITY_EMAIL_CASES);',
  'const out = {};',
  'for (const c of cases) {',
  '  const r = await renderTemplate(c.template, { ...c.data, appUrl: process.env.PARITY_EMAIL_ORIGIN });',
  '  const hrefs = [...r.html.matchAll(/<a\\b[^>]*\\bhref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));',
  '  out[c.name] = { subject: r.subject, hrefs };',
  '}',
  'process.stdout.write(JSON.stringify(out));',
].join('\n');

export interface Rendered {
  subject: string;
  hrefs: string[];
}

/** Render every case once (cached), and answer each one's links. */
let cache: Record<string, Rendered> | null = null;
export function rendered(): Record<string, Rendered> {
  if (cache) return cache;
  const run = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', SOURCE], {
    cwd: API_DIR,
    encoding: 'utf8',
    env: { ...process.env, PARITY_EMAIL_CASES: JSON.stringify(CASES), PARITY_EMAIL_ORIGIN: ORIGIN },
  });
  if (run.status !== 0) throw new Error(`rendering the email templates failed (${run.status}):\n${run.stderr}`);
  cache = JSON.parse(run.stdout) as Record<string, Rendered>;
  return cache;
}

/** A case's one call to action, as a path on this site (origin checked and dropped). */
export function ctaPath(name: string): string {
  const r = rendered()[name];
  if (!r) throw new Error(`no rendered email named ${name}`);
  if (r.hrefs.length !== 1)
    throw new Error(`${name}: expected one link, found ${r.hrefs.length}: ${r.hrefs.join(', ')}`);
  const url = new URL(r.hrefs[0]!);
  if (url.origin !== ORIGIN) throw new Error(`${name}: link leaves the app: ${url.href}`);
  return `${url.pathname}${url.search}${url.hash}`;
}
