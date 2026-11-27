// The email log's writer (D-166, spec § 7.15): `transport.send()`'s observer, registered once in
// `app.ts` beside the renderer. After every send it writes one `email_log` row, in the background:
// a failed write is logged and never reaches the send (`lib/observe.ts`).
//
// What a row keeps: when, to whom (and that address's user, when there is one), the template, the
// subject, the provider and Resend's message id, and the outcome. NEVER THE BODY: the observer is not
// handed it, and the table has no column for it. A failure keeps its kind, never its words, which can
// hold an address. `sent` means Resend accepted it; what happened next comes from Resend's webhook
// (D-263, `email/resend-webhook.ts`). A webhook event can beat this write, so a sent row is refolded from
// any events already kept for its id, right after it is written.

import { sql } from 'drizzle-orm';
import { EMAIL_SUBJECT_MAX, EMAIL_TO_MAX, emailErrorKind } from '@ai/core';
import type { EmailErrorKind, EmailProvider, EmailStatus } from '@ai/core';
import { getDb } from '../db/client';
import { clock } from '../lib/clock';
import { observe } from '../lib/observe';
import { refoldLogged } from './resend-webhook';
import type { SendRecord } from './transport';

export interface EmailLogEntry {
  at: number;
  to: string;
  template: string;
  subject: string;
  provider: EmailProvider;
  providerId: string | null;
  status: EmailStatus;
  errorKind: EmailErrorKind | null;
  /** D-264: present, and true, only on a cohort observer's copy, so a learner's row is exactly what it was. */
  observerCopy?: true;
}

/** A send as its log row: `sent` only when production's Resend took it, `skipped` when nothing left the server. */
export function emailLogEntry({ result, providerId, observerCopy }: SendRecord, at: number): EmailLogEntry {
  const provider: EmailProvider = result.mode === 'production' ? 'resend' : result.mode === 'test' ? 'outbox' : 'log';
  const status: EmailStatus = !result.ok ? 'failed' : result.mode === 'production' ? 'sent' : 'skipped';
  return {
    at,
    to: String(result.to).slice(0, EMAIL_TO_MAX),
    template: result.template,
    subject: result.subject.slice(0, EMAIL_SUBJECT_MAX),
    provider,
    providerId: status === 'sent' ? providerId : null,
    status,
    errorKind: result.ok ? null : emailErrorKind(result.error ?? ''),
    ...(observerCopy ? { observerCopy: true as const } : {}),
  };
}

/**
 * `transport.send()`'s observer: one row per send, never awaited by it.
 *
 * D-264: an observer's copy is marked (`observer_copy`) and names no user, even when the address is a staff member's
 * account: it is a copy of the cohort's email, not that person's own, so neither a person's nor a workspace's emails
 * and no learner count ever include it.
 */
export function logSend(record: SendRecord): void {
  const e = emailLogEntry(record, clock.now());
  const observerCopy = e.observerCopy === true;
  observe('email log', async () => {
    const db = getDb();
    await db.execute(sql`
      insert into email_log (at, "to", user_id, template, subject, provider, provider_id, status, error_kind, observer_copy)
      values (${e.at}, ${e.to}, ${observerCopy ? null : sql`(select u.id from users u where u.email = lower(btrim(${e.to})) limit 1)`},
        ${e.template}, ${e.subject}, ${e.provider}, ${e.providerId}, ${e.status}, ${e.errorKind}, ${observerCopy})
    `);
    if (e.providerId) await refoldLogged(db, e.providerId);
  });
}
