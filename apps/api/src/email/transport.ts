// Email transport, phase 08 § 8.1.
//
//   `apps/api/src/email/transport.ts` exposes `send({template, to, data})`. In `NODE_ENV=test` it
//   writes to an in-memory outbox (served at `/api/test/outbox`). In development it logs to the
//   console.
//
// Three modes, one entry point, and the mode is never a parameter: a call site that could choose
// its own transport is a call site that can accidentally choose Resend from a test. The mode comes
// from the environment and nowhere else.
//
// ---------------------------------------------------------------------------------------------
// Decisions this file makes, because § 8.1 leaves them open
// ---------------------------------------------------------------------------------------------
//
// 1. `send()` NEVER THROWS, in any mode. It returns `{ ok, ... }`.
//
//    § 8's own mapping makes an invite email an *effect* of `inviteMember`, and an effect must not
//    be able to undo its cause: if Resend is down, or the invitee's address bounces, the invite
//    row still belongs in the database and the admin still sees "Invite sent to …". A throwing
//    transport inside `db.transaction` would roll the invite back and the admin would retry into
//    the same outage. So every failure — a malformed address, a template that throws, a missing
//    API key, a 500 from Resend — is logged to `console.error` and reported in the return value,
//    and the caller decides whether it cares. Today no caller does; `dispatchEffects` is deferred.
//
//    The cost is that a silently undelivered email looks like a delivered one unless someone reads
//    the result. That is the right trade for an invite and the wrong one for, say, a password
//    reset — which this product does not have (§ 7.5 is a magic link, and a learner who never
//    receives it asks for another).
//
// 2. `to` IS VALIDATED HERE, for shape only. `from` is not a parameter at all.
//
//    Shape, because the outbox is an assertion surface: Gate 8 asserts "exactly one `team-invite`
//    email for the invitee", and an entry holding `undefined`, `''` or `"Alex <a@b.c>, c@d.e"`
//    would make that assertion lie. The check is deliberately crude — non-empty, one `@`, no
//    whitespace — because RFC-5322-grade validation rejects addresses that real inboxes accept,
//    and the transport is not the place to adjudicate that.
//
//    Authorization is NOT validated here: whether this actor may email this person is `can()` and
//    the audience filter inside the mutation (§ 8.1's `audience: 'team'` case), and Gate 8 tests
//    it there. A transport that re-derived the audience would be a second, divergent copy of the
//    rule.
//
//    `from` comes from `EMAIL_FROM` and is read only on the production path, so a missing value
//    fails one send loudly rather than every call signature. Validating a constant on each send
//    would be theatre.
//
// 3. THE RESEND IMPORT IS DYNAMIC, so test and development never load it.
//
//    `await import('resend')` inside the production branch. A static import would pull the SDK,
//    its transitive deps and its env assumptions into every `vitest run` and every `tsx watch`
//    restart, for code neither one executes. The type-only import below is erased by
//    `verbatimModuleSyntax`, so it costs nothing at runtime while keeping the client typed.
//
// 4. THE OUTBOX HOLDS NO TIMESTAMP.
//
//    Array order already records "which came first", which is the only temporal question a test
//    asks. A `Date.now()` on each entry would be the one non-deterministic field in a suite that
//    Gate 8 runs under `FIXED_NOW`, and `clock.now()` is not available here — this module is below
//    the request context. If a job ever needs a sent-at, it belongs in § 8.5's `job_runs` table,
//    which is where idempotency is actually decided.
//
// The route that serves the outbox at `/api/test/outbox` is deferred with the rest of the Fastify
// app; `outbox()` and `outboxFor()` are the reader it will wrap.

import { subjectFor } from './subjects';
import type { TemplateName } from './subjects';
// D-264: a leaf (core's lists and a type), so the transport can refuse an observer copy of a personal email.
import { observerMayReceive } from './observer-templates';
// Type-only, and `templates/payload.ts` is a leaf module that imports nothing but `./subjects`, so
// naming the payload type here adds no runtime edge and does not pull the React Email renderer
// into the transport. See that file's header for why the types live there and not in this module.
import type { EmailPayload } from './templates/payload';
// Type-only: erased at runtime, so importing it here does not load the SDK. The runtime import is
// the dynamic one in `sendViaResend`.
import type { Resend } from 'resend';

export type { TemplateName } from './subjects';

/** Which of § 8.1's three behaviors a `send()` will take. */
export type Mode = 'test' | 'development' | 'production';

/**
 * The payload for one send: everything the subject interpolates AND everything that template's
 * body needs, per `templates/payload.ts`.
 *
 * This WAS `SubjectData[K] & Record<string, unknown>` — the subject fields plus an index signature
 * standing in for "whatever else the body wants" — and the comment here named it as the one line to
 * tighten once the template payload types landed. They have landed, so it is tightened, and the
 * index signature is gone.
 *
 * It mattered: § 8.5's scheduler built three payloads that carried only the subject half
 * (`replay-ready` with no `employee`, `build-reminder` with no `steps`, both session reminders with
 * no `zone`). Every one of them typechecked, and every one of them would have thrown inside
 * `elementFor` on a live cohort — which `send` turns into a logged `{ok: false}` and an inbox that
 * stays empty. With the index signature removed those three are compile errors instead.
 *
 * The cost of the tightening is real and deliberate: a payload may no longer carry extra fields
 * "for the template to maybe use". `data` is now exactly what reaches an inbox, and a producer that
 * wants to record something else about a send (which session it was about, which announcement) puts
 * it beside `data`, not in it — which is what `jobs/due.ts`'s `Send` does with `job` and `key`.
 *
 * `EmailPayload` is written in a particular shape so that it stays assignable both to
 * `Record<string, unknown>` (the `TemplateRenderer` seam below) and to `SubjectData[K]`
 * (`subjectFor`, inside `send`). That is explained where it is defined; do not "simplify" it there
 * without reading why.
 */
export type EmailData<K extends TemplateName> = EmailPayload<K>;

/** § 8.1's call shape, with `data` pinned to the template by the generic. */
export interface SendRequest<K extends TemplateName> {
  template: K;
  to: string;
  data: EmailData<K>;
  /**
   * D-264: this send is a cohort observer's copy (`observers.ts`), not a learner's email. The email log marks its row
   * so no learner count includes it, and the outbox entry says so. Refused for a template an observer may never get
   * (`observer-templates.ts`): a copy of a sign-in or password email is a copy of someone's key.
   */
  observer?: boolean;
}

/** What a React Email template resolves to. */
export interface RenderedEmail {
  subject: string;
  html: string;
  /** Plain text, when the template has one. Resend gets it beside the HTML. */
  text?: string;
}

/**
 * The seam for `apps/api/src/email/templates/`, which this sprint does not build.
 *
 * A renderer maps a template name and its data to `{subject, html}`. The transport takes `html`
 * from it and the subject from `SUBJECTS`, so the subject table stays the single source of truth
 * for what reaches an inbox even though a template also renders a `<title>` and a preheader.
 *
 * A non-generic implementation — `(template: TemplateName, data: Record<string, unknown>) =>
 * Promise<RenderedEmail>` — is assignable to this, so the templates module does not have to be
 * generic to satisfy it.
 */
export type TemplateRenderer = <K extends TemplateName>(
  template: K,
  data: EmailData<K>,
) => RenderedEmail | Promise<RenderedEmail>;

/** One email as it was sent, exactly as it was sent. */
export interface OutboxEntry {
  template: TemplateName;
  to: string;
  subject: string;
  /** A shallow copy of the request's `data`, so a later mutation of the caller's object cannot rewrite history. */
  data: Readonly<Record<string, unknown>>;
  /** The rendered body, or `null` when no renderer is registered (test and development only). */
  html: string | null;
  /** The plain-text alternative, when the template produced one. */
  text?: string;
  /** D-264: present, and true, only on a cohort observer's copy. */
  observerCopy?: true;
}

export interface SendResult {
  /** True when the mode did what that mode means: queued at Resend, written to the outbox, logged. */
  ok: boolean;
  mode: Mode;
  template: TemplateName;
  to: string;
  subject: string;
  /** Present only when `ok` is false. The same text that went to `console.error`. */
  error?: string;
}

// --- mode ------------------------------------------------------------------------------------

/** Just enough of `process.env` to resolve a mode, so the resolution can be tested as a pure function. */
export interface EnvLike {
  readonly NODE_ENV?: string | undefined;
}

/**
 * § 8.1's mode rule, as a pure function of the environment.
 *
 * Only the exact string `'production'` selects Resend. Everything else — unset, `'prod'`,
 * `'Production'`, `'staging'`, `''` — is development, which logs. The asymmetry is deliberate and
 * it is the whole reason this is a named, tested function rather than two inline comparisons:
 * resolving the wrong way in one direction means a staging box logs emails nobody reads, and in
 * the other it means a developer's laptop mails real learners. Only the first is recoverable.
 *
 * The operational consequence is that the deploy must set `NODE_ENV=production`. Railway's Node
 * builder does, and phase 09 should assert it rather than assume it: with it unset the API comes up
 * healthy, the admin sees "Invite sent to …", and every invite is written to a log file.
 */
export function resolveMode(env: EnvLike = process.env): Mode {
  if (env.NODE_ENV === 'test') return 'test';
  if (env.NODE_ENV === 'production') return 'production';
  return 'development';
}

// --- the outbox ------------------------------------------------------------------------------

const OUTBOX: OutboxEntry[] = [];

/**
 * Everything sent in test mode, oldest first.
 *
 * Returns a fresh array of frozen entries: "the outbox reports exactly what was sent and nothing
 * more" has to survive a reader that pushes, splices or edits what it is handed, because the
 * deferred `/api/test/outbox` route and several Gate 8 tests will all read the same array.
 */
export function outbox(): readonly OutboxEntry[] {
  return [...OUTBOX];
}

/**
 * The outbox narrowed to one recipient and/or one template — Gate 8's question, which is always
 * "exactly one `team-invite` for this address, with this subject", in one call.
 *
 * `to` matches case-insensitively. The entry keeps the address verbatim as it was sent; matching
 * is lenient because an admin typing `Jamie@Northline.com` into the invite form is the same
 * mailbox, and a test should not fail on the shift key.
 */
export function outboxFor(query: { to?: string; template?: TemplateName }): readonly OutboxEntry[] {
  const to = query.to?.trim().toLowerCase();
  return OUTBOX.filter(
    (e) =>
      (to === undefined || e.to.trim().toLowerCase() === to) &&
      (query.template === undefined || e.template === query.template),
  );
}

/** Empties the outbox. A `beforeEach` in every suite that asserts on it. */
export function resetOutbox(): void {
  OUTBOX.length = 0;
}

// --- the renderer seam -----------------------------------------------------------------------

let renderer: TemplateRenderer | null = null;

/** Registers the React Email renderer. Called once at startup, and by the template tests. */
export function setRenderer(next: TemplateRenderer): void {
  renderer = next;
}

/** Unregisters it, so one suite's fake renderer cannot leak into the next. */
export function resetRenderer(): void {
  renderer = null;
}

// --- production --------------------------------------------------------------------------------

let client: Resend | null = null;

/**
 * The Resend client, constructed on first use and kept.
 *
 * Lazy for two reasons: the SDK is only imported on a path that actually sends (decision 3), and
 * `RESEND_API_KEY` is read when it is needed rather than at import, so a missing key is one failed
 * send with a clear message instead of an API that refuses to boot.
 */
async function resendClient(): Promise<Resend> {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const { Resend: Ctor } = await import('resend');
  client = new Ctor(key);
  return client;
}

/** Forgets the cached client. For the integrator, if `RESEND_API_KEY` is ever rotated in place. */
export function resetResendClient(): void {
  client = null;
}

/** Resend's message id for an accepted send (D-166: the email log keeps it), or null when it gave none. */
async function sendViaResend(to: string, subject: string, html: string | null, text?: string): Promise<string | null> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('EMAIL_FROM is not set');
  // No renderer means no body. An email with an empty body is worse than a send that did not
  // happen, because it looks delivered to everyone involved, so this is a hard failure.
  if (html === null) throw new Error('No template renderer is registered');
  const resend = await resendClient();
  // One reply-to for every LMS email, including set-password and the cohort welcome. Unset: Resend
  // uses the from address, which is what set-password did before this existed.
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const { data, error } = await resend.emails.send({ from, to, subject, html, ...(text ? { text } : {}), ...(replyTo ? { replyTo } : {}) });
  // The SDK reports a rejected send in `error` rather than by throwing. Both paths end up in
  // `send`'s catch.
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data?.id ?? null;
}

// --- send --------------------------------------------------------------------------------------

/** Shape only, never authorization. See decision 2. */
function invalidRecipient(to: unknown): string | null {
  if (typeof to !== 'string') return `"to" must be a string, got ${typeof to}`;
  const trimmed = to.trim();
  if (!trimmed) return '"to" is empty';
  if (/\s/.test(trimmed)) return `"to" contains whitespace: ${JSON.stringify(to)}`;
  if (trimmed.split('@').length !== 2) return `"to" is not one address: ${JSON.stringify(to)}`;
  const [local, domain] = trimmed.split('@');
  if (!local || !domain || !domain.includes('.')) return `"to" is not one address: ${JSON.stringify(to)}`;
  return null;
}

function fail(
  mode: Mode,
  template: TemplateName,
  to: string,
  subject: string,
  error: string,
): SendResult {
  // Logged as well as returned, because today's callers are route handlers that will ignore the
  // result (decision 1) and a dropped email must leave a trace somewhere.
  console.error(`[email] ${template} to ${to} not sent: ${error}`);
  return { ok: false, mode, template, to, subject, error };
}

// --- the send log (D-166, spec § 7.15) -------------------------------------------------------------

/** What the email log records about one send: its result, and Resend's message id when it gave one. */
export interface SendRecord {
  result: SendResult;
  providerId: string | null;
  /** D-264: present, and true, only on a cohort observer's copy. */
  observerCopy?: true;
}

/** Called once after every `send()`, with what happened. It must not throw, and it is never awaited. */
export type SendObserver = (record: SendRecord) => void;

let observer: SendObserver | null = null;

/**
 * Registers the email log's writer (`email/log.ts`), once, beside the renderer; null unregisters it.
 * With none registered (this file's own tests, a script) `send` is exactly what it was.
 */
export function setSendObserver(next: SendObserver | null): void {
  observer = next;
}

/**
 * § 8.1's one entry point. Resolves the mode, builds the subject from § 8.1's table, renders the
 * body if a renderer is registered, and then does one of three things.
 *
 * The mode is resolved per call, not at import: vitest imports a module before any test body runs,
 * so an import-time read would bake in whatever `NODE_ENV` happened to be set first and a suite
 * could never exercise the other two branches.
 *
 * D-166: AFTER the send, and only then, the observer hears what happened (the email log). It is
 * called inside a `try` and never awaited, so a log that fails, throws or hangs never throws from
 * here, never delays the send and never changes its result. The body is not handed to it.
 */
export async function send<K extends TemplateName>(request: SendRequest<K>): Promise<SendResult> {
  const sent = { providerId: null as string | null };
  const result = await deliver(request, sent);
  if (observer) {
    try {
      observer({ result, providerId: sent.providerId, ...(request.observer ? { observerCopy: true as const } : {}) });
    } catch {
      // Decision 1 holds for the log too: nothing about recording a send may undo or fail it.
    }
  }
  return result;
}

/** `send` itself, as it was before the log: `sent.providerId` is set when Resend accepts it. */
async function deliver<K extends TemplateName>(
  { template, to, data, observer: observerCopy }: SendRequest<K>,
  sent: { providerId: string | null },
): Promise<SendResult> {
  const mode = resolveMode();

  const badRecipient = invalidRecipient(to);
  if (badRecipient) return fail(mode, template, String(to), '', badRecipient);
  // D-264: the last line before an inbox for an observer, too. Whatever a caller builds, a copy of a sign-in, password,
  // invite, nudge or receipt email never leaves here.
  if (observerCopy && !observerMayReceive(template)) return fail(mode, template, to, '', `${template} is never sent to a cohort observer`);

  let subject: string;
  try {
    subject = subjectFor(template, data);
  } catch (err) {
    return fail(mode, template, to, '', `subject builder threw: ${messageOf(err)}`);
  }
  // The last line before an inbox. `announcement`'s subject IS its title (§ 8.1), so an empty
  // title would reach a learner as an email with no subject line at all.
  if (!subject.trim()) return fail(mode, template, to, subject, 'subject is empty');

  let html: string | null = null;
  let text: string | undefined;
  if (renderer) {
    try {
      const rendered = await renderer(template, data);
      html = rendered.html;
      text = rendered.text;
    } catch (err) {
      // A template that throws must not produce a half-email: nothing is collected, nothing is
      // sent, and the failure names the template.
      return fail(mode, template, to, subject, `template render threw: ${messageOf(err)}`);
    }
  }

  if (mode === 'test') {
    OUTBOX.push(
      Object.freeze({
        template,
        to,
        subject,
        data: Object.freeze({ ...data } as Record<string, unknown>),
        html,
        ...(text ? { text } : {}),
        ...(observerCopy ? { observerCopy: true as const } : {}),
      }),
    );
    return { ok: true, mode, template, to, subject };
  }

  if (mode === 'development') {
    // § 8.1: "In development it logs to the console." The body is summarised rather than printed —
    // a 560 px React Email table is thousands of characters and would bury the line that matters.
    console.log(
      `[email:dev] ${template}${observerCopy ? ' (observer copy)' : ''} → ${to} · ${JSON.stringify(subject)}` +
        (html === null ? ' · no renderer registered' : ` · ${html.length} chars of HTML`),
    );
    return { ok: true, mode, template, to, subject };
  }

  try {
    sent.providerId = await sendViaResend(to, subject, html, text);
    return { ok: true, mode, template, to, subject };
  } catch (err) {
    // Decision 1: a production failure is reported, never thrown. The invite stands.
    return fail(mode, template, to, subject, messageOf(err));
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
