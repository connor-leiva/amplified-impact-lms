// Phase 08 § 8.1's transport. What these tests are actually guarding:
//
//   1. The outbox is an honest record. Gate 8's first automated check is "`inviteMember` puts
//      exactly one `team-invite` email for the invitee in the outbox, with the exact subject", and
//      every later Gate 8 email assertion is the same shape. An outbox that collected too much,
//      too little, or leaked between suites would make those checks pass or fail for reasons that
//      have nothing to do with the code under test — the worst kind of harness bug, and the one
//      D-008 already cost this repo once.
//
//   2. The mode is the environment's choice, not a call site's. A `send` that reached Resend from
//      a test run would try to mail real learners from CI.
//
//   3. A production failure does not throw. An invite email that bounces must not roll back the
//      invite (transport.ts, decision 1).
//
// The module-level `vi.mock('resend')` below is load-bearing, not scaffolding: its factory throws,
// so ANY attempt to import the SDK from this suite fails with that message. That is the strongest
// available statement of transport.ts's decision 3 — test and development never load Resend — and
// it holds for every test in the file at once, with no API key and no network anywhere near it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  outbox,
  outboxFor,
  resetOutbox,
  resetRenderer,
  resetResendClient,
  resolveMode,
  send,
  setRenderer,
} from './transport';
import type { OutboxEntry, TemplateRenderer } from './transport';

vi.mock('resend', () => {
  throw new Error(
    'the resend SDK must never be imported from a test — see transport.ts decision 3',
  );
});

const JAMIE = 'jamie@northlinerealty.com';
const ALEX = 'alex@northlinerealty.com';
// The body fields are required by `EmailData<'team-invite'>` as well as the subject's: the
// transport's payload type IS the template's full payload now, so a subject-only fixture does
// not compile. That is the defect this type change exists to catch.
const INVITE = { inviter: 'Alex Rivera', team: 'Northline Realty', token: 'inv_7f3c9a' };
const INVITE_SUBJECT = 'Alex Rivera invited you to Northline Realty on Amplified Impact';

/** Captured once, at import, so a test that rewrites the environment cannot corrupt the baseline. */
const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

/** Undefined means "not set", which is a different environment from set-to-empty-string. */
function setEnv(key: keyof typeof ENV, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

/**
 * Silences one console method and returns the spy. Development mode logs and every refusal logs,
 * so without this the suite's own evidence of correct behavior would be hundreds of lines of noise
 * in the test output.
 */
const silence = (method: 'log' | 'error') =>
  vi.spyOn(console, method).mockImplementation(() => {});

let logged: ReturnType<typeof silence>;
let errored: ReturnType<typeof silence>;

beforeEach(() => {
  // Module state is shared across a file, so every suite that asserts on the outbox has to start
  // from empty. This is the `beforeEach` the deferred route's tests will need too.
  resetOutbox();
  resetRenderer();
  resetResendClient();
  logged = silence('log');
  errored = silence('error');
});

afterEach(() => {
  for (const key of Object.keys(ENV) as (keyof typeof ENV)[]) setEnv(key, ENV[key]);
  vi.restoreAllMocks();
});

describe('email transport · mode resolution @g8', () => {
  it('reads NODE_ENV=test as test mode', () => {
    expect(resolveMode({ NODE_ENV: 'test' })).toBe('test');
  });

  it('reads NODE_ENV=production as production mode', () => {
    expect(resolveMode({ NODE_ENV: 'production' })).toBe('production');
  });

  it('reads every other NODE_ENV, including unset, as development', () => {
    // The asymmetry is the point. Resolving a near-miss as production is the one mistake that
    // mails real learners from a developer's laptop, so only the exact string qualifies.
    for (const value of [undefined, '', 'prod', 'Production', 'PRODUCTION', 'staging', 'ci']) {
      expect(resolveMode({ NODE_ENV: value }), `NODE_ENV=${String(value)}`).toBe('development');
    }
    expect(resolveMode({})).toBe('development');
  });

  it('defaults to this process environment, which vitest sets to test', () => {
    // The guarantee behind "production is never reached when NODE_ENV is test": under `vitest run`
    // the default resolution is `test`, so a `send` with no environment fiddling collects rather
    // than sends. Together with the file's `vi.mock('resend')` — which would throw if the SDK were
    // ever loaded — that closes the path from a test run to a real inbox.
    expect(process.env.NODE_ENV).toBe('test');
    expect(resolveMode()).toBe('test');
  });
});

describe('email transport · test mode @g8', () => {
  it('collects the send in the outbox with § 8.1’s exact subject', async () => {
    const result = await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    expect(result).toEqual({
      ok: true,
      mode: 'test',
      template: 'team-invite',
      to: JAMIE,
      subject: INVITE_SUBJECT,
    });
    expect(outbox()).toEqual([
      { template: 'team-invite', to: JAMIE, subject: INVITE_SUBJECT, data: INVITE, html: null },
    ]);
    // Test mode is not a logging mode. A `console.log` here would mean the development branch ran
    // as well, which is how a mode switch written as two `if`s rather than a resolution goes wrong.
    expect(logged).not.toHaveBeenCalled();
    expect(errored).not.toHaveBeenCalled();
  });

  it('reports exactly what was sent and nothing more', async () => {
    // Gate 8's question, verbatim: "exactly one `team-invite` email for the invitee, with the exact
    // subject". The two decoys are what makes it a real question — a filter that ignored either the
    // address or the template would return 2 or 3 here.
    await send({ template: 'team-invite', to: JAMIE, data: INVITE });
    await send({ template: 'team-invite', to: ALEX, data: INVITE });
    await send({ template: 'build-reminder', to: JAMIE, data: { employee: 'Marketing AI Employee', moduleId: 'marketing', steps: 4 } });

    const invites = outboxFor({ to: JAMIE, template: 'team-invite' });
    expect(invites).toHaveLength(1);
    expect(invites[0]!.subject).toBe(INVITE_SUBJECT);

    expect(outbox()).toHaveLength(3);
    expect(outboxFor({ to: JAMIE })).toHaveLength(2);
    expect(outboxFor({ template: 'team-invite' })).toHaveLength(2);
    expect(outboxFor({ to: 'nobody@northlinerealty.com' })).toEqual([]);
    expect(outboxFor({ template: 'weekly-digest' })).toEqual([]);
  });

  it('matches a recipient case-insensitively while recording the address verbatim', async () => {
    // An admin typing `Jamie@Northline…` into the invite form means the same mailbox, so a Gate 8
    // assertion should not fail on the shift key — but the outbox still has to report what was
    // actually handed to it.
    await send({ template: 'team-invite', to: 'Jamie@NorthlineRealty.com', data: INVITE });

    expect(outbox()[0]!.to).toBe('Jamie@NorthlineRealty.com');
    expect(outboxFor({ to: JAMIE })).toHaveLength(1);
    expect(outboxFor({ to: '  JAMIE@NORTHLINEREALTY.COM  ' })).toHaveLength(1);
  });

  it('hands out a copy, and freezes each entry, so a reader cannot rewrite history', async () => {
    await send({ template: 'weekly-digest', to: ALEX, data: {} });

    const snapshot = outbox();
    expect(snapshot).toHaveLength(1);
    // Several Gate 8 tests and the deferred /api/test/outbox route read the same array. One of
    // them splicing it would silently delete another's evidence.
    (snapshot as OutboxEntry[]).length = 0;
    expect(outbox()).toHaveLength(1);
    expect(Object.isFrozen(outbox()[0])).toBe(true);
    expect(Object.isFrozen(outbox()[0]!.data)).toBe(true);
  });

  it('copies data rather than holding the caller’s object', async () => {
    // A route that reuses one payload object across an announcement fan-out would otherwise
    // rewrite every entry already in the outbox.
    const data = { employee: 'Marketing AI Employee', moduleId: 'marketing', steps: 4 };
    await send({ template: 'build-reminder', to: JAMIE, data });
    data.employee = 'Sales AI Employee';

    expect(outbox()[0]!.data).toEqual({ employee: 'Marketing AI Employee', moduleId: 'marketing', steps: 4 });
    expect(outbox()[0]!.subject).toBe('Finish your Marketing AI Employee');
  });

  it('is emptied by resetOutbox', async () => {
    await send({ template: 'weekly-digest', to: ALEX, data: {} });
    expect(outbox()).toHaveLength(1);

    resetOutbox();

    expect(outbox()).toEqual([]);
    expect(outboxFor({ to: ALEX })).toEqual([]);
  });
});

describe('email transport · development mode @g8', () => {
  beforeEach(() => {
    setEnv('NODE_ENV', 'development');
  });

  it('logs to the console and writes nothing to the outbox', async () => {
    const result = await send({ template: 'weekly-digest', to: ALEX, data: {} });

    expect(result.mode).toBe('development');
    expect(result.ok).toBe(true);
    expect(result.subject).toBe('Your team this week');
    // § 8.1: "In development it logs to the console." The outbox is the test transport, and a
    // development send landing in it would let a passing suite depend on a mode it never ran in.
    expect(outbox()).toEqual([]);
    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0]![0]);
    expect(line).toContain('weekly-digest');
    expect(line).toContain(ALEX);
    expect(line).toContain('Your team this week');
  });

  it('still refuses a send it would refuse in production', async () => {
    const result = await send({ template: 'announcement', to: ALEX, data: { title: '   ', body: 'Thursday at 1:00 PM CT.' } });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('subject is empty');
    expect(logged).not.toHaveBeenCalled();
  });
});

describe('email transport · production mode @g8', () => {
  beforeEach(() => {
    setEnv('NODE_ENV', 'production');
    // No key and no sender: every assertion below is reached before the SDK would be, so this
    // suite needs no credentials and touches no network. The file's `vi.mock('resend')` proves it.
    setEnv('RESEND_API_KEY', undefined);
    setEnv('EMAIL_FROM', undefined);
  });

  it('reports a failed send instead of throwing, so the invite is not rolled back', async () => {
    // transport.ts decision 1, which is the whole reason `send` returns a result rather than a
    // promise of nothing. A throw here would propagate out of `inviteMember`'s effect and, inside
    // `db.transaction`, undo the invite row that the admin was just told about.
    const result = await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    expect(result.ok).toBe(false);
    expect(result.mode).toBe('production');
    expect(result.subject).toBe(INVITE_SUBJECT);
    expect(result.error).toContain('EMAIL_FROM');
    expect(outbox()).toEqual([]);
    // Dropped silently is not acceptable even though it is not thrown.
    expect(errored).toHaveBeenCalledTimes(1);
    expect(String(errored.mock.calls[0]![0])).toContain('team-invite');
  });

  it('refuses to send a body-less email when no renderer is registered', async () => {
    setEnv('EMAIL_FROM', 'hello@example.invalid');

    const result = await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('renderer');
  });

  it('checks RESEND_API_KEY before loading the SDK', async () => {
    setEnv('EMAIL_FROM', 'hello@example.invalid');
    setRenderer(fakeRenderer());

    const result = await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    // If the key check ran *after* `await import('resend')`, this error would be the mock
    // factory's message instead. So this assertion pins the order, which is what keeps a
    // misconfigured production box from paying the SDK's import cost on every send attempt.
    expect(result.ok).toBe(false);
    expect(result.error).toBe('RESEND_API_KEY is not set');
    expect(result.error).not.toContain('must never be imported');
  });
});

describe('email transport · validation @g8', () => {
  it('refuses a malformed recipient and collects nothing', async () => {
    const bad = [
      '',
      '   ',
      'jamie',
      'jamie@northline',
      'jamie at northline.com',
      'jamie@northlinerealty.com, alex@northlinerealty.com',
      'jamie@northlinerealty.com,alex@northlinerealty.com',
      '@northlinerealty.com',
      'jamie@',
    ];

    for (const to of bad) {
      const result = await send({ template: 'team-invite', to, data: INVITE });
      expect(result.ok, JSON.stringify(to)).toBe(false);
      expect(result.error, JSON.stringify(to)).toBeTruthy();
    }
    // The point of refusing: a Gate 8 assertion of the form "exactly one team-invite for this
    // address" must not be satisfiable by an entry whose address is unusable.
    expect(outbox()).toEqual([]);
    expect(errored).toHaveBeenCalledTimes(bad.length);
  });

  it('accepts the addresses the real seed contains', async () => {
    for (const to of [JAMIE, ALEX, 'maria.gonzalez+cohort@northline-realty.co.uk']) {
      const result = await send({ template: 'weekly-digest', to, data: {} });
      expect(result.ok, to).toBe(true);
    }
    expect(outbox()).toHaveLength(3);
  });

  it('refuses an empty subject, because an announcement’s subject is its title', async () => {
    // § 8.1 gives `announcement`'s subject as `{title}` alone, so there is no prefix to fall back
    // on: an empty title is an email with no subject line, which is the last thing this module can
    // still catch.
    const result = await send({ template: 'announcement', to: ALEX, data: { title: '', body: 'Thursday at 1:00 PM CT.' } });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('subject is empty');
    expect(outbox()).toEqual([]);
  });
});

describe('email transport · renderer seam @g8', () => {
  it('records the rendered html and passes the template name and data through', async () => {
    const calls: [string, unknown][] = [];
    setRenderer((template, data) => {
      calls.push([template, data]);
      return { subject: 'ignored', html: '<p>Accept Invite</p>' };
    });

    await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    expect(calls).toEqual([['team-invite', INVITE]]);
    expect(outbox()[0]!.html).toBe('<p>Accept Invite</p>');
    // The renderer's own `subject` is deliberately ignored: SUBJECTS is the single source of truth
    // for what reaches an inbox, so a template drifting from § 8.1's table cannot change the
    // subject line — it fails the templates' own snapshot test instead.
    expect(outbox()[0]!.subject).toBe(INVITE_SUBJECT);
  });

  it('awaits an async renderer', async () => {
    setRenderer(async () => ({ subject: 'ignored', html: '<p>async</p>' }));

    await send({ template: 'weekly-digest', to: ALEX, data: {} });

    expect(outbox()[0]!.html).toBe('<p>async</p>');
  });

  it('collects nothing when the renderer throws', async () => {
    setRenderer(() => {
      throw new Error('missing token');
    });

    const result = await send({ template: 'team-invite', to: JAMIE, data: INVITE });

    // A half-email is worse than none: the subject built fine, so without this the outbox would
    // hold an entry Gate 8 would count as a delivered invite.
    expect(result.ok).toBe(false);
    expect(result.error).toContain('missing token');
    expect(outbox()).toEqual([]);
  });

  it('is unregistered by resetRenderer, so one suite cannot leak into the next', async () => {
    setRenderer(fakeRenderer());
    await send({ template: 'weekly-digest', to: ALEX, data: {} });
    expect(outbox()[0]!.html).toBe('<p>rendered</p>');

    resetRenderer();
    resetOutbox();
    await send({ template: 'weekly-digest', to: ALEX, data: {} });

    expect(outbox()[0]!.html).toBeNull();
  });
});

/**
 * Stands in for `apps/api/src/email/templates/`, which this sprint does not build. Written
 * non-generically on purpose: that is the shape the templates module will have, so if it is not
 * assignable to `TemplateRenderer` this test file stops compiling.
 */
function fakeRenderer(): TemplateRenderer {
  const render = (template: string): { subject: string; html: string } => ({
    subject: `rendered ${template}`,
    html: '<p>rendered</p>',
  });
  return render;
}
