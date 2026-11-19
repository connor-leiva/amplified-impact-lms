// The Admin Console's authorization matrix (D-157, D-158, spec § 11.1): every Console route against
// every kind of caller — no session, a learner, a team owner, and each staff role — through the real
// router, `requireSession`, `requireJsonSameOrigin`, `requireConsole` and a real Postgres.
//
// The expectation is typed out below rather than computed from `consoleCan`, for the reason
// `authz.test.ts` gives: an oracle derived from the function under test moves with it. Spec § 5's
// table is the source, and `CONSOLE_PATHS` is pinned against this file's routes so a new Console route
// cannot ship without a row here.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { CONSOLE_PATHS } from '../src/console/routes';
import { auditLog, emailLog, ghlLogins, incidents, staffNotes, users } from '../src/db/schema';
import { settleEmails } from '../src/auth';
import { fakeConsoleStripe, fakeConsoleStripeWrite } from './fake-console-stripe';
import { invalidateConsoleFlags } from '../src/console/flags';
import { resetProbes } from '../src/console/infra-integrations';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');

type RouteName =
  | 'me'
  | 'audit'
  | 'export'
  | 'roles'
  | 'workspaces'
  | 'workspace'
  | 'workspaceIntake'
  | 'users'
  | 'user'
  | 'passwordReset'
  | 'usersExport'
  | 'notesList'
  | 'notesCreate'
  | 'noteDelete'
  | 'search'
  | 'preview'
  | 'change'
  | 'masqueradeStart'
  | 'masqueradeCurrent'
  | 'masqueradeExtend'
  | 'masqueradeExit'
  | 'masqueradeSessions'
  | 'staffPreview'
  | 'staffChange'
  | BillingRoute
  | ActionRoute
  | 'apiEndpoints'
  | 'webhooks'
  | 'ghlRetry'
  | 'jobs'
  | 'jobRun'
  | 'emailLog'
  | 'emailLogOne'
  | 'emailLogExport'
  | 'usage'
  | 'incidents'
  | 'incidentSummary'
  | 'incident'
  | 'incidentCreate'
  | 'incidentAck'
  | 'incidentResolve'
  | 'incidentNote'
  | 'opsEnv'
  | 'flagFlip'
  | 'integrations'
  | 'integrationCheck'
  | 'deploys'
  | 'dbHealth'
  | 'health'
  | 'skills';

// PR 4 (D-163): Billing, read-only, every route `billing.read`.
const BILLING = ['billingSummary', 'billingCustomers', 'billingSubscriptions', 'billingInvoices', 'billingFailed', 'billingRefunds', 'billingScopes'] as const;
type BillingRoute = (typeof BILLING)[number];
// PR 5 (D-164): the confirmed refund and void, billing.refund and billing.void (Owner, Admin).
const ACTIONS = ['billingRefundPreview', 'billingRefund', 'billingVoidPreview', 'billingVoid'] as const;
type ActionRoute = (typeof ACTIONS)[number];
const ACTION_REASON = 'Customer canceled inside the trial window.';

/** `path` is the route as registered; `url` is what the probe asks for, with its params and query filled in. */
interface Route {
  path: string;
  url: string;
  method: 'GET' | 'POST';
  route: string;
  body?: Record<string, unknown>;
  /** A body that needs the caller first (an execute's confirm token, from its own preview). */
  prepare?: (userId: string | null) => Promise<Record<string, unknown>>;
}

/** An execute's body: the caller's own preview's token when they may preview, else none. */
const confirmBody = (preview: string, invoiceId: string, typed: string) => async (userId: string | null) => {
  let confirmToken = 'none';
  if (userId) {
    const res = await app.inject({ method: 'POST', url: preview, headers: { cookie: await app.signInAs(userId), 'content-type': 'application/json' }, payload: { invoiceId } });
    if (res.statusCode === 200) confirmToken = (JSON.parse(res.body) as { confirmToken: string }).confirmToken;
  }
  return { confirmToken, reason: ACTION_REASON, typed };
};

const ROUTES: Record<RouteName, Route> = {
  me: { path: CONSOLE_PATHS.me, url: CONSOLE_PATHS.me, method: 'GET', route: `GET ${CONSOLE_PATHS.me}` },
  audit: { path: CONSOLE_PATHS.audit, url: CONSOLE_PATHS.audit, method: 'GET', route: `GET ${CONSOLE_PATHS.audit}` },
  export: { path: CONSOLE_PATHS.auditExport, url: CONSOLE_PATHS.auditExport, method: 'POST', route: `POST ${CONSOLE_PATHS.auditExport}` },
  roles: { path: CONSOLE_PATHS.roles, url: CONSOLE_PATHS.roles, method: 'GET', route: `GET ${CONSOLE_PATHS.roles}` },
  // PR 2 (D-158).
  workspaces: { path: CONSOLE_PATHS.workspaces, url: CONSOLE_PATHS.workspaces, method: 'GET', route: `GET ${CONSOLE_PATHS.workspaces}` },
  workspace: { path: CONSOLE_PATHS.workspace, url: '/api/console/workspaces/northline', method: 'GET', route: `GET ${CONSOLE_PATHS.workspace}` },
  workspaceIntake: { path: CONSOLE_PATHS.workspaceIntake, url: '/api/console/workspaces/northline/intake', method: 'GET', route: `GET ${CONSOLE_PATHS.workspaceIntake}` },
  users: { path: CONSOLE_PATHS.users, url: CONSOLE_PATHS.users, method: 'GET', route: `GET ${CONSOLE_PATHS.users}` },
  user: { path: CONSOLE_PATHS.user, url: '/api/console/users/u_jamie', method: 'GET', route: `GET ${CONSOLE_PATHS.user}` },
  passwordReset: { path: CONSOLE_PATHS.passwordReset, url: '/api/console/users/u_jamie/password-reset', method: 'POST', route: `POST ${CONSOLE_PATHS.passwordReset}` },
  usersExport: { path: CONSOLE_PATHS.usersExport, url: CONSOLE_PATHS.usersExport, method: 'POST', route: `POST ${CONSOLE_PATHS.usersExport}` },
  notesList: { path: CONSOLE_PATHS.notes, url: `${CONSOLE_PATHS.notes}?targetType=workspace&targetId=northline`, method: 'GET', route: `GET ${CONSOLE_PATHS.notes}` },
  notesCreate: {
    path: CONSOLE_PATHS.notes,
    url: CONSOLE_PATHS.notes,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.notes}`,
    body: { targetType: 'workspace', targetId: 'northline', body: 'Called the owner about seats.' },
  },
  noteDelete: { path: CONSOLE_PATHS.noteDelete, url: '/api/console/notes/1/delete', method: 'POST', route: `POST ${CONSOLE_PATHS.noteDelete}`, body: { reason: 'Written on the wrong workspace.' } },
  search: { path: CONSOLE_PATHS.search, url: `${CONSOLE_PATHS.search}?q=jamie`, method: 'GET', route: `GET ${CONSOLE_PATHS.search}` },
  // D-160 R2-3b: the matrix change, the Owner's alone (`roles.write`). The Owner's change here carries
  // no real token, so it is refused for that (`console-roles.test.ts` makes real changes).
  preview: {
    path: CONSOLE_PATHS.rolesPreview,
    url: CONSOLE_PATHS.rolesPreview,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.rolesPreview}`,
    body: { role: 'Admin', capability: 'masq', allowed: false },
  },
  change: { path: CONSOLE_PATHS.roles, url: CONSOLE_PATHS.roles, method: 'POST', route: `POST ${CONSOLE_PATHS.roles}`, body: { confirmToken: 'not-a-token' } },
  // PR 3a (D-162). Each caller here is in no masquerade; `console-masquerade.test.ts` covers one in a session.
  masqueradeStart: {
    path: CONSOLE_PATHS.masqueradeStart,
    url: CONSOLE_PATHS.masqueradeStart,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.masqueradeStart}`,
    body: { targetUserId: 'u_jamie', reason: 'Checking the Week 2 steps for a ticket.' },
  },
  masqueradeCurrent: { path: CONSOLE_PATHS.masqueradeCurrent, url: CONSOLE_PATHS.masqueradeCurrent, method: 'GET', route: `GET ${CONSOLE_PATHS.masqueradeCurrent}` },
  masqueradeExtend: {
    path: CONSOLE_PATHS.masqueradeExtend,
    url: CONSOLE_PATHS.masqueradeExtend,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.masqueradeExtend}`,
    body: { reason: 'Still checking the Week 2 steps.' },
  },
  masqueradeExit: { path: CONSOLE_PATHS.masqueradeExit, url: CONSOLE_PATHS.masqueradeExit, method: 'POST', route: `POST ${CONSOLE_PATHS.masqueradeExit}` },
  masqueradeSessions: { path: CONSOLE_PATHS.masqueradeSessions, url: CONSOLE_PATHS.masqueradeSessions, method: 'GET', route: `GET ${CONSOLE_PATHS.masqueradeSessions}` },
  // PR 4 (D-163).
  ...(Object.fromEntries(BILLING.map((b) => [b, { path: CONSOLE_PATHS[b], url: CONSOLE_PATHS[b], method: 'GET', route: `GET ${CONSOLE_PATHS[b]}` }])) as Record<BillingRoute, { path: string; url: string; method: 'GET'; route: string }>),
  // PR 5 (D-164). A preview against the fake's invoices; an execute with the caller's own token.
  billingRefundPreview: { path: CONSOLE_PATHS.billingRefundPreview, url: CONSOLE_PATHS.billingRefundPreview, method: 'POST', route: `POST ${CONSOLE_PATHS.billingRefundPreview}`, body: { invoiceId: 'in_Paid' } },
  billingRefund: {
    path: CONSOLE_PATHS.billingRefund,
    url: CONSOLE_PATHS.billingRefund,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.billingRefund}`,
    prepare: confirmBody(CONSOLE_PATHS.billingRefundPreview, 'in_Paid', '$497.00'),
  },
  billingVoidPreview: { path: CONSOLE_PATHS.billingVoidPreview, url: CONSOLE_PATHS.billingVoidPreview, method: 'POST', route: `POST ${CONSOLE_PATHS.billingVoidPreview}`, body: { invoiceId: 'in_Open' } },
  billingVoid: {
    path: CONSOLE_PATHS.billingVoid,
    url: CONSOLE_PATHS.billingVoid,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.billingVoid}`,
    prepare: confirmBody(CONSOLE_PATHS.billingVoidPreview, 'in_Open', 'in_Open'),
  },
  // PR 6 (D-165). The retry resets the first sign-in below; Run Now runs the scheduler's tick.
  apiEndpoints: { path: CONSOLE_PATHS.apiEndpoints, url: CONSOLE_PATHS.apiEndpoints, method: 'GET', route: `GET ${CONSOLE_PATHS.apiEndpoints}` },
  webhooks: { path: CONSOLE_PATHS.webhooks, url: CONSOLE_PATHS.webhooks, method: 'GET', route: `GET ${CONSOLE_PATHS.webhooks}` },
  ghlRetry: { path: CONSOLE_PATHS.ghlRetry, url: CONSOLE_PATHS.ghlRetry, method: 'POST', route: `POST ${CONSOLE_PATHS.ghlRetry}`, body: { kind: 'login', id: 'u_jamie' } },
  jobs: { path: CONSOLE_PATHS.jobs, url: CONSOLE_PATHS.jobs, method: 'GET', route: `GET ${CONSOLE_PATHS.jobs}` },
  jobRun: { path: CONSOLE_PATHS.jobRun, url: '/api/console/jobs/session-24h/run', method: 'POST', route: `POST ${CONSOLE_PATHS.jobRun}` },
  // PR 7 (D-166). Row 1 is a logged send, inserted below.
  emailLog: { path: CONSOLE_PATHS.emailLog, url: CONSOLE_PATHS.emailLog, method: 'GET', route: `GET ${CONSOLE_PATHS.emailLog}` },
  emailLogOne: { path: CONSOLE_PATHS.emailLogOne, url: '/api/console/email/1', method: 'GET', route: `GET ${CONSOLE_PATHS.emailLogOne}` },
  emailLogExport: { path: CONSOLE_PATHS.emailLogExport, url: CONSOLE_PATHS.emailLogExport, method: 'POST', route: `POST ${CONSOLE_PATHS.emailLogExport}` },
  usage: { path: CONSOLE_PATHS.usage, url: `${CONSOLE_PATHS.usage}?from=2026-11-24&to=2026-12-07`, method: 'GET', route: `GET ${CONSOLE_PATHS.usage}` },
  // PR 8 (D-167). INC-0001 (below) is open: acknowledged first, then resolved, then noted.
  incidents: { path: CONSOLE_PATHS.incidents, url: `${CONSOLE_PATHS.incidents}?status=open`, method: 'GET', route: `GET ${CONSOLE_PATHS.incidents}` },
  incidentSummary: { path: CONSOLE_PATHS.incidentSummary, url: CONSOLE_PATHS.incidentSummary, method: 'GET', route: `GET ${CONSOLE_PATHS.incidentSummary}` },
  incident: { path: CONSOLE_PATHS.incident, url: '/api/console/incidents/INC-0001', method: 'GET', route: `GET ${CONSOLE_PATHS.incident}` },
  incidentCreate: {
    path: CONSOLE_PATHS.incidents,
    url: CONSOLE_PATHS.incidents,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.incidents}`,
    body: { title: 'Session 3 replay will not play', severity: 'sev3' },
  },
  incidentAck: { path: CONSOLE_PATHS.incidentAck, url: '/api/console/incidents/INC-0001/ack', method: 'POST', route: `POST ${CONSOLE_PATHS.incidentAck}` },
  incidentResolve: {
    path: CONSOLE_PATHS.incidentResolve,
    url: '/api/console/incidents/INC-0001/resolve',
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.incidentResolve}`,
    body: { note: 'Token rotated; the job is green again.' },
  },
  incidentNote: { path: CONSOLE_PATHS.incidentNotes, url: '/api/console/incidents/INC-0001/notes', method: 'POST', route: `POST ${CONSOLE_PATHS.incidentNotes}`, body: { body: 'Checked the GHL copy.' } },
  // PR 9 (D-168). The flip turns masquerade off; Check now asks Resend, which has no key here (no network).
  opsEnv: { path: CONSOLE_PATHS.opsEnv, url: CONSOLE_PATHS.opsEnv, method: 'GET', route: `GET ${CONSOLE_PATHS.opsEnv}` },
  flagFlip: {
    path: CONSOLE_PATHS.flagFlip,
    url: '/api/console/flags/masquerade_enabled',
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.flagFlip}`,
    body: { on: false, typed: 'masquerade_enabled' },
  },
  integrations: { path: CONSOLE_PATHS.integrations, url: CONSOLE_PATHS.integrations, method: 'GET', route: `GET ${CONSOLE_PATHS.integrations}` },
  integrationCheck: { path: CONSOLE_PATHS.integrationCheck, url: '/api/console/integrations/resend/check', method: 'POST', route: `POST ${CONSOLE_PATHS.integrationCheck}` },
  deploys: { path: CONSOLE_PATHS.deploys, url: CONSOLE_PATHS.deploys, method: 'GET', route: `GET ${CONSOLE_PATHS.deploys}` },
  dbHealth: { path: CONSOLE_PATHS.dbHealth, url: CONSOLE_PATHS.dbHealth, method: 'GET', route: `GET ${CONSOLE_PATHS.dbHealth}` },
  // PR 10 (D-169): System Health and the Skills list, both console.view.
  health: { path: CONSOLE_PATHS.health, url: CONSOLE_PATHS.health, method: 'GET', route: `GET ${CONSOLE_PATHS.health}` },
  skills: { path: CONSOLE_PATHS.skills, url: CONSOLE_PATHS.skills, method: 'GET', route: `GET ${CONSOLE_PATHS.skills}` },
  // D-172: Invite staff and Change role…, the Owner's alone too (`console-staff.test.ts` makes real ones).
  staffPreview: {
    path: CONSOLE_PATHS.staffPreview,
    url: CONSOLE_PATHS.staffPreview,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.staffPreview}`,
    body: { kind: 'role', id: 'st2', role: 'Support' },
  },
  staffChange: { path: CONSOLE_PATHS.staff, url: CONSOLE_PATHS.staff, method: 'POST', route: `POST ${CONSOLE_PATHS.staff}`, body: { confirmToken: 'not-a-token' } },
};

/** The routes whose success writes its own audit row. */
const WRITES = new Set<RouteName>([
  'export',
  'passwordReset',
  'usersExport',
  'notesCreate',
  'noteDelete',
  'masqueradeStart',
  'billingRefund',
  'billingVoid',
  'ghlRetry',
  'jobRun',
  'emailLogExport',
  'incidentCreate',
  'incidentAck',
  'incidentResolve',
  'incidentNote',
  'workspaceIntake',
  'flagFlip',
  'integrationCheck',
]);

/** Who calls, as a user id (null: no session), and whether a refusal is a staff one (audited). */
const PERSONAS: { name: string; userId: string | null; staff: boolean }[] = [
  { name: 'anon', userId: null, staff: false },
  { name: 'learner', userId: 'u_jamie', staff: false },
  { name: 'team owner', userId: 'u_alex', staff: false },
  { name: 'Instructor', userId: 'st2', staff: true },
  { name: 'Content Editor', userId: 'st3', staff: true },
  { name: 'Support', userId: 'st4', staff: true },
  { name: 'Admin', userId: 'st_admin', staff: true },
  { name: 'Owner', userId: 'st1', staff: true },
];

// Spec § 5, by hand. `me` answers any staff member (with an empty list for Instructor and Content
// Editor) and refuses a learner; `audit` is audit.read (Owner, Admin, Support); `export` is export
// (Owner, Admin); `roles` is ops.read (Owner, Admin); `preview` and `change` are roles.write (the Owner).
// PR 2: workspaces and users are workspaces.read and users.read, notes are written with notes.write
// and read with the target's read capability, a password reset is user.password_reset (all three
// Console roles; a learner's here), search is console.view: Owner, Admin and Support. The users
// export is export (Owner, Admin). Deleting a note is notes.delete: the Owner alone.
// PR 3a (D-162): Start and the history are masquerade.start, and the history is read by the same
// roles (Owner, Admin). `current` answers any signed-in viewer (null outside a session). Extend asks
// the viewer's masquerade.extend first, then answers 409 `masquerade_ended`, as Exit does for
// everyone, because none of these callers is in a session.
// PR 4: every Billing route is billing.read: Owner, Admin and Support (Support reads, D3).
// PR 5 (D-164): refund and void, previews included, are billing.refund and billing.void: Owner and
// Admin. Support reads billing and changes nothing (D3).
const ACT = (v: number) => Object.fromEntries(ACTIONS.map((a) => [a, v])) as Record<ActionRoute, number>;
// PR 10 (D-169): Health and the Skills list are console.view: Owner, Admin and Support.
const ALL = (v: number) => ({
  workspaces: v,
  workspace: v,
  workspaceIntake: v,
  users: v,
  user: v,
  passwordReset: v,
  notesList: v,
  notesCreate: v,
  search: v,
  health: v,
  skills: v,
  ...(Object.fromEntries(BILLING.map((b) => [b, v])) as Record<BillingRoute, number>),
  apiEndpoints: v,
  webhooks: v,
  jobs: v,
});
// PR 6 (D-165): the API & Webhooks and Jobs reads are api.read and jobs.read (Owner, Admin, Support);
// the GHL retry and Run Now are webhooks.retry and jobs.run_now (Owner, Admin).
// PR 8 (D-167): the incident reads are incidents.read, create incidents.create, Acknowledge
// incidents.ack and a note notes.write (Owner, Admin, Support); Resolve is incidents.resolve (Owner,
// Admin: D3, Support acknowledges and does not resolve).
const OPS = (v: number) => ({ ghlRetry: v, jobRun: v });
const INC = (read: number, write: number, resolve: number) => ({
  incidents: read,
  incidentSummary: read,
  incident: read,
  incidentCreate: write,
  incidentAck: read,
  incidentResolve: resolve,
  incidentNote: write,
});
const MQ = (start: number, extend: number, sessions: number) => ({ masqueradeStart: start, masqueradeCurrent: 200, masqueradeExtend: extend, masqueradeExit: 409, masqueradeSessions: sessions });
// PR 7 (D-166): the email log and usage are read with email.read and usage.read (Owner, Admin and
// Support, D3: Support sees the email log); the export is export (Owner, Admin).
const EU = (read: number, exp: number) => ({ emailLog: read, emailLogOne: read, emailLogExport: exp, usage: read });
// PR 9 (D-168): every infrastructure route is ops.read (Owner, Admin; Support none, D3), Check now is
// integrations.probe (Owner, Admin), and the flip of the sensitive `masquerade_enabled` is
// flags.write_sensitive: the Owner alone (D8). An Admin's flip is refused, and audited, at that second step.
const INFRA = (read: number, flip: number, check: number) => ({ opsEnv: read, flagFlip: flip, integrations: read, integrationCheck: check, deploys: read, dbHealth: read });
const EXPECT: Record<string, Record<RouteName, number>> = {
  anon: {
    me: 401, audit: 401, export: 401, roles: 401, ...ALL(401), usersExport: 401, notesCreate: 401, noteDelete: 401,
    masqueradeStart: 401, masqueradeCurrent: 401, masqueradeExtend: 401, masqueradeExit: 401, masqueradeSessions: 401, preview: 401, change: 401, ...ACT(401), ...OPS(401), ...EU(401, 401), ...INC(401, 401, 401), ...INFRA(401, 401, 401), staffPreview: 401, staffChange: 401,
  },
  learner: { me: 403, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), preview: 403, change: 403, ...ACT(403), ...OPS(403), ...EU(403, 403), ...INC(403, 403, 403), ...INFRA(403, 403, 403), staffPreview: 403, staffChange: 403 },
  'team owner': { me: 403, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), preview: 403, change: 403, ...ACT(403), ...OPS(403), ...EU(403, 403), ...INC(403, 403, 403), ...INFRA(403, 403, 403), staffPreview: 403, staffChange: 403 },
  Instructor: { me: 200, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), preview: 403, change: 403, ...ACT(403), ...OPS(403), ...EU(403, 403), ...INC(403, 403, 403), ...INFRA(403, 403, 403), staffPreview: 403, staffChange: 403 },
  'Content Editor': { me: 200, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), preview: 403, change: 403, ...ACT(403), ...OPS(403), ...EU(403, 403), ...INC(403, 403, 403), ...INFRA(403, 403, 403), staffPreview: 403, staffChange: 403 },
  Support: { me: 200, audit: 200, export: 403, roles: 403, ...ALL(200), notesCreate: 201, usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), preview: 403, change: 403, ...ACT(403), ...OPS(403), ...EU(200, 403), ...INC(200, 201, 403), ...INFRA(403, 403, 403), staffPreview: 403, staffChange: 403 },
  Admin: { me: 200, audit: 200, export: 200, roles: 200, ...ALL(200), notesCreate: 201, usersExport: 200, noteDelete: 403, ...MQ(201, 409, 200), preview: 403, change: 403, ...ACT(200), ...OPS(200), ...EU(200, 200), ...INC(200, 201, 200), ...INFRA(200, 403, 200), staffPreview: 403, staffChange: 403 },
  Owner: { me: 200, audit: 200, export: 200, roles: 200, ...ALL(200), notesCreate: 201, usersExport: 200, noteDelete: 200, ...MQ(201, 409, 200), preview: 200, change: 403, ...ACT(200), ...OPS(200), ...EU(200, 200), ...INC(200, 201, 200), ...INFRA(200, 200, 200), staffPreview: 200, staffChange: 403 },
};

/** A 403 that is not the capability's: the Owner's change with no real token. */
const CODE: Partial<Record<string, Partial<Record<RouteName, string>>>> = { Owner: { change: 'confirm_invalid', staffChange: 'confirm_invalid' } };

/** What `/me` lists for each staff role (spec § 5's rows). */
const SUPPORT_CAPS = ['console.view', 'workspaces.read', 'users.read', 'notes.write', 'user.password_reset', 'usage.read', 'api.read', 'jobs.read', 'incidents.read', 'email.read', 'incidents.ack', 'incidents.create', 'billing.read', 'audit.read'];

let app: App;

let savedAppUrl: string | undefined;

beforeAll(async () => {
  // The password reset renders the existing email, whose links need this.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  // The seed has no Admin; the matrix needs one.
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  // Note 1, for the delete route to find.
  await db.insert(staffNotes).values({ targetType: 'workspace', targetId: 'northline', authorUserId: 'st4', body: 'Owner asked about seats.', createdAt: NOW - 3600_000 });
  // Email 1, for the detail route to find (D-166).
  await db.insert(emailLog).values({ at: NOW - 3600_000, to: 'jamie@ortizhomes.com', userId: 'u_jamie', template: 'sign-in', subject: 'Your sign-in link', provider: 'outbox', status: 'skipped' });
  // INC-0001, open, for the incident routes to act on (D-167).
  await db.insert(incidents).values({ id: 'INC-0001', title: 'Job ghl-orders is failing', severity: 'sev2', status: 'open', fingerprint: 'job:ghl-orders', openedAt: NOW - 3600_000 });
  // A first sign-in GHL gave up on, for the retry route to reset (D-165).
  await db.insert(ghlLogins).values({ userId: 'u_jamie', firstLoginAt: NOW - 86_400_000, ghlAttempts: 8, ghlError: 'contact:unauthorized:401' });
  // Billing reads a fake Stripe (spec § 9: no live calls), so its routes answer 200 to who may read;
  // PR 5's refund and void write to a fake too, a paid invoice and an open one, fresh for each caller.
  const fake = fakeConsoleStripe({
    invoices: [
      { id: 'in_Paid', customerId: null, customerName: 'Northline Realty Team', subscriptionId: null, status: 'paid', totalCents: 49_700, amountPaidCents: 49_700, amountRemainingCents: 0, attemptCount: 0, created: NOW - 86_400_000, nextPaymentAttempt: null, paymentIntentId: 'pi_Paid', chargeId: null },
      { id: 'in_Open', customerId: null, customerName: 'Harbor & Pine Group', subscriptionId: null, status: 'open', totalCents: 9_700, amountPaidCents: 0, amountRemainingCents: 9_700, attemptCount: 1, created: NOW - 86_400_000, nextPaymentAttempt: null, paymentIntentId: null, chargeId: null },
    ],
    charges: { 'pi:pi_Paid': { id: 'ch_Paid', amountCents: 49_700, refundedCents: 0, paymentMethod: 'Visa ending 4242', failure: null } },
  });
  invalidateConsoleFlags();
  resetProbes();
  // PR 9 (D-168): the infrastructure routes read this environment, and nothing here reaches a network.
  const noNetwork = async (): Promise<Response> => {
    throw new Error('no network in this test');
  };
  app = await build({ logger: false, consoleBilling: { stripe: fake.stripe, write: fakeConsoleStripeWrite(fake).write, mode: 'test' }, console: { infra: { env: {}, fetch: noNetwork } } });
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

const call = async (name: RouteName, userId: string | null, body?: Record<string, unknown>) => {
  const r = ROUTES[name];
  const headers: Record<string, string> = {};
  if (userId) headers.cookie = await app.signInAs(userId);
  if (r.method === 'POST') {
    headers['content-type'] = 'application/json';
    return app.inject({ method: 'POST', url: r.url, headers, payload: body ?? r.body ?? {} });
  }
  return app.inject({ method: 'GET', url: r.url, headers });
};

const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('the Console routes, by caller (D-157) @console', () => {
  it('covers every Console route', () => {
    expect([...new Set(Object.values(ROUTES).map((r) => r.path))].sort()).toEqual(Object.values(CONSOLE_PATHS).sort());
    expect(Object.keys(EXPECT)).toEqual(PERSONAS.map((p) => p.name));
  });

  for (const persona of PERSONAS) {
    it(`${persona.name}: ${JSON.stringify(EXPECT[persona.name])}`, async () => {
      for (const name of Object.keys(ROUTES) as RouteName[]) {
        // An execute's token comes from the caller's own preview, before this route's count starts.
        const body = await ROUTES[name].prepare?.(persona.userId);
        const before = (await auditRows()).length;
        const res = await call(name, persona.userId, body);
        const want = EXPECT[persona.name]![name];
        expect(res.statusCode, `${persona.name} ${name}: ${res.body.slice(0, 200)}`).toBe(want);
        // Every Console answer is the viewer's alone, refusals included.
        expect(res.headers['cache-control'], `${persona.name} ${name}`).toBe('private, no-store');
        const after = await auditRows();

        if (want === 401) {
          // § 7.3's 401, unchanged.
          expect(JSON.parse(res.body)).toEqual({ error: 'Not signed in' });
          expect(after.length).toBe(before);
        } else if (want === 403 && CODE[persona.name]?.[name]) {
          // Past the capability: refused for what it carries, and nothing written.
          expect(JSON.parse(res.body).code).toBe(CODE[persona.name]![name]);
          expect(after.length).toBe(before);
        } else if (want === 403) {
          const body = JSON.parse(res.body) as { error: string; code: string };
          expect(body.code).toBe('console_forbidden');
          expect(body.error).toMatch(/\S/);
          if (persona.staff) {
            // A staff refusal is one audit row, with the staff member as actor.
            expect(after.length, `${persona.name} ${name} audited`).toBe(before + 1);
            const row = after[after.length - 1]!;
            expect(row).toMatchObject({
              action: 'console.access_denied',
              outcome: 'denied',
              actorSource: 'staff',
              actorUserId: persona.userId,
              actorRole: persona.name,
              targetType: 'route',
              targetId: ROUTES[name].route,
              at: NOW,
            });
          } else {
            // A learner is refused without a row.
            expect(after.length, `${persona.name} ${name} not audited`).toBe(before);
          }
        } else if (want === 409) {
          // D-162: Extend and Exit outside a session. Nothing happened, so nothing is written.
          const body = JSON.parse(res.body) as { code: string; redirect: string };
          expect(body.code).toBe('masquerade_ended');
          expect(body.redirect).toBe(persona.staff ? '/admin' : '/');
          expect(after.length, `${persona.name} ${name} not audited`).toBe(before);
        } else {
          // Reads write nothing; every write writes its own row.
          expect(after.length, `${persona.name} ${name} rows`).toBe(before + (WRITES.has(name) ? 1 : 0));
          if (name === 'me') {
            const me = JSON.parse(res.body) as { role: string; caps: string[] };
            expect(me.role).toBe(persona.name);
            if (persona.name === 'Instructor' || persona.name === 'Content Editor') expect(me.caps).toEqual([]);
            if (persona.name === 'Support') expect(me.caps).toEqual(SUPPORT_CAPS);
            if (persona.name === 'Admin') expect(me.caps).toContain('export');
            if (persona.name === 'Admin') expect(me.caps).not.toContain('notes.delete');
            if (persona.name === 'Owner') expect(me.caps).toContain('flags.write_sensitive');
            if (persona.name === 'Owner') expect(me.caps).toContain('roles.write');
            if (persona.name === 'Admin') expect(me.caps).not.toContain('roles.write');
          }
        }
      }
    });
  }

  it('answers 401 on a forged session cookie, with no audit row', async () => {
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.audit, headers: { cookie: 'ai_sid=s_nope.nope' } });
    expect(res.statusCode).toBe(401);
    expect((await auditRows()).length).toBe(0);
  });

  it('applies the CSRF rule before the capability on the export: a foreign Origin is 403, not audited', async () => {
    const cookie = await app.signInAs('st1');
    const res = await app.inject({
      method: 'POST',
      url: CONSOLE_PATHS.auditExport,
      headers: { cookie, 'content-type': 'application/json', origin: 'https://evil.example' },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBeUndefined();
    const text = await app.inject({ method: 'POST', url: CONSOLE_PATHS.auditExport, headers: { cookie, 'content-type': 'text/plain' }, payload: 'x' });
    expect(text.statusCode).toBe(415);
    expect((await auditRows()).length).toBe(0);
  });

  it('reads the role on every request: a demoted Admin is refused at once', async () => {
    const cookie = await app.signInAs('st_admin');
    expect((await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie } })).statusCode).toBe(200);
    await (await testDatabase()).execute(sql`update users set staff_role = 'Support' where id = 'st_admin'`);
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie } });
    expect(res.statusCode).toBe(403);
    expect((await auditRows()).at(-1)).toMatchObject({ actorUserId: 'st_admin', actorRole: 'Support', outcome: 'denied' });
  });

  it('answers the Roles matrix built from CONSOLE_CAPS, with the Staff & Roles path', async () => {
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie: await app.signInAs('st1') } });
    const m = JSON.parse(res.body) as { roles: string[]; noAccess: string[]; staffPath: string; caps: { cap: string; allowed: Record<string, boolean> }[] };
    expect(m.roles).toEqual(['Owner', 'Admin', 'Support']);
    expect(m.noAccess).toEqual(['Instructor', 'Content Editor']);
    expect(m.staffPath).toBe('/admin/staff');
    expect(m.caps.find((c) => c.cap === 'export')!.allowed).toEqual({ Owner: true, Admin: true, Support: false });
    expect(m.caps.find((c) => c.cap === 'notes.delete')!.allowed).toEqual({ Owner: true, Admin: false, Support: false });
    expect(m.caps.find((c) => c.cap === 'audit.read')!.allowed).toEqual({ Owner: true, Admin: true, Support: true });
  });
});
