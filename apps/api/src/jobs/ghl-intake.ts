// D-229 (B-20): a team's submitted intake, synced to GHL. A loop of its own beside the CRM sync (`ghl-sync.ts`, not
// changed), on the same client (`integrations/ghl.ts`, not changed: only its exported calls are used).
//
// WHAT IT SENDS, for a row whose submit (or a later save) has waited its quiet minute:
//   1. the Team Owner's contact: their stored GHL contact, else an upsert by email with no tags;
//   2. the intake's answers into the contact's custom fields, one per question, by the ids in `GHL_FIELD_INTAKE_*`
//      (Appendix A). A question whose id isn't configured is skipped and reported by name; an answer longer than a
//      field holds is cut with "…" (the whole answer stays in the LMS); an empty answer clears its field;
//   3. the tag `ai-intake-submitted`, as a union with the contact's tags (`upsertAndTag`);
//   4. the operator, as their own contact (no tags), related to the owner's through HighLevel's associations
//      (`GHL_INTAKE_ASSOCIATION_ID`, one contact-to-contact association made once for the location). Name and email
//      from the operator's LMS account once they have accepted their invite, else the intake's `operator-name` answer
//      only if it holds an email; otherwise skipped and reported, never guessed. "I'm both" (the owner runs it; the
//      seeded choice, read as personalization reads it) or a legacy "I am…": none, whatever account or email exists.
//      The operator's name and email go to that contact only: never into a field on the owner's, never into a log.
// THE DRY RUN: `GHL_INTAKE_DRY_RUN` is on unless it says `false`. It logs what would be sent, every value redacted to
// its length, and sends nothing. Connor reads one payload and turns it off. Never a write from a preview build, a
// test or the seeded test learner (`is_test`): those rows are marked and left.
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { isBothAnswer } from '@ai/core/checklist';
import type { CourseIntake } from '@ai/core/course-types';
import { intakeQuestions } from '@ai/core/intake';
import { call, upsertAndTag } from '../integrations/ghl';
import type { GhlConfig, SyncOptions } from '../integrations/ghl';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { teamIntake, teams, users } from '../db/schema';

export const INTAKE_TAG = 'ai-intake-submitted';
/** A field's length limit in HighLevel's text fields (Single line / Multi-line). */
export const FIELD_MAX = 2_000;
export const INTAKE_BACKOFF_MS = [1, 5, 15, 60, 180, 360].map((m) => m * 60_000);
export const INTAKE_TICK_MS = 60_000;

/** On unless the variable says exactly `false`. */
export const intakeDryRun = (env: NodeJS.ProcessEnv = process.env): boolean =>
  (env.GHL_INTAKE_DRY_RUN ?? '').trim() !== 'false';

/** `lead-desk` → `GHL_FIELD_INTAKE_LEAD_DESK`. */
export const fieldEnvOf = (questionId: string): string =>
  `GHL_FIELD_INTAKE_${questionId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
export const SUBMITTED_ON_ENV = 'GHL_FIELD_INTAKE_SUBMITTED_ON';

export interface IntakePayload {
  customFields: { id: string; field_value: string }[];
  /** Questions with no configured field id, by their id. */
  skipped: string[];
  /** Answers cut at the field's limit, by question id. */
  cut: string[];
}

const asText = (v: string | string[] | undefined): string => (Array.isArray(v) ? v.join(', ') : (v ?? '')).trim();

/** The answers as custom fields (Appendix A's rules). Pure. */
export function intakePayload(
  form: CourseIntake,
  answers: Record<string, string | string[]>,
  submittedAt: number,
  env: NodeJS.ProcessEnv = process.env,
): IntakePayload {
  const out: IntakePayload = { customFields: [], skipped: [], cut: [] };
  for (const q of intakeQuestions(form)) {
    const id = (env[fieldEnvOf(q.id)] ?? '').trim();
    if (!id) {
      out.skipped.push(q.id);
      continue;
    }
    let value = asText(answers[q.id]);
    if (value.length > FIELD_MAX) {
      value = `${value.slice(0, FIELD_MAX - 1)}…`;
      out.cut.push(q.id);
    }
    out.customFields.push({ id, field_value: value });
  }
  const on = (env[SUBMITTED_ON_ENV] ?? '').trim();
  if (on) out.customFields.push({ id: on, field_value: new Date(submittedAt).toISOString().slice(0, 10) });
  else out.skipped.push('submitted-on');
  return out;
}

/** Every value replaced by its length, for the log. */
export const redact = (
  p: IntakePayload,
): { customFields: { id: string; length: number }[]; skipped: string[]; cut: string[] } => ({
  customFields: p.customFields.map((f) => ({ id: f.id, length: f.field_value.length })),
  skipped: p.skipped,
  cut: p.cut,
});

const EMAIL = /[^\s<>(),;:]+@[^\s<>(),;:]+\.[a-z]{2,}/i;

/** The operator's contact (§ Phase 8 step 3): their account, else an email in the answer, else none (and why). */
export function operatorOf(
  answers: Record<string, string | string[]>,
  account: { name: string; email: string } | null,
): { contact: { name: string; email: string } | null; reason: string | null } {
  // The seeded choice is "I'm both" (personalization's rule, D-199); "I am…" is still read for older answers.
  if (isBothAnswer(answers.operator) || asText(answers.operator).toLowerCase().startsWith('i am'))
    return { contact: null, reason: 'the owner is the operator' };
  if (account) return { contact: account, reason: null };
  const raw = asText(answers['operator-name']);
  const email = EMAIL.exec(raw)?.[0] ?? null;
  if (!email) return { contact: null, reason: 'no operator account and no email in the answer' };
  const name =
    raw
      .replace(email, '')
      .replace(/[,;:<>()]+/g, ' ')
      .trim() || email;
  return { contact: { name, email }, reason: null };
}

export interface IntakeSyncLog {
  info: (o: unknown, msg: string) => void;
  warn: (o: unknown, msg: string) => void;
}

/** What one row's sync came to. */
export type RowOutcome =
  | { status: 'synced' }
  | { status: 'failed'; error: string }
  | { status: 'dry-run' }
  | { status: 'skipped'; error: string };

interface Row {
  teamId: string;
  answers: Record<string, string | string[]>;
  submittedAt: number;
}

/** One row. `send` is false in the dry run: it logs and returns. */
export async function syncIntakeRow(
  row: Row,
  ctx: {
    form: CourseIntake;
    owner: { email: string; name: string; ghlContactId: string | null; isTest: boolean };
    operator: { name: string; email: string } | null;
    options: SyncOptions | null;
    send: boolean;
    associationId: string | null;
    log: IntakeSyncLog;
    env?: NodeJS.ProcessEnv;
  },
): Promise<RowOutcome> {
  if (ctx.owner.isTest) return { status: 'skipped', error: 'the seeded test account: never synced' };
  const payload = intakePayload(ctx.form, row.answers, row.submittedAt, ctx.env);
  const op = operatorOf(row.answers, ctx.operator);
  if (!ctx.send || !ctx.options) {
    ctx.log.info(
      {
        team: row.teamId,
        owner: ctx.owner.ghlContactId ? 'stored contact' : 'upsert by email',
        fields: redact(payload),
        tag: INTAKE_TAG,
        operator: op.contact ? { name: op.contact.name.length, email: op.contact.email.length } : { none: op.reason },
        association: ctx.associationId ? 'configured' : 'not configured',
      },
      'ghl-intake dry run: nothing sent',
    );
    return { status: 'dry-run' };
  }
  const { options } = ctx;
  const locationId = options.config.locationId;
  const ownerBody = { locationId, email: ctx.owner.email, ...(ctx.owner.name ? { name: ctx.owner.name } : {}) };
  // The contact (no tags), its fields, then the tag (a union with what it has), as the spec orders them.
  const owner = await upsertAndTag(ownerBody, [], options);
  if (!owner.ok) return { status: 'failed', error: `owner ${owner.step}: ${owner.kind}` };
  const fields = await call(
    `/contacts/${encodeURIComponent(owner.contactId)}`,
    { customFields: payload.customFields },
    options,
    'PUT',
  );
  if (!fields.ok) return { status: 'failed', error: `fields: ${fields.kind}` };
  const tagged = await upsertAndTag(ownerBody, [INTAKE_TAG], options);
  if (!tagged.ok) return { status: 'failed', error: `tag ${tagged.step}: ${tagged.kind}` };
  if (payload.skipped.length)
    ctx.log.warn({ team: row.teamId, skipped: payload.skipped }, 'ghl-intake: fields with no id configured');
  if (op.contact) {
    const other = await upsertAndTag({ locationId, email: op.contact.email, name: op.contact.name }, [], options);
    if (!other.ok) return { status: 'failed', error: `operator ${other.step}: ${other.kind}` };
    if (!ctx.associationId)
      ctx.log.warn(
        { team: row.teamId },
        'ghl-intake: GHL_INTAKE_ASSOCIATION_ID is not set; the operator is not related',
      );
    else {
      const rel = await call(
        '/associations/relations',
        {
          locationId,
          associationId: ctx.associationId,
          firstRecordId: owner.contactId,
          secondRecordId: other.contactId,
        },
        options,
      );
      if (!rel.ok && rel.status !== 400 && rel.status !== 409)
        return { status: 'failed', error: `relation: ${rel.kind}` };
    }
  } else ctx.log.info({ team: row.teamId, operator: op.reason }, 'ghl-intake: no operator contact');
  return { status: 'synced' };
}

/** One tick: claim the rows due, sync each, and write back what happened. */
export async function intakeTick(
  now: number,
  deps: { config: GhlConfig | null; log: IntakeSyncLog; env?: NodeJS.ProcessEnv; fetch?: typeof fetch },
): Promise<number> {
  const env = deps.env ?? process.env;
  const db = getDb();
  const due = await db
    .select()
    .from(teamIntake)
    .where(
      and(
        eq(teamIntake.ghlSyncStatus, 'pending'),
        isNotNull(teamIntake.ghlNextAt),
        lte(teamIntake.ghlNextAt, now),
        isNotNull(teamIntake.submittedAt),
      ),
    )
    .limit(25);
  if (!due.length) return 0;
  const snapshot = await loadDb(db);
  const form = snapshot.modules.find((m) => m.id === 'accelerator-week-0')?.course?.intake;
  if (!form) return 0;
  const send = !intakeDryRun(env) && !!deps.config;
  for (const r of due) {
    const [team] = await db.select({ ownerId: teams.ownerId }).from(teams).where(eq(teams.id, r.teamId));
    const [owner] = team ? await db.select().from(users).where(eq(users.id, team.ownerId)) : [];
    if (!owner) {
      await db
        .update(teamIntake)
        .set({ ghlSyncStatus: 'failed', ghlError: 'no team owner', ghlNextAt: null })
        .where(eq(teamIntake.teamId, r.teamId));
      continue;
    }
    const [opUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.teamId, r.teamId), eq(users.role, 'Operations Lead'), eq(users.status, 'active')));
    const outcome = await syncIntakeRow(
      { teamId: r.teamId, answers: r.answers, submittedAt: r.submittedAt! },
      {
        form,
        owner: {
          email: owner.email,
          name: owner.name,
          ghlContactId: (owner as { ghlContactId?: string | null }).ghlContactId ?? null,
          isTest: (owner as { isTest?: boolean }).isTest === true,
        },
        operator: opUser ? { name: opUser.name, email: opUser.email } : null,
        options: deps.config ? { config: deps.config, ...(deps.fetch ? { fetch: deps.fetch } : {}) } : null,
        send,
        associationId: (env.GHL_INTAKE_ASSOCIATION_ID ?? '').trim() || null,
        log: deps.log,
        env,
      },
    );
    if (outcome.status === 'synced')
      await db
        .update(teamIntake)
        .set({ ghlSyncStatus: 'synced', ghlSyncedAt: now, ghlError: null, ghlNextAt: null })
        .where(eq(teamIntake.teamId, r.teamId));
    else if (outcome.status === 'dry-run')
      await db
        .update(teamIntake)
        .set({ ghlError: 'dry run: nothing sent', ghlNextAt: null })
        .where(eq(teamIntake.teamId, r.teamId));
    else if (outcome.status === 'skipped')
      await db
        .update(teamIntake)
        .set({ ghlSyncStatus: 'none', ghlError: outcome.error, ghlNextAt: null })
        .where(eq(teamIntake.teamId, r.teamId));
    else {
      const attempts = r.ghlAttempts + 1;
      const wait = INTAKE_BACKOFF_MS[attempts - 1];
      await db
        .update(teamIntake)
        .set({
          ghlSyncStatus: wait === undefined ? 'failed' : 'pending',
          ghlAttempts: attempts,
          ghlError: outcome.error,
          ghlNextAt: wait === undefined ? null : now + wait,
        })
        .where(eq(teamIntake.teamId, r.teamId));
    }
  }
  return due.length;
}

/** The loop: one tick a minute. Off in the fixture build and while GHL_SYNC_ENABLED=false, as the CRM sync. */
export function startGhlIntakeLoop(deps: {
  config: GhlConfig | null;
  log: IntakeSyncLog;
  now: () => number;
}): () => void {
  let busy = false;
  const id = setInterval(() => {
    if (busy) return;
    busy = true;
    void intakeTick(deps.now(), deps)
      .catch((err: unknown) => deps.log.warn({ err: (err as Error)?.message }, 'ghl-intake tick failed'))
      .finally(() => {
        busy = false;
      });
  }, INTAKE_TICK_MS);
  return () => clearInterval(id);
}
