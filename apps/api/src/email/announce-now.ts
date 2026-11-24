// D-247 (H-9): Announcements › Send now with the Email channel, sent at once through the scheduled path.
//
// D-172 kept Send now in-app only because no new production send was allowed then; the mail job sends
// an announcement's email only when it flips a SCHEDULED one to sent (`jobs/due.ts`). Connor asked for
// Send now's email to go out (Nov 24). It reuses that path's three parts unchanged:
//
//   who      `announcementSends` (due.ts): the same audience rule and payload a scheduled one gets
//   ledger   `recordSends` (scheduler.ts): the `announcement:<id>:<user>` keys, claimed in the write's
//            own transaction, ledger first; only the keys Postgres inserted are mailed, so neither a
//            repeated request nor the scheduler can send one twice
//   send     `transport.send`, after the commit, one at a time, outside every lock
//
// What is new is only when: right after the write that made it `sent`, and the toast then says how many
// it went to. On a server with no email set up (`emailReady`), nothing is claimed or sent and the toast
// says so.

import { newlySentWithEmail, sendNowToast } from '@ai/core';
import type { AnnouncementEmailResult, Announcement, Db, Outcome } from '@ai/core';
import { announcementSends } from '../jobs/due';
import type { Send } from '../jobs/due';
// Types only: `jobs/scheduler.ts` is loaded when a claim is made (below), never at import, because it sits
// on an import cycle with the routes (scheduler → schedules → … → routes/mutate → here), and a static
// import here made `schedules.ts` read the scheduler's `TICK_MS` before it existed and the API not boot.
import type { SchedulerLog, SchedulerTx } from '../jobs/scheduler';
import { emailReady } from './ready';
import { send } from './transport';
import type { SendRequest, TemplateName } from './transport';

/** One announcement this write sent with Email: the sends it claimed, or `off` when this server sends none. */
export interface SendNowClaim {
  announcement: Announcement;
  off: boolean;
  sends: Send[];
}

/**
 * Inside the write's transaction, after `persistDiff`: claim the ledger keys for every announcement the
 * write moved to `sent` with the Email channel on. Returns nothing for any other write.
 */
export async function claimSendNowEmails(tx: SchedulerTx, before: Db, after: Db, now: number, log: SchedulerLog): Promise<SendNowClaim[]> {
  const claims: SendNowClaim[] = [];
  for (const a of newlySentWithEmail(before, after)) {
    if (!emailReady()) {
      claims.push({ announcement: a, off: true, sends: [] });
      continue;
    }
    const owed = announcementSends(after, a);
    const { recordSends } = await import('../jobs/scheduler');
    const recorded = await recordSends(tx, owed, now, log);
    claims.push({ announcement: a, off: false, sends: owed.filter((s) => recorded.has(s.key)) });
  }
  return claims;
}

/** After the commit: send what was claimed, one at a time, and count what the transport accepted. */
export async function sendClaimed(claims: readonly SendNowClaim[], log: SchedulerLog): Promise<AnnouncementEmailResult | null> {
  if (!claims.length) return null;
  let sent = 0;
  let failed = 0;
  for (const claim of claims) {
    for (const s of claim.sends) {
      try {
        const result = await send(s satisfies SendRequest<TemplateName>);
        if (result.ok) sent += 1;
        else {
          failed += 1;
          log.error({ job: s.job, key: s.key, error: result.error }, 'a Send now announcement email was not delivered');
        }
      } catch (err) {
        failed += 1;
        log.error({ job: s.job, key: s.key, err: String(err) }, 'a Send now announcement email threw');
      }
    }
  }
  return { outcome: claims.every((c) => c.off) ? 'off' : 'sent', sent, failed };
}

/** The write's toast, with Send now's email result in it (core's words, `sendNowToast`). */
export function withSendNowToast(toast: Outcome['toast'], claims: readonly SendNowClaim[], result: AnnouncementEmailResult | null): Outcome['toast'] {
  const first = claims[0];
  if (!first || !result) return toast;
  return sendNowToast(toast, first.announcement, result);
}
